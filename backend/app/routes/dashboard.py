from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends

from app.database import get_db
from app.dependencies import get_current_user, client_filter

router = APIRouter()


@router.get("/today")
async def today(user: dict = Depends(get_current_user)):
    db = get_db()
    tf = client_filter(user)
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    active_statuses = ["created", "assigned", "accepted", "en_route", "on_site", "in_progress"]
    active = await db.interventions.count_documents({"status": {"$in": active_statuses}, **tf})
    completed_today = await db.interventions.count_documents({
        "status": "completed",
        "updated_at": {"$gte": start_of_day},
        **tf,
    })
    created_today = await db.interventions.count_documents({
        "created_at": {"$gte": start_of_day},
        **tf,
    })

    by_status = {}
    for s in active_statuses:
        by_status[s] = await db.interventions.count_documents({"status": s, **tf})

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
    tf = client_filter(user)
    sf = client_filter(user, field="client")  # sites also use "client" field
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_interventions = await db.interventions.count_documents({**tf})
    this_week = await db.interventions.count_documents({"created_at": {"$gte": week_ago}, **tf})
    this_month = await db.interventions.count_documents({"created_at": {"$gte": month_ago}, **tf})
    completed = await db.interventions.count_documents({"status": "completed", **tf})
    total_sites = await db.sites.count_documents({**sf})
    total_techs = await db.technicians.count_documents({})  # techs are global resource

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
    tf = client_filter(user)
    now = datetime.now(timezone.utc)
    at_risk = []
    breached = []

    active_statuses = ["assigned", "accepted", "en_route", "on_site", "in_progress"]
    async for iv in db.interventions.find({"status": {"$in": active_statuses}, **tf}):
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
    tf = client_filter(user)
    active_statuses = ["assigned", "accepted", "en_route", "on_site", "in_progress"]

    # Get all active techs
    techs = []
    async for t in db.technicians.find({"is_active": True}):
        t["id"] = str(t.pop("_id"))
        techs.append(t)

    # Get active interventions mapped by technician_id (scoped to tenant)
    assignments = {}
    async for iv in db.interventions.find({"status": {"$in": active_statuses}, **tf}):
        tid = iv.get("technician_id")
        if tid:
            assignments[tid] = {
                "reference": iv.get("reference"),
                "status": iv.get("status"),
                "site_name": iv.get("site_name"),
                "priority": iv.get("priority"),
            }

    is_client = user.get("role") == "client"
    available, busy, offline = [], [], []
    for t in techs:
        assignment = assignments.get(t["id"])
        # Client users only see techs assigned to their interventions
        if is_client and not assignment:
            continue
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
            if not is_client:  # clients don't see offline techs
                offline.append(entry)
        elif assignment:
            busy.append(entry)
        else:
            if not is_client:  # clients don't see available techs
                available.append(entry)

    return {"data": {"available": available, "busy": busy, "offline": offline},
            "counts": {"available": len(available), "busy": len(busy), "offline": len(offline), "total": len(available) + len(busy) + len(offline)}}


