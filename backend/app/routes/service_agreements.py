"""
InsiteIQ v1 — ServiceAgreement routes.
Read for all tenant users (scoped). PATCH rate_card for SRS owner/director (X-a).
Creation del agreement aun via seed — create UI llegara con rate card completa.
"""
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.models.service_agreement import RateCard, SHIELD_DEFAULTS

router = APIRouter(prefix="/service-agreements", tags=["service_agreements"])


OWNER_AUTHORITY = {"owner", "director"}


def _is_admin(user: CurrentUser) -> bool:
    if not user.has_space("srs_coordinators"):
        return False
    m = user.membership_in("srs_coordinators")
    return bool(m and m.get("authority_level") in OWNER_AUTHORITY)


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


# ---------------- PATCH rate_card + threshold (SRS admin only, X-a) ----------------

class AgreementPatchBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    rate_card: RateCard | None = None
    parts_approval_threshold_usd: float | None = None
    currency: str | None = None
    srs_entity_id: str | None = None
    starts_at: str | None = None
    ends_at: str | None = None
    notes: str | None = None
    active: bool | None = None


@router.patch("/{agreement_id}")
async def patch_agreement(
    agreement_id: str,
    body: AgreementPatchBody,
    user: CurrentUser = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Solo SRS owner/director puede actualizar agreements",
        )

    db = get_db()
    try:
        oid = ObjectId(agreement_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid agreement_id")

    doc = await db.service_agreements.find_one(
        {"_id": oid, "tenant_id": user.tenant_id}
    )
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agreement not found")

    patch: dict = {}
    if body.rate_card is not None:
        patch["rate_card"] = body.rate_card.model_dump()
    if body.parts_approval_threshold_usd is not None:
        patch["parts_approval_threshold_usd"] = float(body.parts_approval_threshold_usd)
    if body.currency is not None:
        patch["currency"] = body.currency.upper()
    if body.srs_entity_id is not None:
        patch["srs_entity_id"] = body.srs_entity_id
    if body.starts_at is not None:
        patch["starts_at"] = body.starts_at
    if body.ends_at is not None:
        patch["ends_at"] = body.ends_at
    if body.notes is not None:
        patch["notes"] = body.notes
    if body.active is not None:
        patch["active"] = body.active

    if not patch:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nada para actualizar")

    now = datetime.now(timezone.utc)
    patch["updated_at"] = now
    patch["updated_by"] = user.user_id

    await db.service_agreements.update_one({"_id": oid}, {"$set": patch})

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="service_agreement.patch",
        entity_refs=[
            {"collection": "service_agreements", "id": agreement_id, "label": doc.get("title")}
        ],
        context_snapshot={"fields": list(patch.keys())},
    )

    refreshed = await db.service_agreements.find_one({"_id": oid})
    return _serialize(refreshed)
