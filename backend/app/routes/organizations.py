"""
InsiteIQ v1 Foundation — Organizations read-only directory.

SRS coordinators see the full directory. Client coordinators see their
own organization + organizations they have a partner_relationship with
(thin slice — just the immediate ones we can show without cross-leakage).

Write ops (create / link partner_relationships) via Admin UI futuro +
seed hoy. This endpoint is for visibility.
"""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db

router = APIRouter(prefix="/organizations", tags=["organizations"])


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
