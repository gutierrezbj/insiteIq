"""
InsiteIQ v1 Modo 2 — Project routes (rollout + dashboard + clusters + bulk upload)

Modo 2 es capa de orquestacion sobre Modo 1. Un project agrupa N work_orders
y expone dashboards (BUMM KPIs + Command Center). Clusters organizan sites
por semana/ruta/tech. Bulk upload acepta data del cliente y la vuelve sites
(Excel cliente es autoritativo, sub-uploads con changelog).

Endpoints:
  POST   /api/projects                              — create (SRS)
  GET    /api/projects                              — list
  GET    /api/projects/{id}                         — detail
  PATCH  /api/projects/{id}                         — update
  GET    /api/projects/{id}/dashboard               — BUMM KPIs + status buckets
  GET    /api/projects/{id}/work-orders             — WOs in this project

Clusters:
  POST   /api/projects/{id}/clusters                — create cluster_group
  GET    /api/projects/{id}/clusters                — list
  POST   /api/projects/{id}/clusters/{cid}/activate — activation_event (cliente activa)

Bulk upload:
  POST   /api/projects/{id}/bulk-upload             — parse sites from client data
  GET    /api/projects/{id}/bulk-uploads            — history (changelog audit)
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.models.project import (
    BulkUploadSource,
    DeliveryChainTier,
    ProjectStatus,
    ProjectType,
    DeliveryPattern,
)

router = APIRouter(tags=["projects"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def _load_project(db, project_id: str, user: CurrentUser) -> dict:
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid project id")

    q: dict[str, Any] = {"_id": oid, "tenant_id": user.tenant_id}

    # Scope: SRS all; client_coord only their own org's projects; tech only
    # projects with at least one WO assigned to them (handled differently below)
    if not user.has_space("srs_coordinators"):
        if user.has_space("client_coordinator"):
            m = user.membership_in("client_coordinator")
            if not m or not m.get("organization_id"):
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
            q["client_organization_id"] = m["organization_id"]
        elif user.has_space("tech_field"):
            # Allow if tech is assigned to at least one WO in this project
            p = await db.projects.find_one({"_id": oid, "tenant_id": user.tenant_id})
            if not p:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
            has_wo = await db.work_orders.find_one(
                {
                    "tenant_id": user.tenant_id,
                    "project_id": project_id,
                    "assigned_tech_user_id": user.user_id,
                }
            )
            if not has_wo:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "No assigned WO in project")
            return p

    p = await db.projects.find_one(q)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return p


# ---------------- Request bodies ----------------

class CreateProjectBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: ProjectType
    delivery_pattern: DeliveryPattern = "single_job"
    code: str
    title: str
    description: str | None = None
    client_organization_id: str
    service_agreement_id: str
    srs_entity_id: str | None = None
    po_number: str | None = None
    end_client_organization_id: str | None = None
    delivery_chain: list[DeliveryChainTier] = Field(default_factory=list)
    cluster_lead_user_id: str | None = None
    field_senior_user_id: str | None = None
    srs_coordinator_user_id: str | None = None
    total_sites_target: int | None = None
    playbook_template: str | None = None
    start_date: datetime | None = None
    target_end_date: datetime | None = None
    summary: str | None = None
    metadata: dict = Field(default_factory=dict)


class PatchProjectBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str | None = None
    description: str | None = None
    status: ProjectStatus | None = None
    cluster_lead_user_id: str | None = None
    field_senior_user_id: str | None = None
    srs_coordinator_user_id: str | None = None
    total_sites_target: int | None = None
    playbook_template: str | None = None
    start_date: datetime | None = None
    target_end_date: datetime | None = None
    actual_end_date: datetime | None = None
    summary: str | None = None
    metadata: dict | None = None


# ---------------- Project CRUD ----------------

@router.post("/projects", status_code=status.HTTP_201_CREATED)
async def create_project(
    body: CreateProjectBody, user: CurrentUser = Depends(get_current_user)
):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS coord can create projects")
    db = get_db()

    # Validate references
    try:
        sa = await db.service_agreements.find_one(
            {"_id": ObjectId(body.service_agreement_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        sa = None
    if not sa:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "service_agreement not found")
    if sa["organization_id"] != body.client_organization_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Agreement org mismatch")

    now = _now()
    doc: dict[str, Any] = {
        "tenant_id": user.tenant_id,
        "type": body.type,
        "delivery_pattern": body.delivery_pattern,
        "code": body.code,
        "title": body.title,
        "description": body.description,
        "client_organization_id": body.client_organization_id,
        "service_agreement_id": body.service_agreement_id,
        "srs_entity_id": body.srs_entity_id,
        "po_number": body.po_number,
        "end_client_organization_id": body.end_client_organization_id,
        "delivery_chain": [t.model_dump() for t in body.delivery_chain],
        "cluster_lead_user_id": body.cluster_lead_user_id,
        "field_senior_user_id": body.field_senior_user_id,
        "srs_coordinator_user_id": body.srs_coordinator_user_id or user.user_id,
        "total_sites_target": body.total_sites_target,
        "playbook_template": body.playbook_template,
        "status": "draft",
        "start_date": body.start_date,
        "target_end_date": body.target_end_date,
        "actual_end_date": None,
        "summary": body.summary,
        "metadata": body.metadata,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    try:
        result = await db.projects.insert_one(doc)
    except Exception as e:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Could not create: {e}")
    doc["_id"] = result.inserted_id

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="project.create",
        entity_refs=[{"collection": "projects", "id": str(result.inserted_id), "label": body.code}],
        context_snapshot={
            "type": body.type,
            "delivery_pattern": body.delivery_pattern,
            "client_organization_id": body.client_organization_id,
            "total_sites_target": body.total_sites_target,
        },
    )
    return _serialize(doc)


@router.get("/projects")
async def list_projects(
    type_filter: str | None = None,
    status_filter: str | None = None,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_db()
    q: dict[str, Any] = {"tenant_id": user.tenant_id}

    if not user.has_space("srs_coordinators"):
        if user.has_space("client_coordinator"):
            m = user.membership_in("client_coordinator")
            if m and m.get("organization_id"):
                q["client_organization_id"] = m["organization_id"]
            else:
                return []
        elif user.has_space("tech_field"):
            # Projects where tech has at least one assigned WO
            project_ids = await db.work_orders.distinct(
                "project_id",
                {"tenant_id": user.tenant_id, "assigned_tech_user_id": user.user_id},
            )
            project_ids = [pid for pid in project_ids if pid]
            if not project_ids:
                return []
            q["_id"] = {"$in": [ObjectId(p) for p in project_ids]}

    if type_filter:
        q["type"] = type_filter
    if status_filter:
        q["status"] = status_filter

    docs = await db.projects.find(q).sort("created_at", -1).limit(200).to_list(None)
    return [_serialize(d) for d in docs]


@router.get("/projects/{project_id}")
async def get_project(project_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    doc = await _load_project(db, project_id, user)
    return _serialize(doc)


@router.patch("/projects/{project_id}")
async def patch_project(
    project_id: str,
    body: PatchProjectBody,
    user: CurrentUser = Depends(get_current_user),
):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS coord")
    db = get_db()
    doc = await _load_project(db, project_id, user)

    set_fields = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    set_fields["updated_at"] = _now()
    set_fields["updated_by"] = user.user_id

    await db.projects.update_one({"_id": doc["_id"]}, {"$set": set_fields})

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="project.patch",
        entity_refs=[{"collection": "projects", "id": project_id, "label": doc.get("code")}],
        context_snapshot={"fields": list(set_fields.keys())},
    )

    refreshed = await db.projects.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


# ---------------- Dashboard (BUMM KPIs) ----------------

@router.get("/projects/{project_id}/dashboard")
async def project_dashboard(project_id: str, user: CurrentUser = Depends(get_current_user)):
    """
    BUMM dashboard data. Returns KPI cards + status buckets + recent activity.
    Decision #5: 7 exec-facing KPIs + burndown as visual.
    """
    db = get_db()
    p = await _load_project(db, project_id, user)

    # Aggregate work_orders by status
    pipeline = [
        {"$match": {"tenant_id": user.tenant_id, "project_id": project_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    buckets = {r["_id"]: r["count"] async for r in db.work_orders.aggregate(pipeline)}

    total_wos = sum(buckets.values())
    completed = buckets.get("closed", 0)
    active = total_wos - completed - buckets.get("cancelled", 0)
    target = p.get("total_sites_target") or total_wos or 1

    # Progress %
    progress_pct = round((completed / target) * 100, 1) if target else 0.0

    # Incidents (high/critical not closed)
    incidents_active = await db.work_orders.count_documents({
        "tenant_id": user.tenant_id,
        "project_id": project_id,
        "severity": {"$in": ["high", "critical"]},
        "status": {"$nin": ["closed", "cancelled"]},
    })

    # Throughput last 7 days (closed)
    seven_ago = _now() - timedelta(days=7)
    throughput_week = await db.work_orders.count_documents({
        "tenant_id": user.tenant_id,
        "project_id": project_id,
        "status": "closed",
        "closed_at": {"$gte": seven_ago},
    })

    # SLA compliance: of closed WOs, how many within deadline_resolve_at
    sla_pipeline = [
        {"$match": {
            "tenant_id": user.tenant_id,
            "project_id": project_id,
            "status": "closed",
            "closed_at": {"$ne": None},
            "deadline_resolve_at": {"$ne": None},
        }},
        {"$project": {
            "within_sla": {"$lte": ["$closed_at", "$deadline_resolve_at"]},
        }},
        {"$group": {
            "_id": "$within_sla",
            "count": {"$sum": 1},
        }},
    ]
    sla_rows = [r async for r in db.work_orders.aggregate(sla_pipeline)]
    sla_ok = next((r["count"] for r in sla_rows if r["_id"] is True), 0)
    sla_total = sum(r["count"] for r in sla_rows)
    sla_pct = round((sla_ok / sla_total) * 100, 1) if sla_total else None

    # First-time-right: count WOs with no re-open loops (proxied: no advances back to triage)
    # Simple proxy: closed WOs whose ticket_thread doesn't have system_event with from='resolved' to='on_site'
    # For Fase 2 first pass we'll skip this and return None; future commit computes properly.
    first_time_right_pct = None

    # On-schedule: if target_end_date is set, compare current pace vs target
    on_schedule_pct = None
    if p.get("target_end_date") and p.get("start_date"):
        try:
            start = p["start_date"]
            end = p["target_end_date"]
            now = _now()
            elapsed_frac = max(0.0, min(1.0, (now - start).total_seconds() / max(1, (end - start).total_seconds())))
            completion_frac = completed / target if target else 0
            on_schedule_pct = round(completion_frac / elapsed_frac * 100, 1) if elapsed_frac > 0 else None
        except Exception:
            on_schedule_pct = None

    # ETA to 100%: based on throughput_week
    eta_100pct = None
    if throughput_week > 0:
        remaining = max(0, target - completed)
        weeks_remaining = remaining / throughput_week
        eta_100pct = round(weeks_remaining, 1)

    # Cluster progress
    clusters = await db.cluster_groups.find(
        {"tenant_id": user.tenant_id, "project_id": project_id}
    ).to_list(None)
    cluster_summary = [
        {
            "id": str(c["_id"]),
            "code": c.get("code"),
            "title": c.get("title"),
            "status": c.get("status"),
            "site_count": len(c.get("site_ids") or []),
        }
        for c in clusters
    ]

    return {
        "project_id": project_id,
        "project_code": p.get("code"),
        "project_title": p.get("title"),
        "type": p.get("type"),
        "status": p.get("status"),
        "total_sites_target": target,
        "work_orders": {
            "total": total_wos,
            "completed": completed,
            "active": active,
            "cancelled": buckets.get("cancelled", 0),
            "by_status": buckets,
        },
        "kpis": {
            "progress_pct": progress_pct,
            "on_schedule_pct": on_schedule_pct,
            "sla_compliance_pct": sla_pct,
            "first_time_right_pct": first_time_right_pct,
            "throughput_week": throughput_week,
            "eta_to_100pct_weeks": eta_100pct,
            "incidents_active": incidents_active,
        },
        "clusters": cluster_summary,
        "generated_at": _now(),
    }


@router.get("/projects/{project_id}/work-orders")
async def project_work_orders(
    project_id: str,
    status_filter: str | None = None,
    limit: int = 500,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_db()
    p = await _load_project(db, project_id, user)
    q: dict[str, Any] = {
        "tenant_id": user.tenant_id,
        "project_id": project_id,
    }

    # Tech sees only their assigned WOs within project
    if user.has_space("tech_field") and not user.has_space("srs_coordinators"):
        q["assigned_tech_user_id"] = user.user_id

    if status_filter:
        q["status"] = status_filter

    docs = await db.work_orders.find(q).sort("created_at", -1).limit(min(limit, 1000)).to_list(None)
    return [_serialize(d) for d in docs]


# ---------------- Cluster Groups ----------------

class CreateClusterBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    code: str
    title: str
    cluster_lead_user_id: str | None = None
    field_senior_user_id: str | None = None
    assigned_tech_user_id: str | None = None
    site_ids: list[str] = Field(default_factory=list)
    target_start_date: datetime | None = None
    target_end_date: datetime | None = None


@router.post("/projects/{project_id}/clusters", status_code=status.HTTP_201_CREATED)
async def create_cluster(
    project_id: str, body: CreateClusterBody, user: CurrentUser = Depends(get_current_user)
):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS coord")
    db = get_db()
    await _load_project(db, project_id, user)

    now = _now()
    doc = {
        "tenant_id": user.tenant_id,
        "project_id": project_id,
        **body.model_dump(),
        "status": "proposed",
        "activated_at": None,
        "activated_by": None,
        "completed_at": None,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    try:
        result = await db.cluster_groups.insert_one(doc)
    except Exception as e:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cluster code conflict: {e}")
    doc["_id"] = result.inserted_id

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="cluster_group.create",
        entity_refs=[
            {"collection": "projects", "id": project_id},
            {"collection": "cluster_groups", "id": str(result.inserted_id), "label": body.code},
        ],
        context_snapshot={"site_count": len(body.site_ids)},
    )
    return _serialize(doc)


@router.get("/projects/{project_id}/clusters")
async def list_clusters(project_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    await _load_project(db, project_id, user)
    docs = await db.cluster_groups.find(
        {"tenant_id": user.tenant_id, "project_id": project_id}
    ).sort("code", 1).to_list(200)
    return [_serialize(d) for d in docs]


@router.post("/projects/{project_id}/clusters/{cluster_id}/activate")
async def activate_cluster(
    project_id: str,
    cluster_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Activation event. SRS (or cliente con acuerdo) activa el cluster cuando
    los sites estan listos para desplegarse. Regla dura Modo 2: accept
    explicito del cluster_lead SRS requerido antes de dispatch de sus WOs.
    """
    db = get_db()
    p = await _load_project(db, project_id, user)
    try:
        c_oid = ObjectId(cluster_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid cluster id")

    c = await db.cluster_groups.find_one(
        {"_id": c_oid, "project_id": project_id, "tenant_id": user.tenant_id}
    )
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cluster not found")
    if c["status"] != "proposed":
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cluster already {c['status']}")

    # Regla dura: solo cluster_lead SRS puede activar (o cualquier SRS coord)
    if not user.has_space("srs_coordinators"):
        # Client could also activate if they have the role — for v1 we restrict to SRS
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS can activate clusters in v1")

    now = _now()
    await db.cluster_groups.update_one(
        {"_id": c_oid},
        {
            "$set": {
                "status": "activated",
                "activated_at": now,
                "activated_by": user.user_id,
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="cluster_group.activate",
        entity_refs=[
            {"collection": "projects", "id": project_id, "label": p.get("code")},
            {"collection": "cluster_groups", "id": cluster_id, "label": c.get("code")},
        ],
        context_snapshot={"site_count": len(c.get("site_ids") or [])},
    )

    refreshed = await db.cluster_groups.find_one({"_id": c_oid})
    return _serialize(refreshed)


# ---------------- Bulk upload (sites ingest) ----------------

class BulkUploadSiteEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    code: str
    name: str
    country: str
    city: str | None = None
    address: str | None = None
    timezone: str | None = None
    has_physical_resident: bool = False
    notes: str | None = None


class BulkUploadBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    source: BulkUploadSource
    original_filename: str | None = None
    raw_content_inline: str | None = None
    sites: list[BulkUploadSiteEntry]


@router.post("/projects/{project_id}/bulk-upload", status_code=status.HTTP_201_CREATED)
async def bulk_upload(
    project_id: str,
    body: BulkUploadBody,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Accept pre-parsed sites from client data (Excel/email/upload/paste).
    For v1 Fase 2 first pass: body is a JSON list of sites.
    CSV/XLS parsing + LLM mapping come in a subsequent commit.
    Regla dura: Excel del cliente es autoritativo. Este upload crea sites y
    registra el evento con changelog (supersede cuando hay re-uploads).
    """
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS coord")
    db = get_db()
    p = await _load_project(db, project_id, user)
    client_org_id = p["client_organization_id"]

    # Previous upload to supersede?
    prev = await db.bulk_upload_events.find_one(
        {"tenant_id": user.tenant_id, "project_id": project_id, "status": "applied"},
        sort=[("received_at", -1)],
    )
    supersedes_id = str(prev["_id"]) if prev else None

    now = _now()
    sites_created = 0
    sites_updated = 0
    changelog: list[dict] = []

    for entry in body.sites:
        existing = await db.sites.find_one({
            "tenant_id": user.tenant_id,
            "organization_id": client_org_id,
            "code": entry.code,
        })
        if existing:
            # Update fields, log changelog
            changes = {}
            for field in ("name", "city", "address", "timezone",
                          "has_physical_resident", "notes"):
                new_val = getattr(entry, field)
                old_val = existing.get(field)
                if new_val is not None and new_val != old_val:
                    changes[field] = {"from": old_val, "to": new_val}
            if changes:
                await db.sites.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {**{k: v["to"] for k, v in changes.items()}, "updated_at": now}},
                )
                changelog.append({"site_code": entry.code, "action": "updated", "changes": changes})
                sites_updated += 1
        else:
            await db.sites.insert_one({
                "tenant_id": user.tenant_id,
                "organization_id": client_org_id,
                "code": entry.code,
                "name": entry.name,
                "country": entry.country,
                "city": entry.city,
                "address": entry.address,
                "timezone": entry.timezone,
                "has_physical_resident": entry.has_physical_resident,
                "notes": entry.notes,
                "status": "active",
                "created_at": now,
                "updated_at": now,
                "created_by": user.user_id,
                "updated_by": user.user_id,
            })
            changelog.append({"site_code": entry.code, "action": "created"})
            sites_created += 1

    event_doc = {
        "tenant_id": user.tenant_id,
        "project_id": project_id,
        "source": body.source,
        "received_at": now,
        "received_by": user.user_id,
        "original_filename": body.original_filename,
        "raw_content_ref": None,
        "raw_content_inline": body.raw_content_inline[:8000] if body.raw_content_inline else None,
        "rows_parsed": len(body.sites),
        "sites_created": sites_created,
        "sites_updated": sites_updated,
        "equipment_entries": 0,
        "parsing_notes": [],
        "supersedes_event_id": supersedes_id,
        "changelog": changelog,
        "status": "applied",
        "error_message": None,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    result = await db.bulk_upload_events.insert_one(event_doc)
    event_doc["_id"] = result.inserted_id

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="bulk_upload.apply",
        entity_refs=[
            {"collection": "projects", "id": project_id, "label": p.get("code")},
            {"collection": "bulk_upload_events", "id": str(result.inserted_id)},
        ],
        context_snapshot={
            "source": body.source,
            "rows_parsed": len(body.sites),
            "sites_created": sites_created,
            "sites_updated": sites_updated,
            "supersedes": supersedes_id,
        },
    )

    return _serialize(event_doc)


@router.get("/projects/{project_id}/bulk-uploads")
async def list_bulk_uploads(project_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    await _load_project(db, project_id, user)
    docs = await db.bulk_upload_events.find(
        {"tenant_id": user.tenant_id, "project_id": project_id}
    ).sort("received_at", -1).to_list(100)
    return [_serialize(d) for d in docs]
