"""
InsiteIQ v1 Modo 1 — Sites routes
Read-only for now. Site creation goes via seed or admin UI (Fase 1+).
Full Site Bible CRUD lands in Fase 5 with Domain 10 Knowledge.
"""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db

router = APIRouter(prefix="/sites", tags=["sites"])


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("")
async def list_sites(
    organization_id: str | None = None,
    country: str | None = None,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    query: dict = {"tenant_id": user.tenant_id}
    if organization_id:
        query["organization_id"] = organization_id
    if country:
        query["country"] = country

    # Client_coordinator users only see their own org's sites
    client_mem = user.membership_in("client_coordinator")
    if client_mem and client_mem.get("organization_id"):
        query["organization_id"] = client_mem["organization_id"]

    docs = await db.sites.find(query).sort("name", 1).limit(500).to_list(500)
    return [_serialize(d) for d in docs]


@router.get("/{site_id}")
async def get_site(site_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    try:
        doc = await db.sites.find_one({"_id": ObjectId(site_id), "tenant_id": user.tenant_id})
    except Exception:
        doc = None

    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Site not found")

    # Client isolation
    client_mem = user.membership_in("client_coordinator")
    if client_mem and client_mem.get("organization_id"):
        if doc.get("organization_id") != client_mem["organization_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-tenant site access forbidden")

    return _serialize(doc)
