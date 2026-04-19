"""
InsiteIQ v1 Foundation — Users directory (read-only, minimal).

Expone un directorio reducido del tenant para que el frontend pueda
resolver actor_user_id -> name sin tener que pre-fetchear cada user
individualmente. No expone hash, password_changed_at, etc.

Access:
  - srs_coordinators: ven todos los users del tenant
  - tech_field + client_coordinator: ven solo a si mismos + usuarios
    con los que comparten un work_order activo (computado on-demand).
    Pragmático: permite mostrar nombres en threads/reports sin revelar
    el directorio completo.

Write ops (create/disable) se hacen por seed o por Admin UI futuro.
"""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db

router = APIRouter(prefix="/users", tags=["users"])


def _shape(doc: dict) -> dict:
    """Safe public shape for a user document."""
    return {
        "id": str(doc["_id"]),
        "email": doc.get("email"),
        "full_name": doc.get("full_name"),
        "is_active": doc.get("is_active", True),
        "employment_type": doc.get("employment_type"),
        "memberships": [
            {
                "space": m.get("space"),
                "role": m.get("role"),
                "authority_level": m.get("authority_level"),
                "organization_id": m.get("organization_id"),
                "active": m.get("active", True),
            }
            for m in doc.get("space_memberships", [])
        ],
    }


async def _visible_ids_for_narrow_scope(db, user: CurrentUser) -> set[str]:
    """
    Collect user_ids referenced by work_orders this user can see.
    Used when the caller is NOT SRS coord (tech / client) so we only
    expose names of people they actually interact with.
    """
    q: dict = {"tenant_id": user.tenant_id}
    if user.has_space("tech_field"):
        q["assigned_tech_user_id"] = user.user_id
    elif user.has_space("client_coordinator"):
        m = user.membership_in("client_coordinator")
        if m and m.get("organization_id"):
            q["organization_id"] = m["organization_id"]

    ids: set[str] = {user.user_id}
    async for wo in db.work_orders.find(q, {
        "assigned_tech_user_id": 1,
        "srs_coordinator_user_id": 1,
        "noc_operator_user_id": 1,
        "onsite_resident_user_id": 1,
    }):
        for key in (
            "assigned_tech_user_id",
            "srs_coordinator_user_id",
            "noc_operator_user_id",
            "onsite_resident_user_id",
        ):
            v = wo.get(key)
            if v:
                ids.add(v)
    return ids


@router.get("")
async def list_users(user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    if user.has_space("srs_coordinators"):
        cursor = db.users.find({"tenant_id": user.tenant_id})
        docs = await cursor.to_list(500)
        return [_shape(d) for d in docs]

    # Narrow scope for tech / client
    ids = await _visible_ids_for_narrow_scope(db, user)
    oids = []
    for i in ids:
        try:
            oids.append(ObjectId(i))
        except Exception:
            pass
    if not oids:
        return []
    cursor = db.users.find({"_id": {"$in": oids}, "tenant_id": user.tenant_id})
    docs = await cursor.to_list(500)
    return [_shape(d) for d in docs]
