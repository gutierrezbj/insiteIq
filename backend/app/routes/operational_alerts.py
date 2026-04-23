"""
InsiteIQ v1 — OperationalAlerts routes (Pasito Z-b · Cockpit).

Endpoints:
  GET    /api/alerts              list con filtros · scoped por espacio
  POST   /api/alerts              create · SRS only
  POST   /api/alerts/:id/ack      acknowledge · coord (SRS o client)
  POST   /api/alerts/:id/resolve  resolve · SRS (o client si ball_in_court=client)
  POST   /api/alerts/:id/dismiss  dismiss · SRS
  GET    /api/alerts/active/summary  panel rápido cockpit · counts + recientes

Scoping:
  - SRS ve todo dentro del tenant
  - Client solo ve alertas con scope_ref.organization_id match en sus orgs
  - Tech solo ve alertas scope=tech con tech_user_id == él, o scope=wo
    de una WO que tiene asignada
"""
from datetime import datetime, timezone
from typing import Any, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.models.operational_alert import (
    AlertBall,
    AlertKind,
    AlertScope,
    AlertScopeRef,
    AlertSeverity,
    AlertSource,
    OperationalAlert,
)


router = APIRouter(prefix="/alerts", tags=["alerts"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------- helpers ----------------


def _oid(s: str) -> ObjectId:
    try:
        return ObjectId(s)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"invalid id: {s}")


async def _client_org_ids(user: CurrentUser) -> list[str]:
    """Return org IDs the client user belongs to (client space narrowing)."""
    db = get_db()
    u = await db.users.find_one({"_id": _oid(user.user_id)})
    if not u:
        return []
    # client coordinator linked vía default_organization_id + space_memberships
    ids = set()
    if u.get("default_organization_id"):
        ids.add(str(u["default_organization_id"]))
    for m in u.get("space_memberships") or []:
        if m.get("space") == "client_coordinator" and m.get("organization_id"):
            ids.add(str(m["organization_id"]))
    return list(ids)


def _serialize(doc: dict[str, Any]) -> dict[str, Any]:
    out = dict(doc)
    out["id"] = str(out.pop("_id"))
    for k in ("acknowledged_at", "resolved_at", "expires_at", "created_at", "updated_at"):
        v = out.get(k)
        if isinstance(v, datetime):
            out[k] = v.isoformat()
    return out


# ---------------- schemas ----------------


class AlertCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    kind: AlertKind
    severity: AlertSeverity = "info"
    scope: AlertScope = "global"
    scope_ref: AlertScopeRef = Field(default_factory=AlertScopeRef)
    source: AlertSource = "manual"
    ball_in_court: AlertBall = "srs"

    title: str
    message: str
    action_hint: str | None = None

    eta_drift_minutes: int | None = None
    affected_wo_count: int | None = None

    expires_at: datetime | None = None


class AlertResolve(BaseModel):
    model_config = ConfigDict(extra="ignore")
    resolution_note: str | None = None


# ---------------- list (scoped) ----------------


@router.get("")
async def list_alerts(
    user: CurrentUser = Depends(get_current_user),
    status_eq: Literal["active", "acknowledged", "resolved", "dismissed", "all"] = Query("active"),
    scope: AlertScope | None = None,
    kind: AlertKind | None = None,
    organization_id: str | None = None,
    site_id: str | None = None,
    work_order_id: str | None = None,
    limit: int = Query(100, ge=1, le=500),
) -> dict[str, Any]:
    db = get_db()
    q: dict[str, Any] = {"tenant_id": user.tenant_id}
    if status_eq != "all":
        q["status"] = status_eq
    if scope:
        q["scope"] = scope
    if kind:
        q["kind"] = kind
    if organization_id:
        q["scope_ref.organization_id"] = organization_id
    if site_id:
        q["scope_ref.site_id"] = site_id
    if work_order_id:
        q["scope_ref.work_order_id"] = work_order_id

    # Client scoping: only show alerts touching their orgs or global
    if not user.has_space("srs_coordinators"):
        if user.has_space("client_coordinator"):
            org_ids = await _client_org_ids(user)
            q["$or"] = [
                {"scope": "global"},
                {"scope_ref.organization_id": {"$in": org_ids}},
            ]
        elif user.has_space("tech_field"):
            # Tech: global + scope=tech with tech_user_id==me + scope=wo assigned
            assigned_wos = await db.work_orders.find(
                {
                    "tenant_id": user.tenant_id,
                    "assignment.tech_user_id": user.user_id,
                },
                {"_id": 1},
            ).to_list(length=500)
            assigned_ids = [str(w["_id"]) for w in assigned_wos]
            q["$or"] = [
                {"scope": "global"},
                {"scope": "tech", "scope_ref.tech_user_id": user.user_id},
                {"scope": "wo", "scope_ref.work_order_id": {"$in": assigned_ids}},
            ]

    cursor = db.operational_alerts.find(q).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return {"items": [_serialize(d) for d in docs], "count": len(docs)}


# ---------------- summary (cockpit panel) ----------------


@router.get("/active/summary")
async def active_summary(
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    """Fast summary for the cockpit: counts per severity + last 5 active."""
    db = get_db()
    base_q: dict[str, Any] = {
        "tenant_id": user.tenant_id,
        "status": {"$in": ["active", "acknowledged"]},
    }
    # same scoping as list
    if not user.has_space("srs_coordinators"):
        if user.has_space("client_coordinator"):
            org_ids = await _client_org_ids(user)
            base_q["$or"] = [
                {"scope": "global"},
                {"scope_ref.organization_id": {"$in": org_ids}},
            ]
        elif user.has_space("tech_field"):
            base_q["scope_ref.tech_user_id"] = user.user_id

    counts = {"info": 0, "warning": 0, "critical": 0, "total": 0}
    async for d in db.operational_alerts.find(base_q, {"severity": 1}):
        sev = d.get("severity") or "info"
        if sev in counts:
            counts[sev] += 1
        counts["total"] += 1

    recent = await db.operational_alerts.find(base_q).sort("created_at", -1).limit(5).to_list(length=5)
    return {
        "counts": counts,
        "recent": [_serialize(d) for d in recent],
    }


# ---------------- create (SRS only) ----------------


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_alert(
    body: AlertCreate,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "SRS only")

    alert = OperationalAlert(
        tenant_id=user.tenant_id,
        created_by=user.user_id,
        updated_by=user.user_id,
        kind=body.kind,
        severity=body.severity,
        scope=body.scope,
        scope_ref=body.scope_ref,
        source=body.source,
        ball_in_court=body.ball_in_court,
        title=body.title,
        message=body.message,
        action_hint=body.action_hint,
        eta_drift_minutes=body.eta_drift_minutes,
        affected_wo_count=body.affected_wo_count,
        expires_at=body.expires_at,
    )
    db = get_db()
    doc = alert.to_mongo()
    result = await db.operational_alerts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


# ---------------- lifecycle ----------------


async def _get_alert_or_404(alert_id: str, user: CurrentUser) -> dict[str, Any]:
    db = get_db()
    a = await db.operational_alerts.find_one(
        {"_id": _oid(alert_id), "tenant_id": user.tenant_id}
    )
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "alert not found")
    return a


@router.post("/{alert_id}/ack")
async def ack_alert(
    alert_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    await _get_alert_or_404(alert_id, user)
    db = get_db()
    now = _now()
    await db.operational_alerts.update_one(
        {"_id": _oid(alert_id)},
        {
            "$set": {
                "status": "acknowledged",
                "acknowledged_at": now,
                "acknowledged_by_user_id": user.user_id,
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )
    updated = await db.operational_alerts.find_one({"_id": _oid(alert_id)})
    return _serialize(updated)


@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    body: AlertResolve,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    a = await _get_alert_or_404(alert_id, user)
    # client can only resolve if ball_in_court == client
    if not user.has_space("srs_coordinators"):
        if not user.has_space("client_coordinator") or a.get("ball_in_court") != "client":
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "You cannot resolve this alert (ball not in your court)",
            )
    db = get_db()
    now = _now()
    await db.operational_alerts.update_one(
        {"_id": _oid(alert_id)},
        {
            "$set": {
                "status": "resolved",
                "resolved_at": now,
                "resolved_by_user_id": user.user_id,
                "resolution_note": body.resolution_note,
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )
    updated = await db.operational_alerts.find_one({"_id": _oid(alert_id)})
    return _serialize(updated)


@router.post("/{alert_id}/dismiss")
async def dismiss_alert(
    alert_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "SRS only")
    await _get_alert_or_404(alert_id, user)
    db = get_db()
    now = _now()
    await db.operational_alerts.update_one(
        {"_id": _oid(alert_id)},
        {
            "$set": {
                "status": "dismissed",
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )
    updated = await db.operational_alerts.find_one({"_id": _oid(alert_id)})
    return _serialize(updated)
