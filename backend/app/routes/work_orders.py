"""
InsiteIQ v1 Modo 1 — WorkOrder routes
Core of the reactive flow. 7-stage state machine + ball_in_court tracking +
rich audit_log entries on every transition.

Endpoints:
  POST   /api/work-orders              — intake (create new work_order)
  GET    /api/work-orders              — list (filtered by user's space)
  GET    /api/work-orders/{id}         — detail
  POST   /api/work-orders/{id}/advance — state-machine transition
  POST   /api/work-orders/{id}/cancel  — cancel (closed-state)
  POST   /api/work-orders/{id}/preflight — set pre-flight checklist state

Authorization:
  - srs_coordinators: full access to their tenant's work_orders
  - tech_field: read + advance for work_orders where they are assigned_tech
  - client_coordinator: read-only for their organization's work_orders
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.models.service_agreement import ShieldLevel
from app.models.work_order import (
    DEFAULT_BALL_BY_STATUS,
    BallInCourt,
    BallSide,
    Handshake,
    WorkOrderStatus,
    transition_allowed,
)
from app.routes.copilot_briefings import briefing_acknowledged_by
from app.routes.tech_captures import capture_submitted_by
from app.routes.ticket_threads import append_system_event, seal_threads
from app.services.report_assembler import assemble_intervention_report

router = APIRouter(prefix="/work-orders", tags=["work_orders"])


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------- Request bodies ----------------

class IntakeBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    organization_id: str
    site_id: str
    service_agreement_id: str
    reference: str
    title: str
    description: str | None = None
    severity: str = "normal"
    assigned_tech_user_id: str | None = None
    noc_operator_user_id: str | None = None
    onsite_resident_user_id: str | None = None


class AdvanceBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    target_status: WorkOrderStatus
    notes: str | None = None
    # Optional ball override (if not provided we apply DEFAULT_BALL_BY_STATUS)
    ball_side: BallSide | None = None
    ball_actor_user_id: str | None = None
    # Handshake kind if this advance constitutes one
    handshake: str | None = None  # "check_in" | "resolution" | "closure"
    lat: float | None = None
    lng: float | None = None
    # Emergency override: allows dispatched without pre_flight all_green
    emergency: bool = False


class CancelBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reason: str


class PreflightBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    checklist: dict = Field(default_factory=dict)


# ---------------- Scope helpers ----------------

async def _scope_query(user: CurrentUser) -> dict:
    """Build the base query filter based on the user's active spaces."""
    q: dict[str, Any] = {"tenant_id": user.tenant_id}

    # Space precedence: SRS coord sees everything; else filter by role
    if user.has_space("srs_coordinators"):
        return q

    if user.has_space("client_coordinator"):
        m = user.membership_in("client_coordinator")
        if m and m.get("organization_id"):
            q["organization_id"] = m["organization_id"]
            return q

    if user.has_space("tech_field"):
        q["assigned_tech_user_id"] = user.user_id
        return q

    # Fallback: nothing visible
    q["_no_access"] = True
    return q


