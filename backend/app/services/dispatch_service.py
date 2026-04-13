from datetime import datetime, timezone, timedelta

from bson import ObjectId
from fastapi import HTTPException, status

from app.database import get_db


async def _next_reference() -> str:
    db = get_db()
    year = datetime.now(timezone.utc).year
    last = await db.interventions.find_one(
        {"reference": {"$regex": f"^IIQ-{year}-"}},
        sort=[("reference", -1)],
    )
    if last:
        num = int(last["reference"].split("-")[-1]) + 1
    else:
        num = 1
    return f"IIQ-{year}-{num:05d}"


async def create_intervention(data: dict, user_id: str) -> dict:
    db = get_db()
    site = await db.sites.find_one({"_id": ObjectId(data["site_id"])})
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    now = datetime.now(timezone.utc)
    sla = data.get("sla", {})
    deadline = None
    if data.get("scheduled_at") and sla.get("resolution_minutes"):
        scheduled = data["scheduled_at"] if isinstance(data["scheduled_at"], datetime) else now
        deadline = scheduled + timedelta(minutes=sla["resolution_minutes"])

    initial_status = "assigned" if data.get("technician_id") else "created"

    doc = {
        "reference": await _next_reference(),
        "site_id": data["site_id"],
        "technician_id": data.get("technician_id"),
        "assigned_by": user_id,
        "client": site.get("client", ""),
        "type": data.get("type", "reactive"),
        "priority": data.get("priority", "normal"),
        "status": initial_status,
        "description": data.get("description", ""),
        "scheduled_at": data.get("scheduled_at"),
        "sla": {
            "response_minutes": sla.get("response_minutes", 240),
            "resolution_minutes": sla.get("resolution_minutes", 480),
            "deadline_at": deadline,
            "breached": False,
        },
        "pre_flight": {
            "tools_confirmed": False,
            "parts_confirmed": False,
            "site_bible_read": False,
            "confirmed_at": None,
        },
        "timeline": [{"status": initial_status, "timestamp": now, "location": None, "note": "Created"}],
        "proof_of_work": {
            "arrival_photo": None,
            "work_photos": [],
            "completion_photo": None,
            "client_signature": None,
            "technician_notes": "",
        },
        "resolution": None,
        "rating": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.interventions.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)

    await db.sites.update_one(
        {"_id": ObjectId(data["site_id"])},
        {"$inc": {"intervention_count": 1}, "$set": {"last_intervention_at": now}},
    )
    return doc


async def get_intervention(intervention_id: str) -> dict:
    db = get_db()
    iv = await db.interventions.find_one({"_id": ObjectId(intervention_id)})
    if not iv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intervention not found")
    iv["id"] = str(iv.pop("_id"))
    return iv


async def update_intervention(intervention_id: str, data: dict) -> dict:
    db = get_db()
    update_data = {k: v for k, v in data.items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    now = datetime.now(timezone.utc)
    update_data["updated_at"] = now

    new_status = update_data.get("status")
    push_ops = {}
    if new_status:
        push_ops["timeline"] = {"status": new_status, "timestamp": now, "location": None, "note": ""}

    update_cmd = {"$set": update_data}
    if push_ops:
        update_cmd["$push"] = push_ops

    result = await db.interventions.find_one_and_update(
        {"_id": ObjectId(intervention_id)},
        update_cmd,
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intervention not found")
    result["id"] = str(result.pop("_id"))
    return result


async def add_timeline_event(intervention_id: str, event: dict) -> dict:
    db = get_db()
    now = datetime.now(timezone.utc)
    event["timestamp"] = now
    result = await db.interventions.find_one_and_update(
        {"_id": ObjectId(intervention_id)},
        {
            "$push": {"timeline": event},
            "$set": {"status": event["status"], "updated_at": now},
        },
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intervention not found")
    result["id"] = str(result.pop("_id"))
    return result


async def complete_intervention(intervention_id: str, resolution: dict) -> dict:
    db = get_db()
    now = datetime.now(timezone.utc)
    result = await db.interventions.find_one_and_update(
        {"_id": ObjectId(intervention_id)},
        {
            "$set": {
                "status": "completed",
                "resolution": resolution,
                "updated_at": now,
            },
            "$push": {"timeline": {"status": "completed", "timestamp": now, "location": None, "note": "Completed"}},
        },
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intervention not found")
    result["id"] = str(result.pop("_id"))

    if result.get("technician_id"):
        await db.technicians.update_one(
            {"_id": ObjectId(result["technician_id"])},
            {"$inc": {"stats.total_jobs": 1}},
        )
    return result


async def list_interventions(
    site_id: str = None,
    technician_id: str = None,
    intervention_status: str = None,
    page: int = 1,
    per_page: int = 20,
    tenant_filter: dict = None,
) -> tuple[list[dict], int]:
    db = get_db()
    query = {**(tenant_filter or {})}
    if site_id:
        query["site_id"] = site_id
    if technician_id:
        query["technician_id"] = technician_id
    if intervention_status:
        query["status"] = intervention_status

    total = await db.interventions.count_documents(query)
    skip = (page - 1) * per_page
    interventions = []
    async for iv in db.interventions.find(query).skip(skip).limit(per_page).sort("created_at", -1):
        iv["id"] = str(iv.pop("_id"))
        interventions.append(iv)
    return interventions, total


async def get_active_interventions(tenant_filter: dict = None) -> list[dict]:
    db = get_db()
    active_statuses = ["created", "assigned", "accepted", "en_route", "on_site", "in_progress"]
    query = {"status": {"$in": active_statuses}, **(tenant_filter or {})}
    interventions = []
    async for iv in db.interventions.find(query).sort("scheduled_at", 1):
        iv["id"] = str(iv.pop("_id"))
        interventions.append(iv)
    return interventions
