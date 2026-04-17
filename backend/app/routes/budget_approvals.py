"""
InsiteIQ v1 Modo 1 — Budget Approval Request routes (Decision #5)

Flujo:
  1. SRS prepara request (estatus 'draft', ball=srs)
  2. Si total_amount_usd <= agreement.parts_approval_threshold_usd:
        auto-aprobado. status='approved'. ball=srs (cerrado).
     Si total_amount_usd > threshold:
        status='draft' hasta que SRS haga send_to_client.
  3. send_to_client -> status='sent_to_client', ball=client.
  4. Cliente approve/reject -> status='approved'|'rejected', ball=srs.
  5. SRS puede flag auto_purchase en cualquier momento (urgent ops).
     Queda grabado con reason, no cambia status del request en si.
  6. SRS puede add_exchange para preguntas/respuestas/revisiones.

Endpoints:
  POST  /api/work-orders/{wo_id}/parts             create request (SRS)
  GET   /api/work-orders/{wo_id}/parts             list for WO
  GET   /api/parts/{req_id}                        detail
  POST  /api/parts/{req_id}/send-to-client         SRS moves to client (SRS)
  POST  /api/parts/{req_id}/client-approve         client approves (client or SRS-on-behalf)
  POST  /api/parts/{req_id}/client-reject          client rejects (client or SRS-on-behalf)
  POST  /api/parts/{req_id}/auto-purchase          SRS marks as bought (SRS)
  POST  /api/parts/{req_id}/exchange               add exchange note
"""
from datetime import datetime, timezone
from typing import Any, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.models.budget_approval_request import (
    Exchange,
    ExchangeKind,
    PartItem,
)

# Two routers: one nested under work_order, one flat under /api/parts/{id}
router = APIRouter(tags=["budget_approvals"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def _load_wo(db, wo_id: str, user: CurrentUser) -> dict:
    try:
        oid = ObjectId(wo_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid work_order id")
    q: dict[str, Any] = {"_id": oid, "tenant_id": user.tenant_id}
    if not user.has_space("srs_coordinators"):
        if user.has_space("client_coordinator"):
            m = user.membership_in("client_coordinator")
            if m and m.get("organization_id"):
                q["organization_id"] = m["organization_id"]
            else:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Work order not found")
        elif user.has_space("tech_field"):
            q["assigned_tech_user_id"] = user.user_id
        else:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Work order not found")
    wo = await db.work_orders.find_one(q)
    if not wo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Work order not found")
    return wo


async def _load_req(db, req_id: str, user: CurrentUser) -> dict:
    try:
        oid = ObjectId(req_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid parts request id")
    doc = await db.budget_approval_requests.find_one(
        {"_id": oid, "tenant_id": user.tenant_id}
    )
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Parts request not found")
    # Also enforce WO scope
    try:
        await _load_wo(db, doc["work_order_id"], user)
    except HTTPException:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Parts request not visible")
    return doc


def _append_exchange(doc: dict, user_id: str, kind: ExchangeKind, notes: str | None,
                     ball_side_after: str) -> dict:
    ex = {
        "ts": _now(),
        "actor_user_id": user_id,
        "kind": kind,
        "notes": notes,
        "ball_side_after": ball_side_after,
    }
    doc.setdefault("exchanges", []).append(ex)
    return ex


# ---------------- Bodies ----------------

class CreateBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    parts: list[PartItem]
    currency_native: str = "USD"
    total_amount_native: float | None = None
    auto_purchase_reason: str | None = None      # if SRS wants to flag auto-purchase on create
    expires_in_hours: int | None = None


class ClientDecisionBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notes: str | None = None


class AutoPurchaseBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reason: str


class ExchangeBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    kind: ExchangeKind
    notes: str | None = None


# ---------------- Endpoints ----------------

@router.post(
    "/work-orders/{wo_id}/parts",
    status_code=status.HTTP_201_CREATED,
)
async def create_request(
    wo_id: str, body: CreateBody, user: CurrentUser = Depends(get_current_user)
):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only SRS coord can create parts requests"
        )
    if not body.parts:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "At least one part required")

    db = get_db()
    wo = await _load_wo(db, wo_id, user)

    # Compute totals
    for p in body.parts:
        p.total_price_usd = round(float(p.unit_price_usd) * int(p.quantity), 2)
    total_usd = round(sum(p.total_price_usd for p in body.parts), 2)

    # Snapshot threshold from service_agreement
    try:
        sa = await db.service_agreements.find_one(
            {"_id": ObjectId(wo["service_agreement_id"]), "tenant_id": user.tenant_id}
        )
    except Exception:
        sa = None
    if not sa:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "Agreement not found for WO"
        )
    threshold = float(sa.get("parts_approval_threshold_usd", 0.0))
    below = total_usd <= threshold

    now = _now()
    expires_at = None
    if body.expires_in_hours:
        from datetime import timedelta
        expires_at = now + timedelta(hours=body.expires_in_hours)

    doc: dict[str, Any] = {
        "tenant_id": user.tenant_id,
        "work_order_id": wo_id,
        "service_agreement_id": wo["service_agreement_id"],
        "parts": [p.model_dump() for p in body.parts],
        "total_amount_usd": total_usd,
        "currency_native": body.currency_native,
        "total_amount_native": body.total_amount_native,
        "threshold_applied_usd": threshold,
        "below_threshold": below,
        "auto_purchased": False,
        "auto_purchased_at": None,
        "auto_purchase_reason": None,
        "status": "approved" if below else "draft",
        "ball_in_court": {
            "side": "srs",
            "actor_user_id": user.user_id,
            "since": now,
            "reason": (
                "auto-approved (below threshold)" if below
                else "preparing quote for client"
            ),
        },
        "exchanges": [],
        "expires_at": expires_at,
        "supersedes_id": None,
        "resolved_at": now if below else None,
        "resolved_by": user.user_id if below else None,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }

    # Auto-purchase flag on creation (operational urgency)
    if body.auto_purchase_reason:
        doc["auto_purchased"] = True
        doc["auto_purchased_at"] = now
        doc["auto_purchase_reason"] = body.auto_purchase_reason
        _append_exchange(
            doc, user.user_id, "auto_purchase",
            body.auto_purchase_reason, "srs"
        )

    result = await db.budget_approval_requests.insert_one(doc)
    doc["_id"] = result.inserted_id

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="budget_approval.create",
        entity_refs=[
            {"collection": "work_orders", "id": wo_id, "label": wo.get("reference")},
            {"collection": "budget_approval_requests", "id": str(result.inserted_id)},
        ],
        context_snapshot={
            "total_usd": total_usd,
            "threshold": threshold,
            "below_threshold": below,
            "auto_purchased": doc["auto_purchased"],
            "parts_count": len(body.parts),
        },
    )
    return _serialize(doc)


