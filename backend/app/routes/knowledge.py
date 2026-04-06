from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.dependencies import get_current_user
from app.models.knowledge import KBCreate, KBResponse, KBListResponse

router = APIRouter()


@router.get("", response_model=KBListResponse)
async def search_kb(
    search: str = None,
    category: str = None,
    site_id: str = None,
    user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {}
    if site_id:
        query["site_id"] = site_id
    if category:
        query["category"] = category
    if search:
        query["$text"] = {"$search": search}

    entries = []
    async for e in db.knowledge_base.find(query).sort("created_at", -1).limit(50):
        e["id"] = str(e.pop("_id"))
        entries.append(e)
    return {"data": entries, "total": len(entries)}


@router.get("/site/{site_id}", response_model=KBListResponse)
async def kb_by_site(site_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    entries = []
    async for e in db.knowledge_base.find({"site_id": site_id}).sort("created_at", -1):
        e["id"] = str(e.pop("_id"))
        entries.append(e)
    return {"data": entries, "total": len(entries)}


@router.post("", response_model=KBResponse)
async def create_entry(body: KBCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    doc = {
        **body.model_dump(),
        "helpful_count": 0,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.knowledge_base.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return {"data": doc, "message": "KB entry created"}
