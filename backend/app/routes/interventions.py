import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form

from app.core.config import settings
from app.dependencies import get_current_user
from app.models.intervention import (
    InterventionCreate,
    InterventionUpdate,
    InterventionResponse,
    InterventionListResponse,
    TimelineEvent,
    Resolution,
    InterventionRating,
)
from app.services.dispatch_service import (
    create_intervention,
    get_intervention,
    update_intervention,
    add_timeline_event,
    complete_intervention,
    list_interventions,
    get_active_interventions,
)

router = APIRouter()


@router.get("", response_model=InterventionListResponse)
async def get_interventions(
    site_id: str = None,
    technician_id: str = None,
    status: str = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    items, total = await list_interventions(site_id, technician_id, status, page, per_page)
    return {"data": items, "total": total, "page": page, "per_page": per_page}


@router.get("/active")
async def active(user: dict = Depends(get_current_user)):
    items = await get_active_interventions()
    return {"data": items, "total": len(items)}


@router.get("/{intervention_id}", response_model=InterventionResponse)
async def get_detail(intervention_id: str, user: dict = Depends(get_current_user)):
    iv = await get_intervention(intervention_id)
    return {"data": iv}


@router.post("", response_model=InterventionResponse)
async def create(body: InterventionCreate, user: dict = Depends(get_current_user)):
    iv = await create_intervention(body.model_dump(), user["id"])
    return {"data": iv, "message": "Intervention created"}


@router.patch("/{intervention_id}", response_model=InterventionResponse)
async def patch(
    intervention_id: str,
    body: InterventionUpdate,
    user: dict = Depends(get_current_user),
):
    iv = await update_intervention(intervention_id, body.model_dump(exclude_unset=True))
    return {"data": iv, "message": "Intervention updated"}


@router.post("/{intervention_id}/timeline", response_model=InterventionResponse)
async def post_timeline(
    intervention_id: str,
    body: TimelineEvent,
    user: dict = Depends(get_current_user),
):
    iv = await add_timeline_event(intervention_id, body.model_dump())
    return {"data": iv, "message": "Timeline event added"}


@router.post("/{intervention_id}/complete", response_model=InterventionResponse)
async def post_complete(
    intervention_id: str,
    body: Resolution,
    user: dict = Depends(get_current_user),
):
    iv = await complete_intervention(intervention_id, body.model_dump())
    return {"data": iv, "message": "Intervention completed"}


@router.post("/{intervention_id}/rate", response_model=InterventionResponse)
async def post_rate(
    intervention_id: str,
    body: InterventionRating,
    user: dict = Depends(get_current_user),
):
    from app.database import get_db
    from bson import ObjectId

    db = get_db()
    now = datetime.now(timezone.utc)
    rating = body.model_dump()
    rating["rated_by"] = user["id"]
    rating["rated_at"] = now
    result = await db.interventions.find_one_and_update(
        {"_id": ObjectId(intervention_id)},
        {"$set": {"rating": rating, "updated_at": now}},
        return_document=True,
    )
    result["id"] = str(result.pop("_id"))
    return {"data": result, "message": "Rating submitted"}


@router.post("/{intervention_id}/proof")
async def upload_proof(
    intervention_id: str,
    file: UploadFile = File(...),
    photo_type: str = Form("work"),
    description: str = Form(""),
    user: dict = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"interventions/{intervention_id}/{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    from app.database import get_db
    from bson import ObjectId

    db = get_db()
    now = datetime.now(timezone.utc)
    photo = {"url": f"/uploads/{filename}", "description": description, "timestamp": now}

    if photo_type == "arrival":
        update = {"$set": {"proof_of_work.arrival_photo": photo, "updated_at": now}}
    elif photo_type == "completion":
        update = {"$set": {"proof_of_work.completion_photo": photo, "updated_at": now}}
    else:
        update = {"$push": {"proof_of_work.work_photos": photo}, "$set": {"updated_at": now}}

    await db.interventions.update_one({"_id": ObjectId(intervention_id)}, update)
    return {"message": "Photo uploaded", "url": photo["url"]}
