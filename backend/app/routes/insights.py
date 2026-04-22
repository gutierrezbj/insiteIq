"""
InsiteIQ v1 — Insights dashboard (Pasito Y-b · AI Learning Engine Fase 1).

Vista SRS-wide de patrones operativos y señales de anomalia · sin LLM,
pure aggregations sobre la data viva.

Endpoints (SRS-only):
  GET /api/insights/dashboard           panorama tenant-wide · 90d default
  GET /api/insights/clients             patterns per-client (Fractalia/Claro/etc)
  GET /api/insights/sites/top-offenders sites con mas repeats · posible root cause
  GET /api/insights/techs/drift         tech rating drift detection

Diseño: compute on-demand (no cached). Para tenants grandes futuros,
worker cron nocturno puede pre-aggregar · Y-b+1.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db

router = APIRouter(prefix="/insights", tags=["insights"])


def _require_srs(user: CurrentUser):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Insights are SRS-internal"
        )


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _round(n: float) -> float:
    return round(float(n), 2)


def _naive(dt: datetime | None) -> datetime | None:
    """Strip tzinfo so we can compare against Mongo-returned naive UTC datetimes."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt


# ---------------- Dashboard ----------------

@router.get("/dashboard")
async def dashboard(
    window_days: int = 90, user: CurrentUser = Depends(get_current_user)
):
    """Panorama SRS-wide · 90d default."""
    _require_srs(user)
    window_days = max(1, min(window_days, 365))
    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    now = _now()
    # Mongo returns naive datetimes by default — strip tz from cutoffs
    # for direct comparison with doc fields in python code below.
    cutoff = (now - timedelta(days=window_days)).replace(tzinfo=None)
    cutoff_30d_naive = (now - timedelta(days=30)).replace(tzinfo=None)
    tenant_id = user.tenant_id

    # ---- WOs aggregate
    wos = await db.work_orders.find(
        {"tenant_id": tenant_id, "created_at": {"$gte": cutoff}},
        {
            "status": 1, "severity": 1, "shield_level": 1, "after_hours": 1,
            "organization_id": 1, "site_id": 1,
            "assigned_tech_user_id": 1,
            "created_at": 1, "closed_at": 1,
            "deadline_resolve_at": 1,
        },
    ).to_list(5000)

    total_wos = len(wos)
    by_status: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    by_shield: dict[str, int] = {}
    after_hours_count = 0
    sla_compliant = 0
    sla_applicable = 0
    resolution_minutes: list[float] = []

    for w in wos:
        by_status[w.get("status", "?")] = by_status.get(w.get("status", "?"), 0) + 1
        by_severity[w.get("severity", "?")] = by_severity.get(w.get("severity", "?"), 0) + 1
        if w.get("shield_level"):
            by_shield[w["shield_level"]] = by_shield.get(w["shield_level"], 0) + 1
        if w.get("after_hours"):
            after_hours_count += 1
        # SLA: closed vs deadline_resolve_at
        if w.get("status") == "closed" and w.get("closed_at") and w.get("deadline_resolve_at"):
            sla_applicable += 1
            if w["closed_at"] <= w["deadline_resolve_at"]:
                sla_compliant += 1
            if w.get("created_at"):
                delta_min = (w["closed_at"] - w["created_at"]).total_seconds() / 60.0
                resolution_minutes.append(delta_min)

    avg_resolution = _round(sum(resolution_minutes) / len(resolution_minutes)) if resolution_minutes else None
    median_resolution = None
    if resolution_minutes:
        sorted_rm = sorted(resolution_minutes)
        median_resolution = _round(sorted_rm[len(sorted_rm) // 2])
    sla_compliance_pct = (
        _round(sla_compliant / sla_applicable * 100) if sla_applicable else None
    )
    after_hours_pct = _round(after_hours_count / total_wos * 100) if total_wos else 0.0

    # ---- Clients: top 5 por WO count + avg resolve + sla compliance
    from collections import defaultdict
    per_client: dict[str, dict] = defaultdict(lambda: {
        "wo_count": 0, "closed_count": 0,
        "sla_applicable": 0, "sla_compliant": 0,
        "resolution_sum": 0.0, "resolution_n": 0,
        "after_hours": 0,
    })
    for w in wos:
        org = w.get("organization_id") or "unknown"
        p = per_client[org]
        p["wo_count"] += 1
        if w.get("status") == "closed":
            p["closed_count"] += 1
        if w.get("after_hours"):
            p["after_hours"] += 1
        if w.get("status") == "closed" and w.get("closed_at") and w.get("deadline_resolve_at"):
            p["sla_applicable"] += 1
            if w["closed_at"] <= w["deadline_resolve_at"]:
                p["sla_compliant"] += 1
        if w.get("status") == "closed" and w.get("closed_at") and w.get("created_at"):
            delta = (w["closed_at"] - w["created_at"]).total_seconds() / 60.0
            p["resolution_sum"] += delta
            p["resolution_n"] += 1

    # Resolve org names
    org_ids = [oid for oid in per_client.keys() if oid != "unknown"]
    org_names: dict[str, str] = {}
    if org_ids:
        oids = []
        for i in org_ids:
            try:
                oids.append(ObjectId(i))
            except Exception:
                pass
        async for o in db.organizations.find(
            {"_id": {"$in": oids}}, {"legal_name": 1, "country": 1}
        ):
            org_names[str(o["_id"])] = o.get("legal_name") or "unknown"

    clients_top = []
    for oid, p in per_client.items():
        avg = (
            _round(p["resolution_sum"] / p["resolution_n"])
            if p["resolution_n"]
            else None
        )
        sla_pct = (
            _round(p["sla_compliant"] / p["sla_applicable"] * 100)
            if p["sla_applicable"]
            else None
        )
        ah_pct = _round(p["after_hours"] / p["wo_count"] * 100) if p["wo_count"] else 0.0
        clients_top.append({
            "organization_id": oid,
            "organization_name": org_names.get(oid, "unknown"),
            "wo_count": p["wo_count"],
            "closed_count": p["closed_count"],
            "avg_resolution_minutes": avg,
            "sla_compliance_pct": sla_pct,
            "after_hours_pct": ah_pct,
        })
    clients_top.sort(key=lambda c: c["wo_count"], reverse=True)
    clients_top = clients_top[:8]

    # ---- Sites top offenders (repeat rate in 30d)
    per_site: dict[str, int] = defaultdict(int)
    for w in wos:
        created = w.get("created_at")
        if created and _naive(created) >= cutoff_30d_naive:
            sid = w.get("site_id")
            if sid:
                per_site[sid] += 1

    top_sites = sorted(per_site.items(), key=lambda x: x[1], reverse=True)[:5]
    site_ids_top = [s for s, _ in top_sites]
    sites_meta: dict[str, dict] = {}
    if site_ids_top:
        oids = []
        for i in site_ids_top:
            try:
                oids.append(ObjectId(i))
            except Exception:
                pass
        async for s in db.sites.find(
            {"_id": {"$in": oids}},
            {"name": 1, "country": 1, "city": 1, "organization_id": 1},
        ):
            sites_meta[str(s["_id"])] = {
                "name": s.get("name"),
                "country": s.get("country"),
                "city": s.get("city"),
                "organization_id": s.get("organization_id"),
            }

    repeat_sites = []
    for sid, count in top_sites:
        meta = sites_meta.get(sid, {})
        repeat_sites.append({
            "site_id": sid,
            "site_name": meta.get("name"),
            "country": meta.get("country"),
            "city": meta.get("city"),
            "wo_count_30d": count,
            "anomaly": count >= 3,
        })

    # ---- Tech utilization: WO count per assigned_tech in window
    per_tech: dict[str, int] = defaultdict(int)
    for w in wos:
        t = w.get("assigned_tech_user_id")
        if t:
            per_tech[t] += 1

    top_techs_ids = sorted(per_tech.items(), key=lambda x: x[1], reverse=True)[:8]
    tech_ids = [t for t, _ in top_techs_ids]
    tech_meta: dict[str, dict] = {}
    if tech_ids:
        oids = []
        for i in tech_ids:
            try:
                oids.append(ObjectId(i))
            except Exception:
                pass
        async for u in db.users.find(
            {"_id": {"$in": oids}},
            {"full_name": 1, "employment_type": 1},
        ):
            tech_meta[str(u["_id"])] = {
                "full_name": u.get("full_name"),
                "employment_type": u.get("employment_type"),
            }

    # Rating drift: last 3 ratings avg vs lifetime avg (per tech)
    tech_drift = []
    for tid, count in top_techs_ids:
        meta = tech_meta.get(tid, {})
        ratings = await db.tech_ratings.find(
            {"tenant_id": tenant_id, "rated_user_id": tid}
        ).sort("created_at", -1).to_list(50)
        lifetime_scores = [float(r.get("score", 0)) for r in ratings]
        last3 = lifetime_scores[:3]
        drift = None
        warning = False
        if len(lifetime_scores) >= 3:
            lifetime_avg = _round(sum(lifetime_scores) / len(lifetime_scores))
            last3_avg = _round(sum(last3) / len(last3))
            drift = _round(last3_avg - lifetime_avg)
            warning = drift <= -0.5  # cayó medio punto = señal
        tech_drift.append({
            "tech_user_id": tid,
            "full_name": meta.get("full_name"),
            "employment_type": meta.get("employment_type"),
            "wo_count": count,
            "lifetime_rating_count": len(lifetime_scores),
            "lifetime_avg": _round(sum(lifetime_scores) / len(lifetime_scores)) if lifetime_scores else None,
            "last3_avg": _round(sum(last3) / len(last3)) if last3 else None,
            "drift": drift,
            "drift_warning": warning,
        })

    # ---- Finance shape (snapshot · complementa el tab Finance)
    pending_invoices = await db.invoices.count_documents(
        {"tenant_id": tenant_id, "status": {"$in": ["draft", "sent"]}}
    )
    overdue_invoices = await db.invoices.count_documents(
        {"tenant_id": tenant_id, "status": "overdue"}
    )
    pending_ap = await db.vendor_invoices.count_documents(
        {
            "tenant_id": tenant_id,
            "status": {"$in": ["received", "matched", "approved", "disputed"]},
        }
    )

    return {
        "window_days": window_days,
        "as_of": now,
        "overview": {
            "wo_total": total_wos,
            "wo_by_status": by_status,
            "wo_by_severity": by_severity,
            "wo_by_shield": by_shield,
            "after_hours_pct": after_hours_pct,
            "avg_resolution_minutes": avg_resolution,
            "median_resolution_minutes": median_resolution,
            "sla_compliance_pct": sla_compliance_pct,
            "sla_applicable": sla_applicable,
            "sla_compliant": sla_compliant,
        },
        "clients_top": clients_top,
        "repeat_sites_30d": repeat_sites,
        "tech_drift": tech_drift,
        "finance_snapshot": {
            "pending_ar_invoices": pending_invoices,
            "overdue_ar_invoices": overdue_invoices,
            "pending_ap_invoices": pending_ap,
        },
    }
