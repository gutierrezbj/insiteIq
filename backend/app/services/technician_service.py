from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.database import get_db


async def create_technician(data: dict) -> dict:
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        **data,
        "availability": "available",
        "shield_level": "bronze",
        "rating": {"average": 0.0, "count": 0, "categories": {
            "punctuality": 0.0, "resolution": 0.0, "communication": 0.0, "documentation": 0.0
        }},
        "stats": {"total_jobs": 0, "first_time_fix_rate": 0.0, "avg_resolution_minutes": 0},
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.technicians.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


async def get_technician(tech_id: str) -> dict:
    db = get_db()
    tech = await db.technicians.find_one({"_id": ObjectId(tech_id)})
    if not tech:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technician not found")
    tech["id"] = str(tech.pop("_id"))
    return tech


async def update_technician(tech_id: str, data: dict) -> dict:
    db = get_db()
    update_data = {k: v for k, v in data.items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc)
    result = await db.technicians.find_one_and_update(
        {"_id": ObjectId(tech_id)},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technician not found")
    result["id"] = str(result.pop("_id"))
    return result


async def list_technicians(
    country: str = None,
    skills: str = None,
    availability: str = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[dict], int]:
    db = get_db()
    query = {"is_active": True}
    if country:
        query["country"] = {"$regex": country, "$options": "i"}
    if skills:
        query["skills"] = {"$in": skills.split(",")}
    if availability:
        query["availability"] = availability

    total = await db.technicians.count_documents(query)
    skip = (page - 1) * per_page
    techs = []
    async for t in db.technicians.find(query).skip(skip).limit(per_page).sort("created_at", -1):
        t["id"] = str(t.pop("_id"))
        techs.append(t)
    return techs, total


async def get_technicians_geojson(skills: str = None) -> dict:
    db = get_db()
    query = {"is_active": True, "availability": "available"}
    if skills:
        query["skills"] = {"$in": skills.split(",")}
    features = []
    async for t in db.technicians.find(query, {"name": 1, "location": 1, "skills": 1, "availability": 1}):
        features.append({
            "type": "Feature",
            "geometry": t.get("location", {"type": "Point", "coordinates": [0, 0]}),
            "properties": {
                "id": str(t["_id"]),
                "name": t.get("name", ""),
                "skills": t.get("skills", []),
                "availability": t.get("availability", ""),
            },
        })
    return {"type": "FeatureCollection", "features": features}


async def find_nearby(lng: float, lat: float, max_km: float = 100, skills: str = None) -> list[dict]:
    db = get_db()
    query = {
        "is_active": True,
        "availability": "available",
        "location": {
            "$nearSphere": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                "$maxDistance": max_km * 1000,
            }
        },
    }
    if skills:
        query["skills"] = {"$in": skills.split(",")}
    techs = []
    async for t in db.technicians.find(query).limit(20):
        t["id"] = str(t.pop("_id"))
        techs.append(t)
    return techs
