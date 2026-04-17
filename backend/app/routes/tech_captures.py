"""
InsiteIQ v1 Modo 1 — Tech Capture routes (Domain 10.4)

Endpoints (nested under /api/work-orders/{wo_id}/capture):
  POST   /submit    — assigned tech submits capture (supersedes any previous)
  GET    /          — get active capture (SRS + assigned tech)

Guard hook (used by work_orders.advance):
  - On target='resolved' from 'on_site': require capture with status='submitted'
    AND submitted_by == assigned_tech_user_id
    OR body.emergency=true

This closes the knowledge-loop pair with Copilot Briefing:
  PRE:  briefing.acknowledge   gates dispatched -> en_route
  POST: capture.submit         gates on_site    -> resolved

Fase 5 will add sync jobs to populate Site Bible + Device Bible from submitted
captures (site_bible_sync_status, device_bible_sync_status). For now we
persist the raw fields — zero loss, ready for future ingestion.
"""
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.models.tech_capture import DeviceTouched
from app.models.ticket_thread import MessageAttachment

router = APIRouter(prefix="/work-orders/{wo_id}/capture", tags=["tech_captures"])


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


class SubmitBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    what_found: str
    what_did: str
    anything_new_about_site: str | None = None
    devices_touched: list[DeviceTouched] = Field(default_factory=list)
    photos: list[MessageAttachment] = Field(default_factory=list)
    time_on_site_minutes: int | None = None
    parts_used: list[dict] = Field(default_factory=list)
    follow_up_needed: bool = False
    follow_up_notes: str | None = None


@router.post("/submit", status_code=status.HTTP_201_CREATED)
async def submit_capture(
    wo_id: str, body: SubmitBody, user: CurrentUser = Depends(get_current_user)
):
    """Assigned tech submits the post-intervention capture."""
    db = get_db()
    wo = await _load_wo(db, wo_id, user)

    if wo.get("assigned_tech_user_id") != user.user_id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only the assigned tech can submit the capture"
        )

    # Basic content guard
    if not body.what_found.strip() or not body.what_did.strip():
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "what_found and what_did are required non-empty",
        )

    # Supersede any existing active capture
    prev = await db.tech_captures.find_one(
        {"work_order_id": wo_id, "tenant_id": user.tenant_id, "status": "submitted"}
    )
    supersedes_id = None
    if prev:
        supersedes_id = str(prev["_id"])
        await db.tech_captures.update_one(
            {"_id": prev["_id"]},
            {"$set": {"status": "superseded", "updated_at": _now()}},
        )

    now = _now()
    doc = {
        "tenant_id": user.tenant_id,
        "work_order_id": wo_id,
        "submitted_at": now,
        "submitted_by": user.user_id,
        "what_found": body.what_found,
        "what_did": body.what_did,
        "anything_new_about_site": body.anything_new_about_site,
        "devices_touched": [d.model_dump() for d in body.devices_touched],
        "photos": [p.model_dump() for p in body.photos],
        "time_on_site_minutes": body.time_on_site_minutes,
        "parts_used": body.parts_used,
        "follow_up_needed": body.follow_up_needed,
        "follow_up_notes": body.follow_up_notes,
        "status": "submitted",
        "supersedes_id": supersedes_id,
        "site_bible_sync_status": "pending",
        "device_bible_sync_status": "pending",
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    result = await db.tech_captures.insert_one(doc)
    doc["_id"] = result.inserted_id

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="tech_capture.submit",
        entity_refs=[
            {"collection": "work_orders", "id": wo_id, "label": wo.get("reference")},
            {"collection": "tech_captures", "id": str(result.inserted_id)},
        ],
        context_snapshot={
            "supersedes_id": supersedes_id,
            "devices_count": len(body.devices_touched),
            "photos_count": len(body.photos),
            "time_on_site_minutes": body.time_on_site_minutes,
            "follow_up_needed": body.follow_up_needed,
        },
    )

    return _serialize(doc)


@router.get("")
async def get_capture(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    """Active capture. Visible to SRS + assigned tech. Clients NO (internal)."""
    db = get_db()
    wo = await _load_wo(db, wo_id, user)

    # Clients don't see raw captures — they consume the final report (Fase 1 emit channels)
    if user.has_space("client_coordinator") and not (
        user.has_space("srs_coordinators") or user.has_space("tech_field")
    ):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Captures are internal; clients see final reports"
        )

    # Tech must be the assigned one
    if user.has_space("tech_field") and not user.has_space("srs_coordinators"):
        if wo.get("assigned_tech_user_id") != user.user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your work order")

    doc = await db.tech_captures.find_one(
        {"work_order_id": wo_id, "tenant_id": user.tenant_id, "status": "submitted"}
    )
    if not doc:
        return {"exists": False, "work_order_id": wo_id}
    return {"exists": True, **_serialize(doc)}


# ---------------- Helper for work_orders.advance guard ----------------

async def capture_submitted_by(db, wo: dict, user_id: str) -> bool:
    """True iff an active capture exists for this WO, submitted by `user_id`."""
    doc = await db.tech_captures.find_one({
        "work_order_id": str(wo["_id"]),
        "tenant_id": wo["tenant_id"],
        "status": "submitted",
        "submitted_by": user_id,
    })
    return doc is not None