@router.get("/alerts")
async def alerts(user: dict = Depends(get_current_user)):
    """
    Generate operational alerts from live data — SLA breaches, pending deliverables,
    unassigned urgents, stale interventions, scope anomalies, coordinator gaps.
    """
    db = get_db()
    tf = client_filter(user)
    now = datetime.now(timezone.utc)
    alerts_list = []

    active_statuses = ["created", "assigned", "accepted", "en_route", "on_site", "in_progress"]

    # 1. SLA breaches & critical
    async for iv in db.interventions.find({"status": {"$in": active_statuses}, **tf}):
        sla = iv.get("sla", {})
        deadline = sla.get("deadline_at")
        ref = iv.get("reference", "")
        site = iv.get("site_name", "")
        client_name = iv.get("client", "")

        if deadline and isinstance(deadline, datetime):
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            remaining_min = (deadline - now).total_seconds() / 60
            resolution_min = sla.get("resolution_minutes", 480)

            if remaining_min <= 0:
                alerts_list.append({
                    "type": "sla_breach",
                    "severity": "critical",
                    "title": f"SLA BREACH: {ref}",
                    "detail": f"{site} — {abs(int(remaining_min))}min over deadline",
                    "reference": ref,
                    "intervention_id": str(iv["_id"]),
                    "client": client_name,
                    "minutes_over": abs(int(remaining_min)),
                    "created_at": now.isoformat(),
                })
            elif remaining_min < resolution_min * 0.1:
                alerts_list.append({
                    "type": "sla_critical",
                    "severity": "high",
                    "title": f"SLA Critical: {ref}",
                    "detail": f"{site} — {int(remaining_min)}min remaining",
                    "reference": ref,
                    "intervention_id": str(iv["_id"]),
                    "client": client_name,
                    "created_at": now.isoformat(),
                })

        # 2. Unassigned emergency/high priority
        if not iv.get("technician_id") and iv.get("priority") in ("emergency", "high"):
            alerts_list.append({
                "type": "unassigned_urgent",
                "severity": "high",
                "title": f"Unassigned {iv['priority'].upper()}: {ref}",
                "detail": f"{site} — needs technician assignment",
                "reference": ref,
                "intervention_id": str(iv["_id"]),
                "client": client_name,
                "created_at": now.isoformat(),
            })

        # 3. Stale interventions — no update in 4+ hours while active
        updated = iv.get("updated_at")
        if updated and isinstance(updated, datetime):
            # Ensure timezone-aware comparison
            if updated.tzinfo is None:
                updated = updated.replace(tzinfo=timezone.utc)
            hours_stale = (now - updated).total_seconds() / 3600
            if hours_stale >= 4 and iv.get("status") in ("on_site", "in_progress"):
                alerts_list.append({
                    "type": "stale_intervention",
                    "severity": "medium",
                    "title": f"No update: {ref}",
                    "detail": f"{site} — {int(hours_stale)}h since last activity",
                    "reference": ref,
                    "intervention_id": str(iv["_id"]),
                    "client": client_name,
                    "created_at": now.isoformat(),
                })

        # 4. Missing proof of work on on_site/in_progress
        if iv.get("status") in ("on_site", "in_progress") and not iv.get("proof_of_work"):
            started = iv.get("sla", {}).get("started_at")
            if started and isinstance(started, datetime):
                if started.tzinfo is None:
                    started = started.replace(tzinfo=timezone.utc)
                hours_active = (now - started).total_seconds() / 3600
                if hours_active >= 2:
                    alerts_list.append({
                        "type": "missing_evidence",
                        "severity": "medium",
                        "title": f"No evidence: {ref}",
                        "detail": f"{site} — {int(hours_active)}h active, no photos uploaded",
                        "reference": ref,
                        "intervention_id": str(iv["_id"]),
                        "client": client_name,
                        "created_at": now.isoformat(),
                    })

    # 5. Deliverables pending — completed but no resolution documented
    async for iv in db.interventions.find({"status": "completed", **tf}).sort("updated_at", -1).limit(20):
        if not iv.get("resolution"):
            updated = iv.get("updated_at")
            if updated and isinstance(updated, datetime):
                if updated.tzinfo is None:
                    updated = updated.replace(tzinfo=timezone.utc)
                days_ago = (now - updated).days
                if days_ago >= 1:
                    alerts_list.append({
                        "type": "pending_deliverable",
                        "severity": "low",
                        "title": f"Deliverable pending: {iv.get('reference', '')}",
                        "detail": f"{iv.get('site_name', '')} — completed {days_ago}d ago, no report",
                        "reference": iv.get("reference", ""),
                        "intervention_id": str(iv["_id"]),
                        "client": iv.get("client", ""),
                        "created_at": now.isoformat(),
                    })

    # 6. Coordinator coverage gaps — check team_members if any on-shift
    on_shift_count = 0
    async for m in db.team_members.find({"is_active": True, "role": {"$in": ["coordinator", "pm"]}}):
        utc_offset = m.get("utc_offset", 0)
        local_hour = (now.hour + utc_offset) % 24
        if m.get("shift_start", 8) <= local_hour < m.get("shift_end", 18):
            on_shift_count += 1

    if on_shift_count == 0:
        alerts_list.append({
            "type": "no_coordinator",
            "severity": "high",
            "title": "No coordinator on shift",
            "detail": "All coordinators are currently off-shift",
            "created_at": now.isoformat(),
        })

    # Sort by severity
    sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    alerts_list.sort(key=lambda a: sev_order.get(a["severity"], 9))

    return {
        "data": alerts_list,
        "counts": {
            "total": len(alerts_list),
            "critical": sum(1 for a in alerts_list if a["severity"] == "critical"),
            "high": sum(1 for a in alerts_list if a["severity"] == "high"),
            "medium": sum(1 for a in alerts_list if a["severity"] == "medium"),
            "low": sum(1 for a in alerts_list if a["severity"] == "low"),
        },
        "timestamp": now.isoformat(),
    }


@router.get("/compliance")
async def compliance(user: dict = Depends(get_current_user)):
    db = get_db()
    tf = client_filter(user)
    now = datetime.now(timezone.utc)
    thirty_days = now + timedelta(days=30)

    # Count active interventions missing pre_flight (scoped to tenant)
    preflight_pending = await db.interventions.count_documents({
        "status": {"$in": ["assigned", "accepted", "en_route"]},
        "pre_flight": None,
        **tf,
    })

    # Count on-site/in-progress missing proof_of_work (scoped to tenant)
    missing_proof = await db.interventions.count_documents({
        "status": {"$in": ["on_site", "in_progress"]},
        "proof_of_work": None,
        **tf,
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
