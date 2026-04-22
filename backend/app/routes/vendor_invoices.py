"""
InsiteIQ v1 — Vendor Invoice routes (Pasito X-d · Fase 3 AP).

AP core — trazabilidad de DEUDAS con proveedores (Arlindo external sub,
Fervimax-as-vendor, HQ Computacion, DXC como labor partner, carriers, etc).

Endpoints:
  POST  /api/vendor-invoices          crear (registrar que el vendor mando factura)
  GET   /api/vendor-invoices          list (SRS todo · filtros status/vendor/age)
  GET   /api/vendor-invoices/:id      detail
  PATCH /api/vendor-invoices/:id      update (amount, lines, linked_wo_ids, notes)
  POST  /api/vendor-invoices/:id/match        corre three-way match
  POST  /api/vendor-invoices/:id/approve      matched -> approved
  POST  /api/vendor-invoices/:id/paid         approved -> paid con wire_ref
  POST  /api/vendor-invoices/:id/dispute      flagged con reason
  POST  /api/vendor-invoices/:id/reject       invalida con reason

Read scope:
  - Solo SRS coord (vendor invoices son 100% internal · client NO ve)
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
from app.models.vendor_invoice import VendorInvoiceLine

router = APIRouter(prefix="/vendor-invoices", tags=["vendor_invoices"])


OWNER_AUTHORITY = {"owner", "director"}


def _is_admin(user: CurrentUser) -> bool:
    if not user.has_space("srs_coordinators"):
        return False
    m = user.membership_in("srs_coordinators")
    return bool(m and m.get("authority_level") in OWNER_AUTHORITY)


def _is_srs(user: CurrentUser) -> bool:
    return user.has_space("srs_coordinators")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


def _round(n: float) -> float:
    return round(float(n), 2)


# ---------------- Validation helpers ----------------

async def _assert_vendor_org(db, tenant_id: str, org_id: str) -> dict:
    """Vendor org must exist and have at least one vendor_* partner role."""
    try:
        org = await db.organizations.find_one(
            {"_id": ObjectId(org_id), "tenant_id": tenant_id}
        )
    except Exception:
        org = None
    if not org:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "vendor_organization_id not found")
    rels = org.get("partner_relationships") or []
    has_vendor = any(
        r.get("status") == "active"
        and r.get("type") in ("vendor_labor", "vendor_material", "vendor_service")
        for r in rels
    )
    if not has_vendor:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Organization is not a vendor (needs active partner_relationships.type=vendor_*)",
        )
    return org


# ---------------- Create / List / Detail ----------------

class CreateBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    vendor_organization_id: str
    vendor_invoice_number: str
    issued_at: datetime | None = None
    due_date: datetime | None = None
    currency: str = "USD"
    subtotal: float = 0.0
    tax_rate_pct: float = 0.0
    tax_amount: float = 0.0
    total: float
    lines: list[VendorInvoiceLine] = Field(default_factory=list)
    linked_work_order_ids: list[str] = Field(default_factory=list)
    linked_budget_approval_ids: list[str] = Field(default_factory=list)
    service_agreement_id: str | None = None
    srs_entity_id: str | None = None
    attachment_urls: list[str] = Field(default_factory=list)
    notes: str | None = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_vendor_invoice(
    body: CreateBody, user: CurrentUser = Depends(get_current_user)
):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    if body.total <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "total must be > 0")

    db = get_db()
    org = await _assert_vendor_org(db, user.tenant_id, body.vendor_organization_id)

    # Validate linked WOs exist in same tenant
    if body.linked_work_order_ids:
        oids = [ObjectId(i) for i in body.linked_work_order_ids]
        cnt = await db.work_orders.count_documents(
            {"_id": {"$in": oids}, "tenant_id": user.tenant_id}
        )
        if cnt != len(oids):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Some linked_work_order_ids not found in tenant",
            )

    # Validate linked budget approval requests
    if body.linked_budget_approval_ids:
        oids = [ObjectId(i) for i in body.linked_budget_approval_ids]
        cnt = await db.budget_approval_requests.count_documents(
            {"_id": {"$in": oids}, "tenant_id": user.tenant_id}
        )
        if cnt != len(oids):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Some linked_budget_approval_ids not found",
            )

    now = _now()
    doc = {
        "tenant_id": user.tenant_id,
        "vendor_organization_id": body.vendor_organization_id,
        "srs_entity_id": body.srs_entity_id,
        "vendor_invoice_number": body.vendor_invoice_number.strip(),
        "issued_at": body.issued_at,
        "due_date": body.due_date,
        "currency": body.currency.upper(),
        "subtotal": _round(body.subtotal),
        "tax_rate_pct": _round(body.tax_rate_pct),
        "tax_amount": _round(body.tax_amount),
        "total": _round(body.total),
        "lines": [l.model_dump() for l in body.lines],
        "linked_work_order_ids": body.linked_work_order_ids,
        "linked_budget_approval_ids": body.linked_budget_approval_ids,
        "service_agreement_id": body.service_agreement_id,
        "match_report": None,
        "status": "received",
        "received_at": now,
        "approved_at": None,
        "approved_by": None,
        "paid_at": None,
        "paid_by": None,
        "wire_ref": None,
        "rejected_at": None,
        "reject_reason": None,
        "disputed_at": None,
        "dispute_reason": None,
        "attachment_urls": body.attachment_urls,
        "notes": body.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    result = await db.vendor_invoices.insert_one(doc)
    vi_id = str(result.inserted_id)

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="vendor_invoice.create",
        entity_refs=[
            {"collection": "vendor_invoices", "id": vi_id, "label": body.vendor_invoice_number},
            {"collection": "organizations", "id": body.vendor_organization_id, "label": org.get("legal_name")},
        ],
        context_snapshot={
            "total": body.total,
            "currency": body.currency,
            "linked_wo_count": len(body.linked_work_order_ids),
        },
    )

    doc["_id"] = result.inserted_id
    return _serialize(doc)


@router.get("")
async def list_vendor_invoices(
    status_filter: str | None = None,
    vendor_organization_id: str | None = None,
    limit: int = 200,
    user: CurrentUser = Depends(get_current_user),
):
    if not _is_srs(user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "AP es SRS-internal"
        )
    db = get_db()
    q: dict[str, Any] = {"tenant_id": user.tenant_id}
    if status_filter:
        q["status"] = status_filter
    if vendor_organization_id:
        q["vendor_organization_id"] = vendor_organization_id
    docs = await (
        db.vendor_invoices.find(q)
        .sort("received_at", -1)
        .limit(min(limit, 500))
        .to_list(None)
    )
    return [_serialize(d) for d in docs]


@router.get("/{vi_id}")
async def get_vendor_invoice(
    vi_id: str, user: CurrentUser = Depends(get_current_user)
):
    if not _is_srs(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "AP es SRS-internal")
    db = get_db()
    try:
        doc = await db.vendor_invoices.find_one(
            {"_id": ObjectId(vi_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "VendorInvoice not found")
    return _serialize(doc)


class PatchBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    vendor_invoice_number: str | None = None
    issued_at: datetime | None = None
    due_date: datetime | None = None
    currency: str | None = None
    subtotal: float | None = None
    tax_rate_pct: float | None = None
    tax_amount: float | None = None
    total: float | None = None
    lines: list[VendorInvoiceLine] | None = None
    linked_work_order_ids: list[str] | None = None
    linked_budget_approval_ids: list[str] | None = None
    service_agreement_id: str | None = None
    attachment_urls: list[str] | None = None
    notes: str | None = None


@router.patch("/{vi_id}")
async def patch_vendor_invoice(
    vi_id: str, body: PatchBody, user: CurrentUser = Depends(get_current_user)
):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    db = get_db()
    try:
        oid = ObjectId(vi_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid id")

    doc = await db.vendor_invoices.find_one(
        {"_id": oid, "tenant_id": user.tenant_id}
    )
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if doc["status"] == "paid":
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Cannot edit paid invoice — dispute or reject"
        )

    patch: dict = {}
    for f in (
        "vendor_invoice_number", "issued_at", "due_date",
        "service_agreement_id", "notes",
    ):
        val = getattr(body, f, None)
        if val is not None:
            patch[f] = val if not isinstance(val, str) else val.strip()
    if body.currency is not None:
        patch["currency"] = body.currency.upper()
    for f in ("subtotal", "tax_rate_pct", "tax_amount", "total"):
        val = getattr(body, f, None)
        if val is not None:
            patch[f] = _round(val)
    if body.lines is not None:
        patch["lines"] = [l.model_dump() for l in body.lines]
    if body.linked_work_order_ids is not None:
        patch["linked_work_order_ids"] = body.linked_work_order_ids
    if body.linked_budget_approval_ids is not None:
        patch["linked_budget_approval_ids"] = body.linked_budget_approval_ids
    if body.attachment_urls is not None:
        patch["attachment_urls"] = body.attachment_urls

    if not patch:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nada para actualizar")

    now = _now()
    patch["updated_at"] = now
    patch["updated_by"] = user.user_id
    await db.vendor_invoices.update_one({"_id": oid}, {"$set": patch})

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="vendor_invoice.update",
        entity_refs=[
            {"collection": "vendor_invoices", "id": vi_id, "label": doc.get("vendor_invoice_number")},
        ],
        context_snapshot={"fields": list(patch.keys())},
    )
    refreshed = await db.vendor_invoices.find_one({"_id": oid})
    return _serialize(refreshed)


# ---------------- Three-way match ----------------

@router.post("/{vi_id}/match")
async def run_match(
    vi_id: str, user: CurrentUser = Depends(get_current_user)
):
    """
    Compara PO (budget_approval_request totals) × vendor invoice total
    × receipts (tech_captures.parts_used counts) de los linked_wo_ids.
    """
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    db = get_db()
    doc = await db.vendor_invoices.find_one(
        {"_id": ObjectId(vi_id), "tenant_id": user.tenant_id}
    )
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")

    po_total = 0.0
    linked_bas = doc.get("linked_budget_approval_ids") or []
    if linked_bas:
        oids = [ObjectId(i) for i in linked_bas]
        async for ba in db.budget_approval_requests.find(
            {"_id": {"$in": oids}, "tenant_id": user.tenant_id}
        ):
            po_total += float(ba.get("total_amount_usd") or 0)

    # Receipt match: count tech_capture.parts_used items for linked WOs
    receipt_count = 0
    linked_wos = doc.get("linked_work_order_ids") or []
    for wo_id in linked_wos:
        cap = await db.tech_captures.find_one(
            {"work_order_id": wo_id, "tenant_id": user.tenant_id, "status": "submitted"}
        )
        if cap:
            receipt_count += len(cap.get("parts_used") or [])

    invoice_total = float(doc.get("total") or 0)
    variance = _round(invoice_total - po_total)
    variance_pct = (
        _round((variance / po_total * 100)) if po_total > 0 else 0.0
    )

    if po_total == 0 and not linked_bas:
        result = "no_po"
    elif abs(variance_pct) <= 5:  # ≤5% tolerance = match
        result = "match"
    elif abs(variance_pct) <= 20:  # 5-20% = partial
        result = "partial_match"
    else:
        result = "mismatch"

    now = _now()
    match_report = {
        "result": result,
        "po_total": _round(po_total),
        "invoice_total": _round(invoice_total),
        "receipt_matched_items": receipt_count,
        "variance": variance,
        "variance_pct": variance_pct,
        "notes": None,
        "matched_at": now,
        "matched_by": user.user_id,
    }

    await db.vendor_invoices.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "match_report": match_report,
                "status": "matched",
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="vendor_invoice.match",
        entity_refs=[
            {"collection": "vendor_invoices", "id": vi_id, "label": doc.get("vendor_invoice_number")},
        ],
        context_snapshot={
            "result": result,
            "po_total": po_total,
            "invoice_total": invoice_total,
            "variance_pct": variance_pct,
        },
    )

    refreshed = await db.vendor_invoices.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


# ---------------- Lifecycle ----------------

class NotesBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notes: str | None = None


class ApproveBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notes: str | None = None
    override_mismatch: bool = False  # aprueba aunque match sea mismatch


@router.post("/{vi_id}/approve")
async def approve(
    vi_id: str, body: ApproveBody, user: CurrentUser = Depends(get_current_user)
):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    db = get_db()
    doc = await db.vendor_invoices.find_one(
        {"_id": ObjectId(vi_id), "tenant_id": user.tenant_id}
    )
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if doc["status"] not in ("received", "matched", "disputed"):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Cannot approve from status '{doc['status']}'"
        )
    # If matched as mismatch, require override
    match = doc.get("match_report") or {}
    if match.get("result") == "mismatch" and not body.override_mismatch:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Match reporta mismatch — requires override_mismatch=true",
        )

    now = _now()
    await db.vendor_invoices.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "approved",
                "approved_at": now,
                "approved_by": user.user_id,
                "updated_at": now,
                "updated_by": user.user_id,
                **({"notes": body.notes} if body.notes else {}),
            }
        },
    )

    await write_audit_event(
        db, tenant_id=user.tenant_id, actor_user_id=user.user_id,
        action="vendor_invoice.approve",
        entity_refs=[{"collection": "vendor_invoices", "id": vi_id, "label": doc.get("vendor_invoice_number")}],
        context_snapshot={
            "override_mismatch": body.override_mismatch,
            "total": doc.get("total"),
        },
    )
    refreshed = await db.vendor_invoices.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


class PaidBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    wire_ref: str
    paid_at: datetime | None = None
    notes: str | None = None


@router.post("/{vi_id}/paid")
async def mark_paid(
    vi_id: str, body: PaidBody, user: CurrentUser = Depends(get_current_user)
):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    if not body.wire_ref.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "wire_ref required")
    db = get_db()
    doc = await db.vendor_invoices.find_one(
        {"_id": ObjectId(vi_id), "tenant_id": user.tenant_id}
    )
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if doc["status"] != "approved":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Must be approved before paid (status='{doc['status']}')",
        )

    now = _now()
    paid_at = body.paid_at or now
    await db.vendor_invoices.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "paid",
                "paid_at": paid_at,
                "paid_by": user.user_id,
                "wire_ref": body.wire_ref.strip(),
                "updated_at": now,
                "updated_by": user.user_id,
                **({"notes": body.notes} if body.notes else {}),
            }
        },
    )

    await write_audit_event(
        db, tenant_id=user.tenant_id, actor_user_id=user.user_id,
        action="vendor_invoice.paid",
        entity_refs=[{"collection": "vendor_invoices", "id": vi_id, "label": doc.get("vendor_invoice_number")}],
        context_snapshot={
            "paid_at": paid_at.isoformat(),
            "total": doc.get("total"),
            "wire_ref": body.wire_ref,
        },
    )
    refreshed = await db.vendor_invoices.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


class DisputeBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reason: str


@router.post("/{vi_id}/dispute")
async def dispute(
    vi_id: str, body: DisputeBody, user: CurrentUser = Depends(get_current_user)
):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    if not body.reason.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "reason required")
    db = get_db()
    doc = await db.vendor_invoices.find_one(
        {"_id": ObjectId(vi_id), "tenant_id": user.tenant_id}
    )
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if doc["status"] in ("paid", "rejected"):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Cannot dispute status='{doc['status']}'"
        )

    now = _now()
    await db.vendor_invoices.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "disputed",
                "disputed_at": now,
                "dispute_reason": body.reason.strip(),
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )
    await write_audit_event(
        db, tenant_id=user.tenant_id, actor_user_id=user.user_id,
        action="vendor_invoice.dispute",
        entity_refs=[{"collection": "vendor_invoices", "id": vi_id, "label": doc.get("vendor_invoice_number")}],
        context_snapshot={"reason": body.reason, "prev_status": doc.get("status")},
    )
    refreshed = await db.vendor_invoices.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


class RejectBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reason: str


@router.post("/{vi_id}/reject")
async def reject(
    vi_id: str, body: RejectBody, user: CurrentUser = Depends(get_current_user)
):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS admin")
    if not body.reason.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "reason required")
    db = get_db()
    doc = await db.vendor_invoices.find_one(
        {"_id": ObjectId(vi_id), "tenant_id": user.tenant_id}
    )
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if doc["status"] == "paid":
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot reject paid invoice")
    if doc["status"] == "rejected":
        raise HTTPException(status.HTTP_409_CONFLICT, "Already rejected")

    now = _now()
    await db.vendor_invoices.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "rejected",
                "rejected_at": now,
                "reject_reason": body.reason.strip(),
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )
    await write_audit_event(
        db, tenant_id=user.tenant_id, actor_user_id=user.user_id,
        action="vendor_invoice.reject",
        entity_refs=[{"collection": "vendor_invoices", "id": vi_id, "label": doc.get("vendor_invoice_number")}],
        context_snapshot={"reason": body.reason, "prev_status": doc.get("status")},
    )
    refreshed = await db.vendor_invoices.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


# ---------------- AP aging summary (for dashboards) ----------------

@router.get("/aging/summary")
async def aging_summary(user: CurrentUser = Depends(get_current_user)):
    """Resume AP aging buckets · para dashboard Finance."""
    if not _is_srs(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "AP internal")
    db = get_db()
    now = _now()
    buckets = {
        "current": {"count": 0, "total": 0.0},
        "30_60": {"count": 0, "total": 0.0},
        "60_90": {"count": 0, "total": 0.0},
        "over_90": {"count": 0, "total": 0.0},
    }
    by_currency: dict[str, float] = {}

    async for v in db.vendor_invoices.find(
        {
            "tenant_id": user.tenant_id,
            "status": {"$in": ["received", "matched", "approved", "disputed"]},
        }
    ):
        received = v.get("received_at") or v.get("created_at")
        if not received:
            continue
        days = (now - received).days
        total = float(v.get("total") or 0)
        if days < 30:
            bucket = "current"
        elif days < 60:
            bucket = "30_60"
        elif days < 90:
            bucket = "60_90"
        else:
            bucket = "over_90"
        buckets[bucket]["count"] += 1
        buckets[bucket]["total"] = _round(buckets[bucket]["total"] + total)
        cur = v.get("currency") or "USD"
        by_currency[cur] = _round(by_currency.get(cur, 0) + total)

    return {"buckets": buckets, "by_currency": by_currency, "as_of": now}
