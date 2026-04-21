"""
InsiteIQ v1 Modo 1 — Sites routes
Read-only + admin create/update (SRS owner/director).
Full Site Bible CRUD (known_issues, device_bible links, confidence workflow)
lands in Fase 5 with Domain 10 Knowledge.
"""
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.models.site import SiteContact

router = APIRouter(prefix="/sites", tags=["sites"])


OWNER_AUTHORITY = {"owner", "director"}


def _is_admin(user: CurrentUser) -> bool:
    if not user.has_space("srs_coordinators"):
        return False
    m = user.membership_in("srs_coordinators")
    return bool(m and m.get("authority_level") in OWNER_AUTHORITY)


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


# ---------------- Create / Update (SRS admin only) ----------------

class CreateSiteBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    organization_id: str
    code: str | None = None
    name: str
    country: str  # ISO-3166 alpha-2
    city: str | None = None
    address: str | None = None
    timezone: str | None = None
    onsite_contact: SiteContact | None = None
    has_physical_resident: bool = False
    default_noc_operator_user_id: str | None = None
    access_notes: str | None = None
    notes: str | None = None


class UpdateSiteBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    code: str | None = None
    name: str | None = None
    country: str | None = None
    city: str | None = None
    address: str | None = None
    timezone: str | None = None
    onsite_contact: SiteContact | None = None
    has_physical_resident: bool | None = None
    default_noc_operator_user_id: str | None = None
    access_notes: str | None = None
    status: str | None = None
    notes: str | None = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_site(
    body: CreateSiteBody, user: CurrentUser = Depends(get_current_user)
):
    if not _is_admin(user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Solo SRS owner/director puede crear sites"
        )

    db = get_db()
    # Verify the org exists in tenant
    try:
        org = await db.organizations.find_one(
            {"_id": ObjectId(body.organization_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        org = None
    if not org:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "organization_id not found")

    now = datetime.now(timezone.utc)
    doc = {
        "tenant_id": user.tenant_id,
        "organization_id": body.organization_id,
        "code": body.code,
        "name": body.name,
        "country": body.country.upper() if body.country else None,
        "city": body.city,
        "address": body.address,
        "timezone": body.timezone,
        "onsite_contact": body.onsite_contact.model_dump() if body.onsite_contact else None,
        "has_physical_resident": body.has_physical_resident,
        "default_noc_operator_user_id": body.default_noc_operator_user_id,
        "access_notes": body.access_notes,
        "status": "active",
        "notes": body.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    result = await db.sites.insert_one(doc)
    new_id = str(result.inserted_id)

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="site.create",
        entity_refs=[
            {"collection": "sites", "id": new_id, "label": body.code or body.name},
            {"collection": "organizations", "id": body.organization_id, "label": org.get("legal_name")},
        ],
        context_snapshot={
            "name": body.name,
            "country": body.country,
            "has_physical_resident": body.has_physical_resident,
        },
    )

    return _serialize({**doc, "_id": result.inserted_id})


@router.patch("/{site_id}")
async def update_site(
    site_id: str,
    body: UpdateSiteBody,
    user: CurrentUser = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Solo SRS owner/director puede actualizar sites"
        )

    db = get_db()
    try:
        oid = ObjectId(site_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid site_id")

    doc = await db.sites.find_one({"_id": oid, "tenant_id": user.tenant_id})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Site not found")

    patch: dict = {}
    for field in (
        "code", "name", "country", "city", "address", "timezone",
        "has_physical_resident", "default_noc_operator_user_id",
        "access_notes", "status", "notes",
    ):
        val = getattr(body, field, None)
        if val is not None:
            patch[field] = val.upper() if field == "country" else val
    if body.onsite_contact is not None:
        patch["onsite_contact"] = body.onsite_contact.model_dump()

    if not patch:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nada para actualizar")

    now = datetime.now(timezone.utc)
    patch["updated_at"] = now
    patch["updated_by"] = user.user_id

    await db.sites.update_one({"_id": oid}, {"$set": patch})

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="site.update",
        entity_refs=[{"collection": "sites", "id": site_id, "label": doc.get("code") or doc.get("name")}],
        context_snapshot={"fields": list(patch.keys())},
    )

    refreshed = await db.sites.find_one({"_id": oid})
    return _serialize(refreshed)
