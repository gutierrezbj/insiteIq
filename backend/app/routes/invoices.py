"""
InsiteIQ v1 — Invoice routes (Pasito X-b · Fase 3 Admin/Finance).

Endpoints:
  POST /api/invoices/generate   genera draft invoice a partir de closed WOs
                                del periodo + agreement, aplicando rate_card
  GET  /api/invoices            list con filtros (org, status, period)
  GET  /api/invoices/:id        detail con billing_lines inline
  POST /api/invoices/:id/send   draft -> sent (stampea issued_at, sent_at)
  POST /api/invoices/:id/paid   marca paid (timestamp + actor)
  POST /api/invoices/:id/void   invalida post-emision (requiere reason)

Read scope:
  - SRS coord: ven todos del tenant
  - Client coord: ven solo los de su organizacion
Write:
  - Solo SRS con authority_level in {owner, director}
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.models.invoice import BillingCategory, BillingLine

router = APIRouter(prefix="/invoices", tags=["invoices"])


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


def _round(n: float) -> float:
    return round(float(n), 2)


# ---------------- Generate ----------------

class GenerateBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    organization_id: str
    service_agreement_id: str
    period_start: datetime
    period_end: datetime
    tax_rate_pct: float = 0.0
    client_ref: str | None = None
    notes: str | None = None


def _wo_base_line(wo: dict, rc: dict, agreement: dict) -> BillingLine | None:
    """
    Genera la linea base por WO segun rate_card del agreement:
      - base_price_per_wo gana si existe (break-fix volume)
      - hourly_rate × time_on_site/60 si no (audit/survey/hourly model)
      - None si el rate_card no tiene primary aplicable al WO (caso raro —
        podria ser WO bajo un agreement puramente recurring)
    """
    base = rc.get("base_price_per_wo")
    hourly = rc.get("hourly_rate")

    if base is not None:
        qty = 1.0
        unit = _round(base)
        sub = _round(qty * unit)
        return BillingLine(
            work_order_id=str(wo["_id"]),
            work_order_reference=wo.get("reference"),
            category="wo_base",
            description=f"WO base · {wo.get('reference', '?')} · {wo.get('title', '')[:60]}",
            quantity=qty,
            unit_price=unit,
            subtotal=sub,
            context={"rate_model": "base_price_per_wo"},
        )

    if hourly is not None:
        # Pull tech_capture time_on_site_minutes if we have one, else default 1h
        # (we'll look it up in the generate handler with db access and attach).
        # Here we just fill defaults; handler overrides before appending.
        qty = 1.0
        unit = _round(hourly)
        sub = _round(qty * unit)
        return BillingLine(
            work_order_id=str(wo["_id"]),
            work_order_reference=wo.get("reference"),
            category="wo_base",
            description=f"WO hourly · {wo.get('reference', '?')} · {wo.get('title', '')[:60]}",
            quantity=qty,
            unit_price=unit,
            subtotal=sub,
            context={"rate_model": "hourly_rate", "hours_default": True},
        )

    return None


def _after_hours_line(base_line: BillingLine, rc: dict) -> BillingLine | None:
    """
    Si rate_card.after_hours_multiplier > 1 y el WO tuvo after-hours flag
    (por ahora, lo dejamos opt-in via wo.after_hours=true en doc), añade
    una linea de uplift delta sobre la base.
    """
    mult = rc.get("after_hours_multiplier")
    if not mult or mult <= 1:
        return None
    delta_pct = mult - 1.0
    unit_delta = _round(base_line.unit_price * delta_pct)
    sub = _round(base_line.quantity * unit_delta)
    return BillingLine(
        work_order_id=base_line.work_order_id,
        work_order_reference=base_line.work_order_reference,
        category="after_hours_uplift",
        description=f"After-hours uplift · ×{mult:.2f} over base",
        quantity=base_line.quantity,
        unit_price=unit_delta,
        subtotal=sub,
        context={"multiplier": mult, "base_unit": base_line.unit_price},
    )


def _travel_line(wo: dict, rc: dict) -> BillingLine | None:
    """Si travel_included=false y travel_flat_fee>0, se factura travel por WO."""
    if rc.get("travel_included") is not False:
        return None
    flat = rc.get("travel_flat_fee")
    if not flat or flat <= 0:
        return None
    unit = _round(flat)
    return BillingLine(
        work_order_id=str(wo["_id"]),
        work_order_reference=wo.get("reference"),
        category="travel_flat",
        description=f"Travel flat · {wo.get('reference', '?')}",
        quantity=1.0,
        unit_price=unit,
        subtotal=unit,
        context={"flat_fee": flat},
    )


async def _hourly_time_for_wo(db, wo: dict) -> float | None:
    """Try to pull tech_capture.time_on_site_minutes to convert to hours."""
    cap = await db.tech_captures.find_one(
        {"work_order_id": str(wo["_id"]), "status": "submitted"}
    )
    if cap and cap.get("time_on_site_minutes") is not None:
        mins = cap["time_on_site_minutes"]
        return round(max(mins, 0) / 60.0, 2)
    return None


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_invoice(
    body: GenerateBody, user: CurrentUser = Depends(get_current_user)
):
    if not _is_admin(user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Solo SRS owner/director puede generar invoices",
        )

    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    # Load agreement + rate card
    try:
        agreement = await db.service_agreements.find_one(
            {"_id": ObjectId(body.service_agreement_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        agreement = None
    if not agreement:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agreement not found")
    if agreement["organization_id"] != body.organization_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Agreement does not belong to that org"
        )
    rc = agreement.get("rate_card")
    if not rc:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Agreement has no rate_card — cargala antes de generar invoice",
        )

    # Pull closed WOs in range, not yet billed
    wo_query = {
        "tenant_id": user.tenant_id,
        "organization_id": body.organization_id,
        "service_agreement_id": body.service_agreement_id,
        "status": "closed",
        "closed_at": {
            "$gte": body.period_start,
            "$lte": body.period_end,
        },
        "$or": [
            {"billing_line_id": None},
            {"billing_line_id": {"$exists": False}},
        ],
    }
    wos = await db.work_orders.find(wo_query).to_list(2000)

    # Build billing lines
    lines: list[BillingLine] = []
    wo_ids: list[str] = []
    currency = agreement.get("currency", "USD")

    for wo in wos:
        base = _wo_base_line(wo, rc, agreement)
        if not base:
            continue

        # If hourly model, try to replace qty with real hours from capture
        if base.context.get("rate_model") == "hourly_rate":
            hours = await _hourly_time_for_wo(db, wo)
            if hours is not None and hours > 0:
                base.quantity = hours
                base.subtotal = _round(base.quantity * base.unit_price)
                base.context["hours_default"] = False
                base.context["hours"] = hours

        lines.append(base)
        wo_ids.append(str(wo["_id"]))

        # After-hours uplift if WO flagged
        if wo.get("after_hours"):
            up = _after_hours_line(base, rc)
            if up:
                lines.append(up)

        # Travel if not included
        tr = _travel_line(wo, rc)
        if tr:
            lines.append(tr)

    if not lines:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Ningun WO closed sin facturar en el periodo — nada para invoice",
        )

    subtotal = _round(sum(l.subtotal for l in lines))
    tax_rate = float(body.tax_rate_pct or 0.0)
    tax_amount = _round(subtotal * tax_rate / 100.0)
    total = _round(subtotal + tax_amount)

    # Generate invoice number: INV-YYYYMM-ORGPREFIX-NNN
    period_label = body.period_start.strftime("%Y%m")
    org_prefix = body.organization_id[-4:].upper()
    # Count existing invoices in period+org to suffix
    existing = await db.invoices.count_documents(
        {
            "tenant_id": user.tenant_id,
            "organization_id": body.organization_id,
            "period_start": {
                "$gte": body.period_start.replace(day=1),
                "$lt": body.period_start.replace(day=1) + timedelta(days=35),
            },
        }
    )
    invoice_number = f"INV-{period_label}-{org_prefix}-{(existing + 1):03d}"

    now = _now()
    doc = {
        "tenant_id": user.tenant_id,
        "organization_id": body.organization_id,
        "service_agreement_id": body.service_agreement_id,
        "srs_entity_id": agreement.get("srs_entity_id"),
        "currency": currency,
        "period_start": body.period_start,
        "period_end": body.period_end,
        "invoice_number": invoice_number,
        "client_ref": body.client_ref,
        "billing_lines": [l.model_dump() for l in lines],
        "subtotal": subtotal,
        "tax_rate_pct": tax_rate,
        "tax_amount": tax_amount,
        "total": total,
        "status": "draft",
        "issued_at": None,
        "due_date": None,
        "sent_at": None,
        "paid_at": None,
        "generated_from_wo_count": len(wo_ids),
        "work_order_ids": wo_ids,
        "notes": body.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    result = await db.invoices.insert_one(doc)
    invoice_id = str(result.inserted_id)

    # Stamp the WOs with billing_line_id to prevent double-billing
    if wo_ids:
        await db.work_orders.update_many(
            {"_id": {"$in": [ObjectId(i) for i in wo_ids]}},
            {"$set": {"billing_line_id": invoice_id, "updated_at": now}},
        )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="invoice.generate",
        entity_refs=[
            {"collection": "invoices", "id": invoice_id, "label": invoice_number},
            {"collection": "organizations", "id": body.organization_id},
            {"collection": "service_agreements", "id": body.service_agreement_id},
        ],
        context_snapshot={
            "invoice_number": invoice_number,
            "total": total,
            "currency": currency,
            "wo_count": len(wo_ids),
            "period_start": body.period_start.isoformat(),
            "period_end": body.period_end.isoformat(),
        },
    )

    doc["_id"] = result.inserted_id
    return _serialize(doc)


# ---------------- List / Detail ----------------

@router.get("")
async def list_invoices(
    organization_id: str | None = None,
    status_filter: str | None = None,
    limit: int = 100,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_db()
    q: dict[str, Any] = {"tenant_id": user.tenant_id}

    # Client coord: narrow to own org
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

    docs = await db.invoices.find(q).sort("created_at", -1).limit(min(limit, 500)).to_list(None)
    return [_serialize(d) for d in docs]


@router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: str, user: CurrentUser = Depends(get_current_user)
):
    db = get_db()
    try:
        doc = await db.invoices.find_one(
            {"_id": ObjectId(invoice_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invoice not found")

    # Client isolation
    if not user.has_space("srs_coordinators"):
        client_mem = user.membership_in("client_coordinator")
        if client_mem and client_mem.get("organization_id"):
            if doc["organization_id"] != client_mem["organization_id"]:
                raise HTTPException(
                    status.HTTP_403_FORBIDDEN, "Cross-tenant access forbidden"
                )
        else:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Invoice not found")

    return _serialize(doc)


# ---------------- Status transitions ----------------

class SendBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    due_in_days: int = 30
    notes: str | None = None


@router.post("/{invoice_id}/send")
async def send_invoice(
    invoice_id: str,
    body: SendBody,
    user: CurrentUser = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    db = get_db()
    try:
        doc = await db.invoices.find_one(
            {"_id": ObjectId(invoice_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invoice not found")
    if doc["status"] != "draft":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot send from status '{doc['status']}'",
        )

    now = _now()
    due = now + timedelta(days=max(1, body.due_in_days))
    await db.invoices.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "sent",
                "issued_at": now,
                "sent_at": now,
                "due_date": due,
                "updated_at": now,
                "updated_by": user.user_id,
                **({"notes": body.notes} if body.notes else {}),
            }
        },
    )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="invoice.send",
        entity_refs=[{"collection": "invoices", "id": invoice_id, "label": doc.get("invoice_number")}],
        context_snapshot={
            "total": doc.get("total"),
            "due_date": due.isoformat(),
        },
    )
    refreshed = await db.invoices.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


class PaidBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    paid_at: datetime | None = None  # defaults to now
    notes: str | None = None


@router.post("/{invoice_id}/paid")
async def mark_paid(
    invoice_id: str,
    body: PaidBody,
    user: CurrentUser = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    db = get_db()
    try:
        doc = await db.invoices.find_one(
            {"_id": ObjectId(invoice_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invoice not found")
    if doc["status"] not in ("sent", "overdue"):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot mark paid from status '{doc['status']}'",
        )

    now = _now()
    paid_at = body.paid_at or now
    await db.invoices.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "paid",
                "paid_at": paid_at,
                "updated_at": now,
                "updated_by": user.user_id,
                **({"notes": body.notes} if body.notes else {}),
            }
        },
    )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="invoice.paid",
        entity_refs=[{"collection": "invoices", "id": invoice_id, "label": doc.get("invoice_number")}],
        context_snapshot={"paid_at": paid_at.isoformat(), "total": doc.get("total")},
    )
    refreshed = await db.invoices.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


class VoidBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reason: str


@router.post("/{invoice_id}/void")
async def void_invoice(
    invoice_id: str,
    body: VoidBody,
    user: CurrentUser = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    db = get_db()
    try:
        doc = await db.invoices.find_one(
            {"_id": ObjectId(invoice_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invoice not found")
    if doc["status"] == "void":
        raise HTTPException(status.HTTP_409_CONFLICT, "Already void")
    if not body.reason.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Reason required")

    now = _now()
    await db.invoices.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "void",
                "void_at": now,
                "void_reason": body.reason.strip(),
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )

    # Release the WOs so they can be re-billed in a new invoice
    if doc.get("work_order_ids"):
        await db.work_orders.update_many(
            {"_id": {"$in": [ObjectId(i) for i in doc["work_order_ids"]]}},
            {"$set": {"billing_line_id": None, "updated_at": now}},
        )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="invoice.void",
        entity_refs=[{"collection": "invoices", "id": invoice_id, "label": doc.get("invoice_number")}],
        context_snapshot={
            "reason": body.reason,
            "prev_status": doc.get("status"),
            "wos_released": len(doc.get("work_order_ids") or []),
        },
    )
    refreshed = await db.invoices.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)
