"""
InsiteIQ v1 Modo 2 — Equipment plan + scan + reconciliation (Decision #4)

Sources aceptadas (caos upstream):
  A. Excel cliente (parseado a JSON upstream)
  B. Email alias intake (LLM parsing futuro)
  C. Upload portal (CSV raw acepta header aliasing)
  D. Scan tech PWA onsite (realidad gana)

Reconciliation statuses:
  match / substituted / missing / sin_plan / conflicto

Endpoints:
  POST  /api/projects/{pid}/equipment-plan              bulk upload plan entries (SRS)
  GET   /api/projects/{pid}/equipment-plan              list plan entries
  POST  /api/sites/{sid}/equipment/scan                 tech onsite scan (creates asset + event)
  POST  /api/projects/{pid}/reconcile                   run reconciliation
  GET   /api/projects/{pid}/reconciliation              get reconciliation report (SRS + client)
"""
from datetime import datetime, timezone
from typing import Any, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.models.equipment_plan import PlanSource

router = APIRouter(tags=["equipment"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


# -------------------- Plan bulk upload --------------------

class PlanEntryIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    site_id: str | None = None          # if none, project-wide pool
    serial_number: str | None = None    # may be absent at plan time
    asset_tag: str | None = None
    make: str | None = None
    model: str | None = None
    category: str | None = None
    notes: str | None = None


class BulkPlanBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    source: PlanSource
    entries: list[PlanEntryIn] = Field(default_factory=list)
    bulk_upload_event_id: str | None = None  # link to the site-bulk event if applicable


@router.post(
    "/projects/{project_id}/equipment-plan", status_code=status.HTTP_201_CREATED,
)
async def bulk_plan(
    project_id: str,
    body: BulkPlanBody,
    user: CurrentUser = Depends(get_current_user),
):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS coord")
    if not body.entries:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "At least one entry required")

    db = get_db()
    try:
        p = await db.projects.find_one(
            {"_id": ObjectId(project_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        p = None
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    now = _now()
    docs = []
    for e in body.entries:
        docs.append({
            "tenant_id": user.tenant_id,
            "project_id": project_id,
            "site_id": e.site_id,
            "serial_number": e.serial_number,
            "asset_tag": e.asset_tag,
            "make": e.make,
            "model": e.model,
            "category": e.category,
            "source": body.source,
            "bulk_upload_event_id": body.bulk_upload_event_id,
            "status": "planned",
            "reconciled_at": None,
            "reconciled_with_asset_id": None,
            "reconciliation_note": None,
            "notes": e.notes,
            "created_at": now,
            "updated_at": now,
            "created_by": user.user_id,
            "updated_by": user.user_id,
        })
    result = await db.equipment_plan_entries.insert_many(docs)

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="equipment_plan.bulk_upload",
        entity_refs=[{"collection": "projects", "id": project_id, "label": p.get("code")}],
        context_snapshot={
            "source": body.source,
            "entries_count": len(body.entries),
            "bulk_upload_event_id": body.bulk_upload_event_id,
        },
    )

    return {"inserted": len(result.inserted_ids), "ids": [str(i) for i in result.inserted_ids]}


@router.get("/projects/{project_id}/equipment-plan")
async def list_plan(
    project_id: str, user: CurrentUser = Depends(get_current_user)
):
    db = get_db()
    docs = await db.equipment_plan_entries.find(
        {"tenant_id": user.tenant_id, "project_id": project_id}
    ).sort("created_at", 1).to_list(1000)
    return [_serialize(d) for d in docs]


# -------------------- Scan onsite (tech PWA) --------------------

class ScanBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    serial_number: str
    asset_tag: str | None = None
    make: str | None = None
    model: str | None = None
    category: str | None = None
    notes: str | None = None


@router.post("/sites/{site_id}/equipment/scan", status_code=status.HTTP_201_CREATED)
async def scan_equipment(
    site_id: str,
    body: ScanBody,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Tech scans a serial onsite. Creates asset if not exists (Domain 11) +
    asset_event type='inspected'. If asset exists but was at a different site,
    it creates a 'relocated' event. Tech must have an active WO at this site
    OR be SRS coord.
    """
    db = get_db()

    try:
        site = await db.sites.find_one(
            {"_id": ObjectId(site_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        site = None
    if not site:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Site not found")

    # Authz: SRS coord OR tech_field con WO asignada en este site
    authorized = user.has_space("srs_coordinators")
    if not authorized and user.has_space("tech_field"):
        wo_exists = await db.work_orders.find_one({
            "tenant_id": user.tenant_id,
            "site_id": site_id,
            "assigned_tech_user_id": user.user_id,
            "status": {"$nin": ["closed", "cancelled"]},
        })
        authorized = wo_exists is not None
    if not authorized:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No active WO at this site")

    now = _now()
    org_id = site["organization_id"]

    # Upsert asset
    existing = await db.assets.find_one({
        "tenant_id": user.tenant_id,
        "organization_id": org_id,
        "serial_number": body.serial_number,
    })

    if existing:
        # Move if at different site, else just inspected
        event_type = "relocated" if existing.get("current_site_id") != site_id else "inspected"
        await db.assets.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "current_site_id": site_id,
                "status": "active",
                "asset_tag": body.asset_tag or existing.get("asset_tag"),
                "make": body.make or existing.get("make"),
                "model": body.model or existing.get("model"),
                "category": body.category or existing.get("category", "other"),
                "updated_at": now,
                "updated_by": user.user_id,
            }},
        )
        asset_id = str(existing["_id"])
    else:
        category = body.category or "other"
        asset_doc = {
            "tenant_id": user.tenant_id,
            "organization_id": org_id,
            "serial_number": body.serial_number,
            "asset_tag": body.asset_tag,
            "category": category,
            "make": body.make,
            "model": body.model,
            "value_usd": None,
            "value_is_estimated": False,
            "current_site_id": site_id,
            "status": "active",
            "lifecycle_stage": "deployed",
            "ownership": {
                "type": "client_owned",
                "acquired_by": None, "cost_to_srs": None,
                "markup_pct": None, "transfer_price": None,
                "transfer_date": None, "invoice_ref": None,
            },
            "warranty": None,
            "notes": None,
            "created_at": now, "updated_at": now,
            "created_by": user.user_id, "updated_by": user.user_id,
        }
        ins = await db.assets.insert_one(asset_doc)
        asset_id = str(ins.inserted_id)
        event_type = "installed"

    # asset_event (append-only, Visibility Model C — scan defaults to public)
    await db.asset_events.insert_one({
        "tenant_id": user.tenant_id,
        "asset_id": asset_id,
        "event_type": event_type,
        "intervention_id": None,
        "performed_by": user.user_id,
        "site_id": site_id,
        "ts": now,
        "data": {
            "scanned_by_tech": True,
            "asset_tag": body.asset_tag,
            "make": body.make,
            "model": body.model,
        },
        "notes": body.notes,
        "visibility": "public",
        "created_at": now, "updated_at": now,
        "created_by": user.user_id, "updated_by": user.user_id,
    })

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action=f"equipment.scan.{event_type}",
        entity_refs=[
            {"collection": "sites", "id": site_id, "label": site.get("code")},
            {"collection": "assets", "id": asset_id, "label": body.serial_number},
        ],
        context_snapshot={
            "serial_number": body.serial_number,
            "event_type": event_type,
            "was_new": not existing,
        },
    )

    return {
        "asset_id": asset_id,
        "serial_number": body.serial_number,
        "event_type": event_type,
        "site_id": site_id,
    }


# -------------------- Reconciliation --------------------

@router.post("/projects/{project_id}/reconcile")
async def reconcile_project(
    project_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Run reconciliation across planned entries vs actual scanned assets.
    Updates plan entries with status: match / substituted / missing / sin_plan /
    conflicto. Returns summary.
    """
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS coord")

    db = get_db()
    try:
        p = await db.projects.find_one(
            {"_id": ObjectId(project_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        p = None
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    client_org_id = p["client_organization_id"]

    # Project's sites — query sites belonging to the client org referenced by this project.
    # (For this v1 scope, all plan entries should point to sites we know.)
    plan = await db.equipment_plan_entries.find({
        "tenant_id": user.tenant_id,
        "project_id": project_id,
        "status": {"$in": ["planned", "match", "substituted", "missing", "conflicto"]},
    }).to_list(5000)

    project_site_ids: set[str] = set()
    for pe in plan:
        if pe.get("site_id"):
            project_site_ids.add(pe["site_id"])

    # Scans: assets at any site of this project's client, via assets collection
    scans = await db.assets.find({
        "tenant_id": user.tenant_id,
        "organization_id": client_org_id,
        "current_site_id": {"$in": list(project_site_ids)} if project_site_ids else {"$ne": None},
    }).to_list(5000)

    # Build lookup
    plan_by_serial: dict[str, dict] = {
        p["serial_number"]: p for p in plan if p.get("serial_number")
    }
    plan_unsidentified_at_site: dict[str, list[dict]] = {}  # site_id -> [plan entries without serial]
    for pe in plan:
        if not pe.get("serial_number") and pe.get("site_id"):
            plan_unsidentified_at_site.setdefault(pe["site_id"], []).append(pe)

    scan_by_serial: dict[str, dict] = {
        a["serial_number"]: a for a in scans if a.get("serial_number")
    }

    counts = {"match": 0, "substituted": 0, "missing": 0, "sin_plan": 0, "conflicto": 0}
    ops: list[tuple[dict, str, str | None, str | None]] = []
    # ops: (plan_doc, status, reconciled_with_asset_id, note)

    # For each planned serial
    for serial, pe in plan_by_serial.items():
        scan = scan_by_serial.get(serial)
        if scan is None:
            # Planned but not scanned. Maybe there's a substitution at the site
            # (equivalent make+model scanned, no-serial plan might match too).
            if pe.get("site_id"):
                equivalent = None
                for a in scans:
                    if (a.get("current_site_id") == pe.get("site_id")
                            and a.get("make") == pe.get("make")
                            and a.get("model") == pe.get("model")
                            and a.get("serial_number") not in plan_by_serial):
                        equivalent = a
                        break
                if equivalent:
                    ops.append((pe, "substituted", str(equivalent["_id"]),
                                f"Planned serial {serial} not found but equivalent "
                                f"{equivalent.get('serial_number')} scanned at same site"))
                    counts["substituted"] += 1
                    continue
            ops.append((pe, "missing", None, "Planned serial not scanned anywhere"))
            counts["missing"] += 1
            continue

        # Scan exists
        if scan.get("current_site_id") == pe.get("site_id"):
            ops.append((pe, "match", str(scan["_id"]), None))
            counts["match"] += 1
        else:
            ops.append((pe, "conflicto", str(scan["_id"]),
                        f"Planned for site {pe.get('site_id')} but scanned at "
                        f"{scan.get('current_site_id')}"))
            counts["conflicto"] += 1

    # Scans with no plan entry → sin_plan
    planned_serials = set(plan_by_serial.keys())
    sin_plan_assets: list[str] = []
    for a in scans:
        if a.get("serial_number") and a["serial_number"] not in planned_serials:
            # Could also match with unidentified plan at that site (substitution),
            # already considered above for planned serials. Here we list as sin_plan.
            counts["sin_plan"] += 1
            sin_plan_assets.append(str(a["_id"]))

    # Apply updates
    now = _now()
    for pe, new_status, asset_ref, note in ops:
        await db.equipment_plan_entries.update_one(
            {"_id": pe["_id"]},
            {"$set": {
                "status": new_status,
                "reconciled_at": now,
                "reconciled_with_asset_id": asset_ref,
                "reconciliation_note": note,
                "updated_at": now,
                "updated_by": user.user_id,
            }},
        )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="project.reconcile",
        entity_refs=[{"collection": "projects", "id": project_id, "label": p.get("code")}],
        context_snapshot={
            "counts": counts,
            "total_plan": len(plan),
            "total_scanned": len(scans),
        },
    )

    return {
        "project_id": project_id,
        "reconciled_at": now,
        "plan_count": len(plan),
        "scan_count": len(scans),
        "counts": counts,
        "sin_plan_asset_ids": sin_plan_assets,
    }


@router.get("/projects/{project_id}/reconciliation")
async def get_reconciliation(
    project_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Returns current reconciliation state (plan entries + their resolution)."""
    db = get_db()
    # Scope project via project route semantics (SRS or client-same-org)
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid project id")
    q: dict[str, Any] = {"_id": oid, "tenant_id": user.tenant_id}
    if not user.has_space("srs_coordinators"):
        if user.has_space("client_coordinator"):
            m = user.membership_in("client_coordinator")
            if not m or not m.get("organization_id"):
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
            q["client_organization_id"] = m["organization_id"]
        else:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    p = await db.projects.find_one(q)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    plan = await db.equipment_plan_entries.find({
        "tenant_id": user.tenant_id,
        "project_id": project_id,
    }).sort("site_id", 1).to_list(5000)

    # Counts by status
    counts: dict[str, int] = {}
    for pe in plan:
        counts[pe["status"]] = counts.get(pe["status"], 0) + 1

    return {
        "project_id": project_id,
        "project_code": p.get("code"),
        "plan_entries": [_serialize(pe) for pe in plan],
        "counts": counts,
    }