async def _fetch_wo_or_404(db, wo_id: str, user: CurrentUser) -> dict:
    query = await _scope_query(user)
    try:
        query["_id"] = ObjectId(wo_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid work_order id")

    doc = await db.work_orders.find_one(query)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Work order not found or not visible")
    return doc


# ---------------- Endpoints ----------------

@router.post("", status_code=status.HTTP_201_CREATED)
async def intake_work_order(body: IntakeBody, user: CurrentUser = Depends(get_current_user)):
    """
    Intake: creates a work_order in 'intake' status, snapshots the SLA from
    the service_agreement's Shield level, and computes deadlines.
    Only srs_coordinators can intake.
    """
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Intake requires srs_coordinators role")

    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    # Validate references (agreement must exist, belong to same org)
    try:
        agreement = await db.service_agreements.find_one(
            {"_id": ObjectId(body.service_agreement_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        agreement = None
    if not agreement:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "service_agreement_id not found")
    if agreement["organization_id"] != body.organization_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Agreement org mismatch")

    try:
        site = await db.sites.find_one({"_id": ObjectId(body.site_id), "tenant_id": user.tenant_id})
    except Exception:
        site = None
    if not site:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "site_id not found")

    shield_level: ShieldLevel = agreement["shield_level"]
    sla_snapshot = agreement["sla_spec"]

    now = _now()
    deadline_receive = now + timedelta(minutes=sla_snapshot["receive_minutes"])
    deadline_resolve = now + timedelta(minutes=sla_snapshot["resolve_minutes"])

    doc: dict[str, Any] = {
        "tenant_id": user.tenant_id,
        "organization_id": body.organization_id,
        "site_id": body.site_id,
        "service_agreement_id": body.service_agreement_id,
        "reference": body.reference,
        "title": body.title,
        "description": body.description,
        "severity": body.severity,
        "status": "intake",
        "ball_in_court": {
            "side": DEFAULT_BALL_BY_STATUS["intake"],
            "actor_user_id": user.user_id,
            "since": now,
            "reason": "intake received",
        },
        "assigned_tech_user_id": body.assigned_tech_user_id,
        "srs_coordinator_user_id": user.user_id,
        "noc_operator_user_id": body.noc_operator_user_id,
        "onsite_resident_user_id": body.onsite_resident_user_id
            or (None if not site.get("has_physical_resident") else None),
        "shield_level": shield_level,
        "sla_snapshot": sla_snapshot,
        "deadline_receive_at": deadline_receive,
        "deadline_resolve_at": deadline_resolve,
        "handshakes": [],
        "pre_flight_checklist": {},
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }

    try:
        result = await db.work_orders.insert_one(doc)
    except Exception as e:
        # Likely duplicate reference
        raise HTTPException(status.HTTP_409_CONFLICT, f"Could not create: {e}")

    wo_id = str(result.inserted_id)

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="work_order.intake",
        entity_refs=[{"collection": "work_orders", "id": wo_id, "label": body.reference}],
        context_snapshot={
            "reference": body.reference,
            "organization_id": body.organization_id,
            "site_id": body.site_id,
            "shield_level": shield_level,
            "deadline_receive_at": deadline_receive.isoformat(),
            "deadline_resolve_at": deadline_resolve.isoformat(),
        },
    )

    doc["_id"] = result.inserted_id
    return _serialize(doc)


@router.get("")
async def list_work_orders(
    status_filter: str | None = None,
    organization_id: str | None = None,
    limit: int = 100,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    q = await _scope_query(user)
    if q.get("_no_access"):
        return []
    if status_filter:
        q["status"] = status_filter
    if organization_id:
        q["organization_id"] = organization_id

    docs = await db.work_orders.find(q).sort("created_at", -1).limit(min(limit, 500)).to_list(None)
    return [_serialize(d) for d in docs]


@router.get("/{wo_id}")
async def get_work_order(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    doc = await _fetch_wo_or_404(db, wo_id, user)
    return _serialize(doc)


@router.post("/{wo_id}/advance")
async def advance_work_order(
    wo_id: str,
    body: AdvanceBody,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Transition a work_order to a new status. Enforces:
      - state-machine legality (ALLOWED_TRANSITIONS)
      - role-based advance authority
      - pre_flight -> dispatched requires all_green OR body.emergency
      - appends a Handshake if body.handshake is provided
      - writes a rich audit_log entry
    """
    db = get_db()
    doc = await _fetch_wo_or_404(db, wo_id, user)

    current = doc["status"]
    target = body.target_status

    if not transition_allowed(current, target):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Transition '{current}' -> '{target}' not allowed",
        )

    # Authorization per target
    if target in ("triage", "pre_flight", "closed"):
        if not user.has_space("srs_coordinators"):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Only SRS coordinators can advance to '{target}'",
            )

    if target in ("en_route", "on_site", "resolved"):
        is_srs = user.has_space("srs_coordinators")
        is_assigned = (
            user.has_space("tech_field")
            and doc.get("assigned_tech_user_id") == user.user_id
        )
        if not (is_srs or is_assigned):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Only SRS coord or the assigned tech can advance to '{target}'",
            )

    # pre_flight -> dispatched guard
    if current == "pre_flight" and target == "dispatched":
        checklist = doc.get("pre_flight_checklist") or {}
        all_green = checklist.get("all_green") is True
        if not all_green and not body.emergency:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "pre_flight checklist not all_green — set emergency=true to override",
            )

    # dispatched -> en_route guard (Domain 10.5 Copilot Briefing mandatory)
    if current == "dispatched" and target == "en_route":
        assigned_tech = doc.get("assigned_tech_user_id")
        if not assigned_tech:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "work_order has no assigned tech — cannot go en_route",
            )
        if not body.emergency:
            ack = await briefing_acknowledged_by(db, doc, assigned_tech)
            if not ack:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "Copilot Briefing not acknowledged by assigned tech — "
                    "set emergency=true to override",
                )

    # on_site -> resolved guard (Domain 10.4 Tech PWA Capture mandatory)
    if current == "on_site" and target == "resolved":
        assigned_tech = doc.get("assigned_tech_user_id")
        if not assigned_tech:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "work_order has no assigned tech — cannot resolve",
            )
        if not body.emergency:
            submitted = await capture_submitted_by(db, doc, assigned_tech)
            if not submitted:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "Tech Capture not submitted by assigned tech — "
                    "set emergency=true to override",
                )

    # Build ball-in-court for new status
    now = _now()
    ball_side = body.ball_side or DEFAULT_BALL_BY_STATUS[target]
    ball = {
        "side": ball_side,
        "actor_user_id": body.ball_actor_user_id or user.user_id,
        "since": now,
        "reason": body.notes,
    }

    update: dict[str, Any] = {
        "status": target,
        "ball_in_court": ball,
        "updated_at": now,
        "updated_by": user.user_id,
    }
    if target == "closed":
        update["closed_at"] = now

    push_ops: dict[str, Any] = {}
    if body.handshake:
        handshake = {
            "kind": body.handshake,
            "ts": now,
            "actor_user_id": user.user_id,
            "notes": body.notes,
            "lat": body.lat,
            "lng": body.lng,
        }
        push_ops["handshakes"] = handshake

    mongo_update: dict[str, Any] = {"$set": update}
    if push_ops:
        mongo_update["$push"] = push_ops

    await db.work_orders.update_one({"_id": doc["_id"]}, mongo_update)

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action=f"work_order.advance.{target}",
        entity_refs=[{"collection": "work_orders", "id": wo_id, "label": doc.get("reference")}],
        context_snapshot={
            "from_status": current,
            "to_status": target,
            "ball_change": {"new_side": ball_side, "actor": ball["actor_user_id"]},
            "handshake": body.handshake,
            "emergency": body.emergency,
            "notes": body.notes,
        },
    )

    # Hook: emit system_event into shared thread, seal threads on close/cancel
    await append_system_event(
        db,
        doc,
        actor_user_id=user.user_id,
        text=f"Status advanced: {current} -> {target}",
        payload={"from": current, "to": target, "ball": ball_side},
    )
    if target in ("closed", "cancelled"):
        await seal_threads(db, wo_id, user.tenant_id)

    # Hook: on close, auto-assemble the intervention_report (Principle #1 emit)
    if target == "closed":
        try:
            refreshed_wo = await db.work_orders.find_one({"_id": doc["_id"]})
            if refreshed_wo:
                await assemble_intervention_report(db, refreshed_wo, actor_user_id=user.user_id)
        except Exception:
            import traceback
            traceback.print_exc()  # audit middleware still logs; never block the advance

    refreshed = await db.work_orders.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


@router.post("/{wo_id}/cancel")
async def cancel_work_order(
    wo_id: str, body: CancelBody, user: CurrentUser = Depends(get_current_user)
):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only SRS coordinators can cancel"
        )
    db = get_db()
    doc = await _fetch_wo_or_404(db, wo_id, user)
    if doc["status"] in ("closed", "cancelled"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Already {doc['status']}")

    now = _now()
    await db.work_orders.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "cancelled",
                "cancelled_at": now,
                "cancel_reason": body.reason,
                "ball_in_court": {
                    "side": "srs",
                    "actor_user_id": user.user_id,
                    "since": now,
                    "reason": "cancelled",
                },
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="work_order.cancel",
        entity_refs=[{"collection": "work_orders", "id": wo_id, "label": doc.get("reference")}],
        context_snapshot={"from_status": doc["status"], "reason": body.reason},
    )

    await append_system_event(
        db,
        doc,
        actor_user_id=user.user_id,
        text=f"Work order cancelled: {body.reason}",
        payload={"from": doc["status"], "to": "cancelled", "reason": body.reason},
    )
    await seal_threads(db, wo_id, user.tenant_id)

    refreshed = await db.work_orders.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


@router.post("/{wo_id}/preflight")
async def set_preflight(
    wo_id: str, body: PreflightBody, user: CurrentUser = Depends(get_current_user)
):
    """
    Set the pre_flight_checklist. Expected shape (flexible):
      { "kit_verified": bool, "parts_ready": bool, "site_bible_read": bool, "all_green": bool, ... }
    When all_green is True, pre_flight -> dispatched is allowed without emergency flag.
    """
    if not user.has_space("srs_coordinators") and not user.has_space("tech_field"):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only SRS or tech can set preflight"
        )

    db = get_db()
    doc = await _fetch_wo_or_404(db, wo_id, user)

    now = _now()
    await db.work_orders.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "pre_flight_checklist": body.checklist,
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="work_order.preflight.set",
        entity_refs=[{"collection": "work_orders", "id": wo_id, "label": doc.get("reference")}],
        context_snapshot={"checklist": body.checklist},
    )

    refreshed = await db.work_orders.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)
