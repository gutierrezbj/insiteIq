from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends

from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/today")
async def today(user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    active_statuses = ["created", "assigned", "accepted", "en_route", "on_site", "in_progress"]
    active = await db.interventions.count_documents({"status": {"$in": active_statuses}})
    completed_today = await db.interventions.count_documents({
        "status": "completed",
        "updated_at": {"$gte": start_of_day},
    })
    created_today = await db.interventions.count_documents({
        "created_at": {"$gte": start_of_day},
    })

    by_status = {}
    for s in active_statuses:
        by_status[s] = await db.interventions.count_documents({"status": s})

    return {
        "data": {
            "active": active,
            "completed_today": completed_today,
            "created_today": created_today,
            "by_status": by_status,
            "timestamp": now,
        }
    }


@router.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_interventions = await db.interventions.count_documents({})
    this_week = await db.interventions.count_documents({"created_at": {"$gte": week_ago}})
    this_month = await db.interventions.count_documents({"created_at": {"$gte": month_ago}})
    completed = await db.interventions.count_documents({"status": "completed"})
    total_sites = await db.sites.count_documents({})
    total_techs = await db.technicians.count_documents({})

    fix_rate = (completed / total_interventions * 100) if total_interventions > 0 else 0

    return {
        "data": {
            "total_interventions": total_interventions,
            "this_week": this_week,
            "this_month": this_month,
            "completed": completed,
            "fix_rate": round(fix_rate, 1),
            "total_sites": total_sites,
            "total_technicians": total_techs,
        }
    }


@router.get("/sla")
async def sla_status(user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.now(timezone.utc)
    at_risk = []
    breached = []

    active_statuses = ["assigned", "accepted", "en_route", "on_site", "in_progress"]
    async for iv in db.interventions.find({"status": {"$in": active_statuses}}):
        deadline = iv.get("sla", {}).get("deadline_at")
        if not deadline:
            continue
        if isinstance(deadline, datetime):
            remaining = (deadline - now).total_seconds() / 60
            entry = {
                "id": str(iv["_id"]),
                "reference": iv.get("reference", ""),
                "status": iv.get("status", ""),
                "minutes_remaining": round(remaining),
                "deadline_at": deadline,
            }
            if remaining <= 0:
                entry["breached"] = True
                breached.append(entry)
            elif remaining < iv.get("sla", {}).get("resolution_minutes", 480) * 0.2:
                at_risk.append(entry)

    return {"data": {"at_risk": at_risk, "breached": breached}}


@router.get("/workforce")
async def workforce(user: dict = Depends(get_current_user)):
    db = get_db()
    active_statuses = ["assigned", "accepted", "en_route", "on_site", "in_progress"]

    # Get all active techs
    techs = []
    async for t in db.technicians.find({"is_active": True}):
        t["id"] = str(t.pop("_id"))
        techs.append(t)

    # Get active interventions mapped by technician_id
    assignments = {}
    async for iv in db.interventions.find({"status": {"$in": active_statuses}}):
        tid = iv.get("technician_id")
        if tid:
            assignments[tid] = {
                "reference": iv.get("reference"),
                "status": iv.get("status"),
                "site_name": iv.get("site_name"),
                "priority": iv.get("priority"),
            }

    available, busy, offline = [], [], []
    for t in techs:
        assignment = assignments.get(t["id"])
        entry = {
            "id": t["id"],
            "name": t["name"],
            "city": t.get("city", ""),
            "country": t.get("country", ""),
            "skills": (t.get("skills") or [])[:3],
            "tier": t.get("tier", ""),
            "rating": t.get("rating", {}),
            "current_mission": assignment,
        }
        if t.get("availability") == "offline":
            offline.append(entry)
        elif assignment:
            busy.append(entry)
        else:
            available.append(entry)

    return {"data": {"available": available, "busy": busy, "offline": offline},
            "counts": {"available": len(available), "busy": len(busy), "offline": len(offline), "total": len(techs)}}


@router.get("/compliance")
async def compliance(user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.now(timezone.utc)
    thirty_days = now + timedelta(days=30)

    # Count active interventions missing pre_flight
    preflight_pending = await db.interventions.count_documents({
        "status": {"$in": ["assigned", "accepted", "en_route"]},
        "pre_flight": None,
    })

    # Count on-site/in-progress missing proof_of_work
    missing_proof = await db.interventions.count_documents({
        "status": {"$in": ["on_site", "in_progress"]},
        "proof_of_work": None,
    })

    # Certs expiring (check string dates in certifications array)
    certs_expiring = []
    async for t in db.technicians.find({"is_active": True, "certifications": {"$exists": True, "$ne": []}}):
        for c in t.get("certifications", []):
            exp = c.get("expires")
            if exp:
                try:
                    exp_date = datetime.fromisoformat(exp.replace("Z", "+00:00")) if isinstance(exp, str) else exp
                    if now <= exp_date <= thirty_days:
                        certs_expiring.append({"tech_name": t["name"], "cert_name": c.get("name", ""), "expires": exp})
                except (ValueError, TypeError):
                    pass

    return {"data": {
        "certs_expiring": certs_expiring,
        "preflight_pending": preflight_pending,
        "missing_proof": missing_proof,
        "status": "ok" if not certs_expiring and preflight_pending == 0 and missing_proof == 0 else "attention",
    }}
