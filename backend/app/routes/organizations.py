"""
InsiteIQ v1 Foundation — Organizations directory + admin create/update.

Read: SRS ve todo; client ve su org.
Write: SRS owner/director only — crear nuevos clientes / channel partners / vendors.
"""
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.models.organization import PartnerRelationship

router = APIRouter(prefix="/organizations", tags=["organizations"])


OWNER_AUTHORITY = {"owner", "director"}


def _is_admin(user: CurrentUser) -> bool:
    if not user.has_space("srs_coordinators"):
        return False
    m = user.membership_in("srs_coordinators")
    return bool(m and m.get("authority_level") in OWNER_AUTHORITY)


def _shape(doc: dict) -> dict:
    rel = doc.get("partner_relationships") or []
    return {
        "id": str(doc["_id"]),
        "legal_name": doc.get("legal_name"),
        "display_name": doc.get("display_name"),
        "country": doc.get("country"),
        "jurisdiction": doc.get("jurisdiction"),
        "status": doc.get("status"),
        "partner_relationships": [
            {
                "type": r.get("type"),
                "status": r.get("status"),
                "contract_ref": r.get("contract_ref"),
                "started_at": r.get("started_at"),
                "ended_at": r.get("ended_at"),
                "commission_rule": r.get("commission_rule"),
                "revenue_split_pct": r.get("revenue_split_pct"),
                "cost_split_pct": r.get("cost_split_pct"),
                "notes": r.get("notes"),
            }
            for r in rel
        ],
        "active_roles": sorted(
            {r.get("type") for r in rel if r.get("status") == "active"}
        ),
        "notes": doc.get("notes"),
    }


@router.get("")
async def list_organizations(user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    if user.has_space("srs_coordinators"):
        cursor = db.organizations.find({"tenant_id": user.tenant_id}).sort(
            "legal_name", 1
        )
        docs = await cursor.to_list(500)
        return [_shape(d) for d in docs]

    # Client coord: only their own org
    m = user.membership_in("client_coordinator")
    if m and m.get("organization_id"):
        try:
            doc = await db.organizations.find_one(
                {"_id": ObjectId(m["organization_id"]), "tenant_id": user.tenant_id}
            )
        except Exception:
            doc = None
        return [_shape(doc)] if doc else []

    return []


@router.get("/{org_id}")
async def get_organization(
    org_id: str, user: CurrentUser = Depends(get_current_user)
):
    db = get_db()
    try:
        doc = await db.organizations.find_one(
            {"_id": ObjectId(org_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")

    # Client isolation
    if not user.has_space("srs_coordinators"):
        m = user.membership_in("client_coordinator")
        if not m or m.get("organization_id") != org_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your organization")

    return _shape(doc)


# ---------------- Create / Update (SRS admin only) ----------------

class CreateOrgBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    legal_name: str
    display_name: str | None = None
    country: str | None = None
    jurisdiction: str | None = None
    tax_ids: dict = Field(default_factory=dict)
    partner_relationships: list[PartnerRelationship] = Field(default_factory=list)
    notes: str | None = None


class UpdateOrgBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    legal_name: str | None = None
    display_name: str | None = None
    country: str | None = None
    jurisdiction: str | None = None
    tax_ids: dict | None = None
    partner_relationships: list[PartnerRelationship] | None = None
    status: str | None = None
    notes: str | None = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_org(body: CreateOrgBody, user: CurrentUser = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Solo SRS owner/director puede crear orgs",
        )
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        "tenant_id": user.tenant_id,
        "legal_name": body.legal_name,
        "display_name": body.display_name,
        "country": body.country,
        "jurisdiction": body.jurisdiction,
        "tax_ids": body.tax_ids or {},
        "bank_accounts": [],
        "partner_relationships": [r.model_dump() for r in body.partner_relationships],
        "status": "active",
        "notes": body.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    result = await db.organizations.insert_one(doc)
    new_id = str(result.inserted_id)

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="organization.create",
        entity_refs=[{"collection": "organizations", "id": new_id, "label": body.legal_name}],
        context_snapshot={
            "legal_name": body.legal_name,
            "country": body.country,
            "roles": [r.type for r in body.partner_relationships],
        },
    )

    return _shape({**doc, "_id": result.inserted_id})


@router.patch("/{org_id}")
async def update_org(
    org_id: str,
    body: UpdateOrgBody,
    user: CurrentUser = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Solo SRS owner/director puede actualizar orgs",
        )
    db = get_db()
    try:
        oid = ObjectId(org_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid org_id")

    doc = await db.organizations.find_one({"_id": oid, "tenant_id": user.tenant_id})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")

    patch: dict = {}
    for field in ("legal_name", "display_name", "country", "jurisdiction", "tax_ids", "status", "notes"):
        val = getattr(body, field, None)
        if val is not None:
            patch[field] = val
    if body.partner_relationships is not None:
        patch["partner_relationships"] = [r.model_dump() for r in body.partner_relationships]

    if not patch:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nada para actualizar")

    now = datetime.now(timezone.utc)
    patch["updated_at"] = now
    patch["updated_by"] = user.user_id

    await db.organizations.update_one({"_id": oid}, {"$set": patch})

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="organization.update",
        entity_refs=[{"collection": "organizations", "id": org_id, "label": doc.get("legal_name")}],
        context_snapshot={"fields": list(patch.keys())},
    )

    refreshed = await db.organizations.find_one({"_id": oid})
    return _shape(refreshed)
