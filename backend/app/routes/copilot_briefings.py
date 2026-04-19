"""
InsiteIQ v1 Modo 1 — Copilot Briefing routes (Domain 10.5)

Endpoints (nested under /api/work-orders/{wo_id}/briefing):
  POST   /api/work-orders/{wo_id}/briefing/assemble      — generate/refresh (SRS)
  GET    /api/work-orders/{wo_id}/briefing               — get active briefing
  POST   /api/work-orders/{wo_id}/briefing/acknowledge   — assigned tech confirms read

Guard hook (used by work_orders.advance):
  - On target='en_route': require briefing.status == 'acknowledged'
    AND acknowledged_by == assigned_tech_user_id
    OR body.emergency=true (logged in audit)

Assembly (Fase 1 minimal):
  Pulls what's available today: site fields + historial work_orders mismo site.
  Site Bible + Device Bible completos llegan en Fase 5 — la FUNCION assemble
  ya deja hueco estructural para ellos.
"""
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event

router = APIRouter(prefix="/work-orders/{wo_id}/briefing", tags=["copilot_briefings"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def _load_wo(db, wo_id: str, user: CurrentUser) -> dict:
    """Load work_order with scope enforcement (mirror of work_orders.py)."""
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


async def _assemble_sections(db, wo: dict) -> dict:
    """
    Fase 1 minimal assembly. Pulls what's reachable today:
      - Site fields (onsite_contact, access_notes, has_physical_resident)
      - Last 3 historical work_orders on same site (excluding this one)
    Expands in Fase 5 when Site Bible + Device Bible land.
    """
    sections: dict[str, Any] = {
        "site_bible_summary": {},
        "device_bible": [],
        "history": [],
        "parts_estimate": [],
    }

    # Site Bible summary (from Site entity — minimal)
    try:
        site = await db.sites.find_one(
            {"_id": ObjectId(wo["site_id"]), "tenant_id": wo["tenant_id"]}
        )
    except Exception:
        site = None
    if site:
        sections["site_bible_summary"] = {
            "site_name": site.get("name"),
            "address": site.get("address"),
            "country": site.get("country"),
            "city": site.get("city"),
            "timezone": site.get("timezone"),
            "onsite_contact": site.get("onsite_contact"),
            "access_notes": site.get("access_notes"),
            "has_physical_resident": site.get("has_physical_resident", False),
            "known_issues": [],    # Fase 5 populates from site_bible collection
            "confidence": "draft",  # Fase 5 workflow
        }

    # Historical interventions on the same site — last 3 closed
    history_cursor = (
        db.work_orders.find({
            "tenant_id": wo["tenant_id"],
            "site_id": wo["site_id"],
            "_id": {"$ne": wo["_id"]},
            "status": {"$in": ["closed", "resolved"]},
        })
        .sort("updated_at", -1)
        .limit(3)
    )
    async for h in history_cursor:
        sections["history"].append({
            "work_order_id": str(h["_id"]),
            "reference": h.get("reference"),
            "title": h.get("title"),
            "status": h.get("status"),
            "closed_at": h.get("closed_at"),
            "outcome_summary": None,  # Fase 5: from post_mortem
        })

    # Device Bible + parts_estimate: empty until Fase 5

    return sections


@router.post("/assemble", status_code=status.HTTP_200_OK)
async def assemble_briefing(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    """SRS coordinator assembles (or refreshes) the briefing."""
    if not user.has_space("srs_coordinators"):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only SRS coordinators can assemble briefings"
        )

    db = get_db()
    wo = await _load_wo(db, wo_id, user)

    # If an active briefing exists, supersede it
    prev = await db.copilot_briefings.find_one(
        {"work_order_id": wo_id, "status": {"$in": ["assembled", "acknowledged"]}}
    )
    supersedes_id = None
    if prev:
        supersedes_id = str(prev["_id"])
        await db.copilot_briefings.update_one(
            {"_id": prev["_id"]},
            {"$set": {"status": "superseded", "updated_at": _now()}},
        )

    sections = await _assemble_sections(db, wo)

    now = _now()
    doc = {
        "tenant_id": user.tenant_id,
        "work_order_id": wo_id,
        "assembled_at": now,
        "assembled_by": user.user_id,
        "site_bible_summary": sections["site_bible_summary"],
        "device_bible": sections["device_bible"],
        "history": sections["history"],
        "parts_estimate": sections["parts_estimate"],
        "coordinator_notes": None,
        "status": "assembled",
        "acknowledged_at": None,
        "acknowledged_by": None,
        "supersedes_id": supersedes_id,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    result = await db.copilot_briefings.insert_one(doc)
    doc["_id"] = result.inserted_id

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="copilot_briefing.assemble",
        entity_refs=[
            {"collection": "work_orders", "id": wo_id, "label": wo.get("reference")},
            {"collection": "copilot_briefings", "id": str(result.inserted_id)},
        ],
        context_snapshot={
            "supersedes_id": supersedes_id,
            "history_count": len(sections["history"]),
        },
    )

    return _serialize(doc)


@router.get("")
async def get_briefing(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    """Active briefing. Visible to SRS coord + assigned tech. Returns {exists:false} if none."""
    db = get_db()
    wo = await _load_wo(db, wo_id, user)

    # Tech must be the assigned tech
    if user.has_space("tech_field") and not user.has_space("srs_coordinators"):
        if wo.get("assigned_tech_user_id") != user.user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your work order")

    # Clients don't see the briefing (internal coord material)
    if user.has_space("client_coordinator") and not (
        user.has_space("srs_coordinators") or user.has_space("tech_field")
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Briefings are internal")

    doc = await db.copilot_briefings.find_one(
        {
            "work_order_id": wo_id,
            "tenant_id": user.tenant_id,
            "status": {"$in": ["assembled", "acknowledged"]},
        }
    )
    if not doc:
        return {"exists": False, "work_order_id": wo_id}
    return {"exists": True, **_serialize(doc)}


class CoordinatorNotesBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coordinator_notes: str | None = None


@router.patch("")
async def patch_briefing(
    wo_id: str,
    body: CoordinatorNotesBody,
    user: CurrentUser = Depends(get_current_user),
):
    """SRS enriches the assembled briefing with coordinator_notes before ack."""
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS can edit briefing")
    db = get_db()
    wo = await _load_wo(db, wo_id, user)
    doc = await db.copilot_briefings.find_one(
        {
            "work_order_id": wo_id,
            "tenant_id": user.tenant_id,
            "status": {"$in": ["assembled", "acknowledged"]},
        }
    )
    if not doc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No active briefing — assemble first",
        )

    now = _now()
    await db.copilot_briefings.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "coordinator_notes": body.coordinator_notes,
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )
    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="copilot_briefing.patch_notes",
        entity_refs=[
            {"collection": "work_orders", "id": wo_id, "label": wo.get("reference")},
            {"collection": "copilot_briefings", "id": str(doc["_id"])},
        ],
        context_snapshot={
            "has_notes": body.coordinator_notes is not None,
            "length": len(body.coordinator_notes or ""),
        },
    )

    refreshed = await db.copilot_briefings.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


@router.post("/acknowledge")
async def acknowledge_briefing(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    """
    The assigned tech confirms they read the briefing. Required for
    advance dispatched -> en_route.
    """
    db = get_db()
    wo = await _load_wo(db, wo_id, user)

    if wo.get("assigned_tech_user_id") != user.user_id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only the assigned tech can acknowledge"
        )

    doc = await db.copilot_briefings.find_one({
        "work_order_id": wo_id,
        "tenant_id": user.tenant_id,
        "status": "assembled",
    })
    if not doc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No assembled briefing to acknowledge — ask SRS to assemble first",
        )

    now = _now()
    await db.copilot_briefings.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "acknowledged",
                "acknowledged_at": now,
                "acknowledged_by": user.user_id,
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="copilot_briefing.acknowledge",
        entity_refs=[
            {"collection": "work_orders", "id": wo_id, "label": wo.get("reference")},
            {"collection": "copilot_briefings", "id": str(doc["_id"])},
        ],
        context_snapshot={},
    )

    refreshed = await db.copilot_briefings.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


# ---------------- Helper used by work_orders.advance guard ----------------

async def briefing_acknowledged_by(db, wo: dict, user_id: str) -> bool:
    """True iff there is an acknowledged briefing for this WO, signed by `user_id`."""
    doc = await db.copilot_briefings.find_one({
        "work_order_id": str(wo["_id"]),
        "tenant_id": wo["tenant_id"],
        "status": "acknowledged",
        "acknowledged_by": user_id,
    })
    return doc is not None
