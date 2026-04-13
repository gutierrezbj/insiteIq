import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form

from app.core.config import settings
from app.dependencies import get_current_user, client_filter
from app.models.site import SiteCreate, SiteUpdate, SiteResponse, SiteListResponse, SiteInDB
from app.services.site_service import (
    create_site,
    get_site,
    update_site,
    list_sites,
    get_sites_geojson,
    add_photo,
)

router = APIRouter()


@router.get("", response_model=SiteListResponse)
async def get_sites(
    country: str = None,
    city: str = None,
    client: str = None,
    search: str = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    tf = client_filter(user)
    sites, total = await list_sites(country, city, client, search, page, per_page, tenant_filter=tf)
    return {"data": sites, "total": total, "page": page, "per_page": per_page}


@router.get("/map")
async def sites_map(user: dict = Depends(get_current_user)):
    tf = client_filter(user)
    return await get_sites_geojson(tenant_filter=tf)


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site_detail(site_id: str, user: dict = Depends(get_current_user)):
    site = await get_site(site_id)
    return {"data": site}


@router.post("", response_model=SiteResponse)
async def create(body: SiteCreate, user: dict = Depends(get_current_user)):
    site = await create_site(body.model_dump())
    return {"data": site, "message": "Site created"}


@router.patch("/{site_id}", response_model=SiteResponse)
async def patch(site_id: str, body: SiteUpdate, user: dict = Depends(get_current_user)):
    site = await update_site(site_id, body.model_dump(exclude_unset=True))
    return {"data": site, "message": "Site updated"}


@router.post("/{site_id}/photos", response_model=SiteResponse)
async def upload_photo(
    site_id: str,
    file: UploadFile = File(...),
    photo_type: str = Form("other"),
    description: str = Form(""),
    user: dict = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"sites/{site_id}/{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    photo = {
        "url": f"/uploads/{filename}",
        "type": photo_type,
        "description": description,
        "uploaded_at": datetime.now(timezone.utc),
        "uploaded_by": user["id"],
    }
    site = await add_photo(site_id, photo)
    return {"data": site, "message": "Photo uploaded"}
