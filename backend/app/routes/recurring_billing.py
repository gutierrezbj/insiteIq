"""
InsiteIQ v1 — Recurring Billing routes (Pasito X-c).

Endpoints:
  POST  /api/subscriptions              crea subscription (SRS admin)
  GET   /api/subscriptions              list (SRS ve todo · client solo own)
  GET   /api/subscriptions/:id          detail
  PATCH /api/subscriptions/:id          update (amount, cadence, next_run, status, notes)
  POST  /api/subscriptions/:id/run-now  forza generacion del invoice (SRS admin)
  POST  /api/subscriptions/:id/pause    active -> paused
  POST  /api/subscriptions/:id/resume   paused -> active (re-agenda next_run si esta vencido)
  POST  /api/subscriptions/:id/cancel   requiere reason, terminal

run-now hace lo mismo que la corrida automatica futura del worker:
  genera un Invoice draft con 1 billing_line del tipo configurado,
  bumpea next_run segun cadence, incrementa runs_count, stampea last_run.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.models.recurring_billing import SubscriptionCadence

router = APIRouter(prefix="/subscriptions", tags=["recurring_billing"])


OWNER_AUTHORITY = {"owner", "director"}


def _is_admin(user: CurrentUser) -> bool:
    if not user.has_space("srs_coordinators"):
        return False
    m = user.membership_in("srs_coordinators")
    return bool(m and m.get("authority_level") in OWNER_AUTHORITY)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


def _bump_next_run(cur: datetime, cadence: SubscriptionCadence) -> datetime:
    """Advance next_run based on cadence. Naive month arithmetic is OK here."""
    if cadence == "monthly":
        # Advance 1 month — handle year boundary
        y = cur.year + (1 if cur.month == 12 else 0)
        m = 1 if cur.month == 12 else cur.month + 1
        # Keep same day if possible, else clamp to end of month
        day = min(cur.day, 28)  # defensive
        return cur.replace(year=y, month=m, day=day)
    if cadence == "quarterly":
        # Advance 3 months
        total = cur.month + 3
        y = cur.year + (total - 1) // 12
        m = ((total - 1) % 12) + 1
        day = min(cur.day, 28)
        return cur.replace(year=y, month=m, day=day)
    if cadence == "annual":
        return cur.replace(year=cur.year + 1)
    return cur


# ---------------- Create / List / Detail ----------------

class CreateBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    organization_id: str
    service_agreement_id: str
    title: str
    description: str | None = None
    category: Literal["monthly_fee", "quarterly_fee"] = "monthly_fee"
    amount: float
    currency: str = "USD"
    tax_rate_pct: float = 0.0
    cadence: SubscriptionCadence = "monthly"
    next_run: datetime
    ends_at: datetime | None = None
    due_in_days: int = 30
    notes: str | None = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_subscription(
    body: CreateBody, user: CurrentUser = Depends(get_current_user)
):
    if not _is_admin(user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Solo SRS owner/director puede crear subscriptions",
        )
    if body.amount <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "amount must be > 0")

    db = get_db()
    # Validate agreement
    try:
        ag = await db.service_agreements.find_one(
            {"_id": ObjectId(body.service_agreement_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        ag = None
    if not ag:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agreement not found")
    if ag["organization_id"] != body.organization_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Agreement org mismatch"
        )

    now = _now()
    doc = {
        "tenant_id": user.tenant_id,
        "organization_id": body.organization_id,
        "service_agreement_id": body.service_agreement_id,
        "srs_entity_id": ag.get("srs_entity_id"),
        "title": body.title,
        "description": body.description,
        "category": body.category,
        "amount": float(body.amount),
        "currency": body.currency.upper(),
        "tax_rate_pct": float(body.tax_rate_pct or 0),
        "cadence": body.cadence,
        "next_run": body.next_run,
        "started_at": now,
        "ends_at": body.ends_at,
        "due_in_days": int(body.due_in_days),
        "status": "active",
        "last_run": None,
        "last_invoice_id": None,
        "runs_count": 0,
        "notes": body.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    result = await db.recurring_subscriptions.insert_one(doc)
    sub_id = str(result.inserted_id)

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="subscription.create",
        entity_refs=[
            {"collection": "recurring_subscriptions", "id": sub_id, "label": body.title},
            {"collection": "organizations", "id": body.organization_id},
        ],
        context_snapshot={
            "amount": body.amount,
            "currency": body.currency,
            "cadence": body.cadence,
            "next_run": body.next_run.isoformat(),
        },
    )

    doc["_id"] = result.inserted_id
    return _serialize(doc)


@router.get("")
async def list_subscriptions(
    organization_id: str | None = None,
    status_filter: str | None = None,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_db()
    q: dict[str, Any] = {"tenant_id": user.tenant_id}

    if not user.has_space("srs_coordinators"):
        client_mem = user.membership_in("client_coordinator")
        if client_mem and client_mem.get("organization_id"):
            q["organization_id"] = client_mem["organization_id"]
        else:
            return []
    if organization_id:
        q["organization_id"] = organization_id
    if status_filter:
        q["status"] = status_filter

    docs = await db.recurring_subscriptions.find(q).sort("next_run", 1).to_list(500)
    return [_serialize(d) for d in docs]


@router.get("/{sub_id}")
async def get_subscription(
    sub_id: str, user: CurrentUser = Depends(get_current_user)
):
    db = get_db()
    try:
        doc = await db.recurring_subscriptions.find_one(
            {"_id": ObjectId(sub_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscription not found")

    if not user.has_space("srs_coordinators"):
        client_mem = user.membership_in("client_coordinator")
        if client_mem and client_mem.get("organization_id"):
            if doc["organization_id"] != client_mem["organization_id"]:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-tenant")
    return _serialize(doc)


class PatchBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str | None = None
    description: str | None = None
    amount: float | None = None
    currency: str | None = None
    tax_rate_pct: float | None = None
    cadence: SubscriptionCadence | None = None
    next_run: datetime | None = None
    ends_at: datetime | None = None
    due_in_days: int | None = None
    notes: str | None = None


@router.patch("/{sub_id}")
async def patch_subscription(
    sub_id: str,
    body: PatchBody,
    user: CurrentUser = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    db = get_db()
    try:
        oid = ObjectId(sub_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid id")

    doc = await db.recurring_subscriptions.find_one(
        {"_id": oid, "tenant_id": user.tenant_id}
    )
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscription not found")

    patch: dict = {}
    for f in ("title", "description", "cadence", "notes"):
        val = getattr(body, f, None)
        if val is not None:
            patch[f] = val
    if body.amount is not None:
        patch["amount"] = float(body.amount)
    if body.currency is not None:
        patch["currency"] = body.currency.upper()
    if body.tax_rate_pct is not None:
        patch["tax_rate_pct"] = float(body.tax_rate_pct)
    if body.next_run is not None:
        patch["next_run"] = body.next_run
    if body.ends_at is not None:
        patch["ends_at"] = body.ends_at
    if body.due_in_days is not None:
        patch["due_in_days"] = int(body.due_in_days)
    if not patch:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nada para actualizar")

    now = _now()
    patch["updated_at"] = now
    patch["updated_by"] = user.user_id
    await db.recurring_subscriptions.update_one({"_id": oid}, {"$set": patch})

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="subscription.update",
        entity_refs=[
            {"collection": "recurring_subscriptions", "id": sub_id, "label": doc.get("title")}
        ],
        context_snapshot={"fields": list(patch.keys())},
    )
    refreshed = await db.recurring_subscriptions.find_one({"_id": oid})
    return _serialize(refreshed)


# ---------------- Run-now (manual trigger for cron future) ----------------

@router.post("/{sub_id}/run-now")
async def run_now(sub_id: str, user: CurrentUser = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    db = get_db()
    try:
        doc = await db.recurring_subscriptions.find_one(
            {"_id": ObjectId(sub_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscription not found")
    if doc["status"] != "active":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Subscription status={doc['status']} · no se puede correr",
        )
    if doc.get("ends_at") and _now() > doc["ends_at"]:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Subscription already expired (ends_at passed)",
        )

    now = _now()
    nr = doc["next_run"]
    # Period for this run's invoice = current cadence window ending at next_run
    period_start, period_end = _cadence_window(nr, doc["cadence"])

    subtotal = float(doc["amount"])
    tax_rate = float(doc.get("tax_rate_pct") or 0)
    tax_amount = round(subtotal * tax_rate / 100.0, 2)
    total = round(subtotal + tax_amount, 2)

    # Build invoice number
    period_label = period_start.strftime("%Y%m")
    org_prefix = doc["organization_id"][-4:].upper()
    existing = await db.invoices.count_documents(
        {
            "tenant_id": user.tenant_id,
            "organization_id": doc["organization_id"],
            "period_start": {
                "$gte": period_start.replace(day=1),
                "$lt": period_start.replace(day=1) + timedelta(days=35),
            },
        }
    )
    invoice_number = f"INV-{period_label}-{org_prefix}-{(existing + 1):03d}"

    # 1 billing line for the fee
    line = {
        "work_order_id": None,
        "work_order_reference": None,
        "category": doc["category"],
        "description": f"{doc['title']} · {period_start.strftime('%Y-%m')}",
        "quantity": 1.0,
        "unit_price": subtotal,
        "subtotal": subtotal,
        "context": {
            "subscription_id": str(doc["_id"]),
            "cadence": doc["cadence"],
        },
    }

    invoice_doc = {
        "tenant_id": user.tenant_id,
        "organization_id": doc["organization_id"],
        "service_agreement_id": doc["service_agreement_id"],
        "srs_entity_id": doc.get("srs_entity_id"),
        "currency": doc["currency"],
        "period_start": period_start,
        "period_end": period_end,
        "invoice_number": invoice_number,
        "client_ref": None,
        "billing_lines": [line],
        "subtotal": subtotal,
        "tax_rate_pct": tax_rate,
        "tax_amount": tax_amount,
        "total": total,
        "status": "draft",
        "issued_at": None,
        "due_date": None,
        "sent_at": None,
        "paid_at": None,
        "generated_from_wo_count": 0,
        "work_order_ids": [],
        "notes": f"Recurring subscription run · {doc['title']}",
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    ins = await db.invoices.insert_one(invoice_doc)
    invoice_id = str(ins.inserted_id)

    # Bump subscription
    new_next_run = _bump_next_run(nr, doc["cadence"])
    await db.recurring_subscriptions.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "last_run": now,
                "last_invoice_id": invoice_id,
                "next_run": new_next_run,
                "updated_at": now,
                "updated_by": user.user_id,
            },
            "$inc": {"runs_count": 1},
        },
    )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="subscription.run",
        entity_refs=[
            {"collection": "recurring_subscriptions", "id": sub_id, "label": doc.get("title")},
            {"collection": "invoices", "id": invoice_id, "label": invoice_number},
        ],
        context_snapshot={
            "total": total,
            "period_start": period_start.isoformat(),
            "next_run": new_next_run.isoformat(),
            "runs_count": doc.get("runs_count", 0) + 1,
        },
    )

    invoice_doc["_id"] = ins.inserted_id
    return {
        "subscription_id": sub_id,
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "total": total,
        "currency": doc["currency"],
        "period_start": period_start,
        "period_end": period_end,
        "next_run": new_next_run,
    }


def _cadence_window(run_at: datetime, cadence: SubscriptionCadence) -> tuple[datetime, datetime]:
    """Compute [period_start, period_end] for the invoice generated on a run."""
    if cadence == "monthly":
        period_start = run_at.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Last day of the month
        if period_start.month == 12:
            nxt = period_start.replace(year=period_start.year + 1, month=1)
        else:
            nxt = period_start.replace(month=period_start.month + 1)
        period_end = nxt - timedelta(seconds=1)
        return period_start, period_end
    if cadence == "quarterly":
        q_start_month = ((run_at.month - 1) // 3) * 3 + 1
        period_start = run_at.replace(
            month=q_start_month, day=1, hour=0, minute=0, second=0, microsecond=0
        )
        end_month = q_start_month + 2
        y = period_start.year + (1 if end_month > 12 else 0)
        em = end_month if end_month <= 12 else end_month - 12
        # last day of end month
        if em == 12:
            next_m_start = period_start.replace(year=y + 1, month=1, day=1)
        else:
            next_m_start = period_start.replace(year=y, month=em + 1, day=1)
        period_end = next_m_start - timedelta(seconds=1)
        return period_start, period_end
    # annual
    period_start = run_at.replace(
        month=1, day=1, hour=0, minute=0, second=0, microsecond=0
    )
    period_end = period_start.replace(year=period_start.year + 1) - timedelta(seconds=1)
    return period_start, period_end


# ---------------- Lifecycle ----------------

class CancelBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reason: str


@router.post("/{sub_id}/pause")
async def pause_subscription(sub_id: str, user: CurrentUser = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    db = get_db()
    doc = await db.recurring_subscriptions.find_one(
        {"_id": ObjectId(sub_id), "tenant_id": user.tenant_id}
    )
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if doc["status"] != "active":
        raise HTTPException(status.HTTP_409_CONFLICT, f"Status={doc['status']}")
    now = _now()
    await db.recurring_subscriptions.update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": "paused", "updated_at": now, "updated_by": user.user_id}},
    )
    await write_audit_event(
        db, tenant_id=user.tenant_id, actor_user_id=user.user_id,
        action="subscription.pause",
        entity_refs=[{"collection": "recurring_subscriptions", "id": sub_id, "label": doc.get("title")}],
        context_snapshot={},
    )
    refreshed = await db.recurring_subscriptions.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


@router.post("/{sub_id}/resume")
async def resume_subscription(sub_id: str, user: CurrentUser = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    db = get_db()
    doc = await db.recurring_subscriptions.find_one(
        {"_id": ObjectId(sub_id), "tenant_id": user.tenant_id}
    )
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if doc["status"] != "paused":
        raise HTTPException(status.HTTP_409_CONFLICT, f"Status={doc['status']}")
    now = _now()
    # If next_run is in the past, push it to now so runs start fresh
    new_next_run = doc["next_run"]
    if new_next_run < now:
        new_next_run = now
    await db.recurring_subscriptions.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "active",
                "next_run": new_next_run,
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )
    await write_audit_event(
        db, tenant_id=user.tenant_id, actor_user_id=user.user_id,
        action="subscription.resume",
        entity_refs=[{"collection": "recurring_subscriptions", "id": sub_id, "label": doc.get("title")}],
        context_snapshot={"next_run": new_next_run.isoformat()},
    )
    refreshed = await db.recurring_subscriptions.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


@router.post("/{sub_id}/cancel")
async def cancel_subscription(
    sub_id: str, body: CancelBody, user: CurrentUser = Depends(get_current_user)
):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    if not body.reason.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Reason required")
    db = get_db()
    doc = await db.recurring_subscriptions.find_one(
        {"_id": ObjectId(sub_id), "tenant_id": user.tenant_id}
    )
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if doc["status"] == "cancelled":
        raise HTTPException(status.HTTP_409_CONFLICT, "Already cancelled")

    now = _now()
    await db.recurring_subscriptions.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "cancelled",
                "ends_at": now,
                "notes": (doc.get("notes") or "") + f"\n[CANCELLED] {body.reason.strip()}",
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )
    await write_audit_event(
        db, tenant_id=user.tenant_id, actor_user_id=user.user_id,
        action="subscription.cancel",
        entity_refs=[{"collection": "recurring_subscriptions", "id": sub_id, "label": doc.get("title")}],
        context_snapshot={"reason": body.reason, "prev_status": doc.get("status")},
    )
    refreshed = await db.recurring_subscriptions.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)
