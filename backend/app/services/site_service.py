from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.database import get_db


async def create_site(data: dict) -> dict:
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        **data,
        "photos": [],
        "intervention_count": 0,
        "last_intervention_at": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.sites.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


async def get_site(site_id: str) -> dict:
    db = get_db()
    site = await db.sites.find_one({"_id": ObjectId(site_id)})
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    site["id"] = str(site.pop("_id"))
    return site


async def update_site(site_id: str, data: dict) -> dict:
    db = get_db()
    update_data = {k: v for k, v in data.items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc)
    result = await db.sites.find_one_and_update(
        {"_id": ObjectId(site_id)},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    result["id"] = str(result.pop("_id"))
    return result


async def list_sites(
    country: str = None,
    city: str = None,
    client: str = None,
    search: str = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[dict], int]:
    db = get_db()
    query = {}
    if country:
        query["country"] = {"$regex": country, "$options": "i"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if client:
        query["client"] = {"$regex": client, "$options": "i"}
    if search:
        query["$text"] = {"$search": search}

    total = await db.sites.count_documents(query)
    skip = (page - 1) * per_page
    sites = []
    async for s in db.sites.find(query).skip(skip).limit(per_page).sort("created_at", -1):
        s["id"] = str(s.pop("_id"))
        sites.append(s)
    return sites, total


async def get_sites_geojson() -> dict:
    db = get_db()
    features = []
    async for s in db.sites.find({}, {"name": 1, "client": 1, "location": 1, "address": 1}):
        features.append({
            "type": "Feature",
            "geometry": s.get("location", {"type": "Point", "coordinates": [0, 0]}),
            "properties": {
                "id": str(s["_id"]),
                "name": s.get("name", ""),
                "client": s.get("client", ""),
                "address": s.get("address", ""),
            },
        })
    return {"type": "FeatureCollection", "features": features}


async def add_photo(site_id: str, photo: dict) -> dict:
    db = get_db()
    result = await db.sites.find_one_and_update(
        {"_id": ObjectId(site_id)},
        {
            "$push": {"photos": photo},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    result["id"] = str(result.pop("_id"))
    return result