@router.get("/work-orders/{wo_id}/parts")
async def list_for_wo(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    await _load_wo(db, wo_id, user)
    docs = await db.budget_approval_requests.find(
        {"work_order_id": wo_id, "tenant_id": user.tenant_id}
    ).sort("created_at", -1).to_list(100)
    return [_serialize(d) for d in docs]


@router.get("/parts/{req_id}")
async def get_request(req_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    doc = await _load_req(db, req_id, user)
    return _serialize(doc)


@router.post("/parts/{req_id}/send-to-client")
async def send_to_client(
    req_id: str,
    body: ExchangeBody | None = None,
    user: CurrentUser = Depends(get_current_user),
):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS coord")
    db = get_db()
    doc = await _load_req(db, req_id, user)
    if doc["status"] not in ("draft", "client_responded"):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Cannot send from status '{doc['status']}'"
        )

    now = _now()
    new_ball = {
        "side": "client",
        "actor_user_id": None,
        "since": now,
        "reason": "awaiting client decision",
    }
    ex = {
        "ts": now,
        "actor_user_id": user.user_id,
        "kind": "quote_sent",
        "notes": body.notes if body else None,
        "ball_side_after": "client",
    }
    await db.budget_approval_requests.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "sent_to_client",
                "ball_in_court": new_ball,
                "updated_at": now,
                "updated_by": user.user_id,
            },
            "$push": {"exchanges": ex},
        },
    )
    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="budget_approval.send_to_client",
        entity_refs=[
            {"collection": "budget_approval_requests", "id": req_id},
        ],
        context_snapshot={
            "status": "sent_to_client",
            "ball_change": {"new_side": "client", "actor": None},
        },
    )
    refreshed = await db.budget_approval_requests.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


