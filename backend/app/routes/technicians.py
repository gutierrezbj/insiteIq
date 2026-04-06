from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user
from app.models.technician import TechCreate, TechUpdate, TechResponse, TechListResponse
from app.services.technician_service import (
    create_technician,
    get_technician,
    update_technician,
    list_technicians,
    get_technicians_geojson,
    find_nearby,
)

router = APIRouter()


@router.get("", response_model=TechListResponse)
async def get_techs(
    country: str = None,
    skills: str = None,
    availability: str = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    techs, total = await list_technicians(country, skills, availability, page, per_page)
    return {"data": techs, "total": total, "page": page, "per_page": per_page}


@router.get("/map")
async def techs_map(skills: str = None, user: dict = Depends(get_current_user)):
    return await get_technicians_geojson(skills)


@router.get("/nearby")
async def nearby(
    lng: float = Query(...),
    lat: float = Query(...),
    max_km: float = Query(100),
    skills: str = None,
    user: dict = Depends(get_current_user),
):
    techs = await find_nearby(lng, lat, max_km, skills)
    return {"data": techs, "total": len(techs)}


@router.get("/{tech_id}", response_model=TechResponse)
async def get_tech(tech_id: str, user: dict = Depends(get_current_user)):
    tech = await get_technician(tech_id)
    return {"data": tech}


@router.post("", response_model=TechResponse)
async def create(body: TechCreate, user: dict = Depends(get_current_user)):
    tech = await create_technician(body.model_dump())
    return {"data": tech, "message": "Technician created"}


@router.patch("/{tech_id}", response_model=TechResponse)
async def patch(tech_id: str, body: TechUpdate, user: dict = Depends(get_current_user)):
    tech = await update_technician(tech_id, body.model_dump(exclude_unset=True))
    return {"data": tech, "message": "Technician updated"}
