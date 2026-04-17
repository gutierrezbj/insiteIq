"""
InsiteIQ v1 Modo 1 — Intervention Report routes (Principle #1 — Emit outward)

5 canales activos al cierre del work_order:
  1. JSON     GET    /api/work-orders/{id}/report
  2. HTML     GET    /api/work-orders/{id}/report.html
  3. CSV      GET    /api/work-orders/{id}/report.csv
  4. Email    POST   /api/work-orders/{id}/report/dispatch/email
  5. Webhook  POST   /api/work-orders/{id}/report/dispatch/webhook

Portal view = JSON scoped (client solo ve su vista sin internal_thread_count).
Email + webhook se enqueuean en email_outbox / webhook_outbox (worker drena
en futuro — v1 Foundation persiste la intencion de delivery + razon).

Regenerate (POST /api/work-orders/{id}/report/regenerate) fuerza
re-assembly y supersede. Util si el WO se reabre o hay correcciones.
"""
from datetime import datetime, timezone
from typing import Any, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.services.report_assembler import (
    assemble_intervention_report,
    render_csv,
    render_html,
    scope_report,
)

router = APIRouter(prefix="/work-orders/{wo_id}/report", tags=["intervention_reports"])


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


def _scope_for(user: CurrentUser) -> Literal["srs", "client"]:
    return "srs" if user.has_space("srs_coordinators") or user.has_space("tech_field") else "client"


async def _fetch_active_report(db, wo_id: str, tenant_id: str) -> dict | None:
    return await db.intervention_reports.find_one(
        {"work_order_id": wo_id, "tenant_id": tenant_id, "status": "final"}
    )


# ---------------- 1. JSON portal ----------------

@router.get("")
async def get_report_json(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    wo = await _load_wo(db, wo_id, user)
    report = await _fetch_active_report(db, wo_id, user.tenant_id)
    if not report:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Report not assembled yet (work_order must be closed or regenerate called)",
        )
    scoped = scope_report(report, _scope_for(user))
    return _serialize(scoped)


# ---------------- 2. HTML ----------------

@router.get(".html", response_class=Response)
async def get_report_html(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    wo = await _load_wo(db, wo_id, user)
    report = await _fetch_active_report(db, wo_id, user.tenant_id)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not assembled yet")

    scope = _scope_for(user)
    # Cached html is SRS-scoped; re-render on the fly for client
    if scope == "srs" and report.get("html_rendered"):
        body = report["html_rendered"]
    else:
        body = render_html(report, scope=scope)
    return Response(content=body, media_type="text/html; charset=utf-8")


# ---------------- 3. CSV ----------------

@router.get(".csv", response_class=Response)
async def get_report_csv(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    wo = await _load_wo(db, wo_id, user)
    report = await _fetch_active_report(db, wo_id, user.tenant_id)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not assembled yet")

    scope = _scope_for(user)
    if scope == "srs" and report.get("csv_rendered"):
        body = report["csv_rendered"]
    else:
        body = render_csv(report, scope=scope)

    filename = f"{report.get('header',{}).get('work_order_reference','report')}.csv"
    return Response(
        content=body,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------- 4 + 5. Dispatch (email/webhook outbox) ----------------

class DispatchEmailBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    to: str
    cc: list[str] = []
    subject: str | None = None


class DispatchWebhookBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    url: str
    include_html: bool = False


async def _record_delivery(db, report_id, channel, target, requested_by, status_value="queued"):
    now = _now()
    evt = {
        "channel": channel,
        "target": target,
        "enqueued_at": now,
        "status": status_value,
        "attempts": 0,
        "requested_by": requested_by,
    }
    await db.intervention_reports.update_one(
        {"_id": report_id}, {"$push": {"deliveries": evt}, "$set": {"updated_at": now}}
    )


@router.post("/dispatch/email")
async def dispatch_email(
    wo_id: str, body: DispatchEmailBody, user: CurrentUser = Depends(get_current_user)
):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS coord can dispatch")

    db = get_db()
    wo = await _load_wo(db, wo_id, user)
    report = await _fetch_active_report(db, wo_id, user.tenant_id)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not assembled yet")

    now = _now()
    outbox_entry = {
        "tenant_id": user.tenant_id,
        "work_order_id": wo_id,
        "report_id": str(report["_id"]),
        "to": body.to,
        "cc": body.cc,
        "subject": body.subject
        or f"[InsiteIQ] {report.get('header',{}).get('work_order_reference','')}"
        f" — {report.get('header',{}).get('title','')}",
        "body_html": render_html(report, scope="client"),
        "enqueued_at": now,
        "status": "queued",
        "attempts": 0,
        "last_error": None,
        "requested_by": user.user_id,
    }
    result = await db.email_outbox.insert_one(outbox_entry)

    await _record_delivery(db, report["_id"], "email", body.to, user.user_id)
    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="intervention_report.dispatch.email",
        entity_refs=[
            {"collection": "work_orders", "id": wo_id, "label": wo.get("reference")},
            {"collection": "intervention_reports", "id": str(report["_id"])},
        ],
        context_snapshot={"to": body.to, "cc": body.cc},
    )
    return {
        "queued": True,
        "outbox_id": str(result.inserted_id),
        "channel": "email",
        "target": body.to,
    }


@router.post("/dispatch/webhook")
async def dispatch_webhook(
    wo_id: str, body: DispatchWebhookBody, user: CurrentUser = Depends(get_current_user)
):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS coord can dispatch")

    db = get_db()
    wo = await _load_wo(db, wo_id, user)
    report = await _fetch_active_report(db, wo_id, user.tenant_id)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not assembled yet")

    now = _now()
    payload = scope_report(report, "client")
    # strip rendered caches from payload to keep JSON small
    payload = {k: v for k, v in payload.items() if k not in ("html_rendered", "csv_rendered")}
    payload["id"] = str(payload.pop("_id"))
    if body.include_html:
        payload["html_rendered"] = render_html(report, scope="client")

    outbox_entry = {
        "tenant_id": user.tenant_id,
        "work_order_id": wo_id,
        "report_id": str(report["_id"]),
        "url": body.url,
        "payload": payload,
        "enqueued_at": now,
        "status": "queued",
        "attempts": 0,
        "last_error": None,
        "requested_by": user.user_id,
    }
    result = await db.webhook_outbox.insert_one(outbox_entry)

    await _record_delivery(db, report["_id"], "webhook", body.url, user.user_id)
    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="intervention_report.dispatch.webhook",
        entity_refs=[
            {"collection": "work_orders", "id": wo_id, "label": wo.get("reference")},
            {"collection": "intervention_reports", "id": str(report["_id"])},
        ],
        context_snapshot={"url": body.url},
    )
    return {
        "queued": True,
        "outbox_id": str(result.inserted_id),
        "channel": "webhook",
        "target": body.url,
    }


# ---------------- Regenerate ----------------

@router.post("/regenerate")
async def regenerate_report(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS coord can regenerate")

    db = get_db()
    wo = await _load_wo(db, wo_id, user)
    doc = await assemble_intervention_report(db, wo, actor_user_id=user.user_id)

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="intervention_report.regenerate",
        entity_refs=[
            {"collection": "work_orders", "id": wo_id, "label": wo.get("reference")},
            {"collection": "intervention_reports", "id": str(doc["_id"])},
        ],
        context_snapshot={"version": doc.get("version")},
    )
    return _serialize(doc)