async def _resolve_decision(
    db, doc: dict, user: CurrentUser, *, approved: bool, notes: str | None
) -> dict:
    # Client coord or SRS (acting on behalf) can record decision
    is_srs = user.has_space("srs_coordinators")
    is_client_coord = user.has_space("client_coordinator")
    if not (is_srs or is_client_coord):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized")

    if doc["status"] != "sent_to_client":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot decide from status '{doc['status']}'",
        )

    now = _now()
    ex = {
        "ts": now,
        "actor_user_id": user.user_id,
        "kind": "approval" if approved else "rejection",
        "notes": notes,
        "ball_side_after": "srs",  # back to SRS for action
    }
    update = {
        "$set": {
            "status": "approved" if approved else "rejected",
            "ball_in_court": {
                "side": "srs",
                "actor_user_id": user.user_id,
                "since": now,
                "reason": "client responded — SRS to execute",
            },
            "resolved_at": now,
            "resolved_by": user.user_id,
            "updated_at": now,
            "updated_by": user.user_id,
        },
        "$push": {"exchanges": ex},
    }
    await db.budget_approval_requests.update_one({"_id": doc["_id"]}, update)

    await write_audit_event(
        db,
        tenant_id=doc["tenant_id"],
        actor_user_id=user.user_id,
        action="budget_approval.client_approve" if approved else "budget_approval.client_reject",
        entity_refs=[{"collection": "budget_approval_requests", "id": str(doc["_id"])}],
        context_snapshot={"acting_as_srs": is_srs and not is_client_coord},
    )

    refreshed = await db.budget_approval_requests.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


@router.post("/parts/{req_id}/client-approve")
async def client_approve(
    req_id: str, body: ClientDecisionBody | None = None,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_db()
    doc = await _load_req(db, req_id, user)
    return await _resolve_decision(
        db, doc, user, approved=True, notes=body.notes if body else None
    )


@router.post("/parts/{req_id}/client-reject")
async def client_reject(
    req_id: str, body: ClientDecisionBody | None = None,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_db()
    doc = await _load_req(db, req_id, user)
    return await _resolve_decision(
        db, doc, user, approved=False, notes=body.notes if body else None
    )


@router.post("/parts/{req_id}/auto-purchase")
async def auto_purchase(
    req_id: str,
    body: AutoPurchaseBody,
    user: CurrentUser = Depends(get_current_user),
):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS coord")
    db = get_db()
    doc = await _load_req(db, req_id, user)

    now = _now()
    ex = {
        "ts": now,
        "actor_user_id": user.user_id,
        "kind": "auto_purchase",
        "notes": body.reason,
        "ball_side_after": doc.get("ball_in_court", {}).get("side", "srs"),
    }
    await db.budget_approval_requests.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "auto_purchased": True,
                "auto_purchased_at": now,
                "auto_purchase_reason": body.reason,
                "updated_at": now,
                "updated_by": user.user_id,
            },
            "$push": {"exchanges": ex},
        },
    )
    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="budget_approval.auto_purchase",
        entity_refs=[{"collection": "budget_approval_requests", "id": req_id}],
        context_snapshot={"reason": body.reason, "status_at_time": doc["status"]},
    )
    refreshed = await db.budget_approval_requests.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


@router.post("/parts/{req_id}/exchange")
async def add_exchange(
    req_id: str,
    body: ExchangeBody,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_db()
    doc = await _load_req(db, req_id, user)

    # Ball side flip logic for certain exchange kinds
    current_side = doc["ball_in_court"]["side"]
    flip_map: dict[str, str] = {
        "client_question": "srs",   # client asked -> ball back to srs
        "srs_answer":       "client",
        "srs_revision":     "client",
        "timeout_noted":    current_side,
    }
    new_side = flip_map.get(body.kind, current_side)

    now = _now()
    ex = {
        "ts": now,
        "actor_user_id": user.user_id,
        "kind": body.kind,
        "notes": body.notes,
        "ball_side_after": new_side,
    }
    update: dict[str, Any] = {
        "$push": {"exchanges": ex},
        "$set": {"updated_at": now, "updated_by": user.user_id},
    }
    if new_side != current_side:
        update["$set"]["ball_in_court"] = {
            "side": new_side,
            "actor_user_id": user.user_id if new_side == "srs" else None,
            "since": now,
            "reason": body.kind,
        }

    await db.budget_approval_requests.update_one({"_id": doc["_id"]}, update)
    refreshed = await db.budget_approval_requests.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)
