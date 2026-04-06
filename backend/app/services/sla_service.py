from datetime import datetime, timezone

from app.database import get_db
from app.services.notification_service import notify_sla_warning, notify_sla_breach


async def check_sla_breaches():
    db = get_db()
    now = datetime.now(timezone.utc)
    active_statuses = ["assigned", "accepted", "en_route", "on_site", "in_progress"]

    async for iv in db.interventions.find({"status": {"$in": active_statuses}}):
        sla = iv.get("sla", {})
        deadline = sla.get("deadline_at")
        if not deadline or not isinstance(deadline, datetime):
            continue

        remaining = (deadline - now).total_seconds() / 60
        resolution_mins = sla.get("resolution_minutes", 480)

        if remaining <= 0 and not sla.get("breached"):
            await db.interventions.update_one(
                {"_id": iv["_id"]},
                {"$set": {"sla.breached": True}},
            )
            await notify_sla_breach(iv.get("assigned_by", ""), iv.get("reference", ""))
        elif 0 < remaining < resolution_mins * 0.2:
            await notify_sla_warning(
                iv.get("assigned_by", ""),
                iv.get("reference", ""),
                round(remaining),
            )
