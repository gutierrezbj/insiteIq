"""
InsiteIQ v1 Modo 1 — ServiceAgreement routes
Read-only. Creation via seed / admin UI (Fase 1+).
Shield level definitions live in the model (SHIELD_DEFAULTS).
"""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.models.service_agreement import SHIELD_DEFAULTS

router = APIRouter(prefix="/service-agreements", tags=["service_agreements"])


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/shield-levels")
async def list_shield_levels():
    """Public to authenticated users — describes the catalog of Shield SLAs."""
    return {"levels": SHIELD_DEFAULTS}


@router.get("")
async def list_agreements(
    organization_id: str | None = None,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    query: dict = {"tenant_id": user.tenant_id}
    if organization_id:
        query["organization_id"] = organization_id

    client_mem = user.membership_in("client_coordinator")
    if client_mem and client_mem.get("organization_id"):
        query["organization_id"] = client_mem["organization_id"]

    docs = await db.service_agreements.find(query).sort("title", 1).limit(200).to_list(200)
    return [_serialize(d) for d in docs]


@router.get("/{agreement_id}")
async def get_agreement(agreement_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    try:
        doc = await db.service_agreements.find_one(
            {"_id": ObjectId(agreement_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        doc = None

    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agreement not found")

    client_mem = user.membership_in("client_coordinator")
    if client_mem and client_mem.get("organization_id"):
        if doc.get("organization_id") != client_mem["organization_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-tenant access forbidden")

    return _serialize(doc)
