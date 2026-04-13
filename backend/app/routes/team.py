"""
Team status routes — active coordinators/techs with timezone and shift info.
Powers the OPS map team overlay and cockpit active-team panel.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.database import get_db
from app.dependencies import get_current_user, INTERNAL_ROLES

router = APIRouter()


@router.get("/active")
async def active_team(user: dict = Depends(get_current_user)):
    """Return all team members with their location, timezone, and shift status."""
    db = get_db()
    now = datetime.now(timezone.utc)
    utc_hour = now.hour

    members = []
    async for m in db.team_members.find({"is_active": True}):
        m["id"] = str(m.pop("_id"))

        # Compute local hour from utc_offset
        utc_offset = m.get("utc_offset", 0)
        local_hour = (utc_hour + utc_offset) % 24

        # Determine on-shift status from shift_start/shift_end (hours in local time)
        shift_start = m.get("shift_start", 8)
        shift_end = m.get("shift_end", 18)
        on_shift = shift_start <= local_hour < shift_end

        # Client users only see coordinators, not the full team
        if user.get("role") not in INTERNAL_ROLES:
            if m.get("role") not in ("coordinator", "pm"):
                continue

        members.append({
            "id": m["id"],
            "name": m.get("name", ""),
            "role": m.get("role", ""),
            "avatar_url": m.get("avatar_url"),
            "country": m.get("country", ""),
            "city": m.get("city", ""),
            "timezone": m.get("timezone", "UTC"),
            "utc_offset": utc_offset,
            "local_hour": local_hour,
            "local_time": f"{local_hour:02d}:{now.minute:02d}",
            "on_shift": on_shift,
            "shift_start": shift_start,
            "shift_end": shift_end,
            "location": m.get("location"),  # GeoJSON point for map
            "covers_regions": m.get("covers_regions", []),
            "current_status": m.get("current_status", "available"),
        })

    # Sort: on-shift first, then by name
    members.sort(key=lambda x: (not x["on_shift"], x["name"]))

    on_shift_count = sum(1 for m in members if m["on_shift"])
    return {
        "data": members,
        "counts": {
            "total": len(members),
            "on_shift": on_shift_count,
            "off_shift": len(members) - on_shift_count,
        },
        "server_utc": now.isoformat(),
    }
