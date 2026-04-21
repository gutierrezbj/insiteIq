"""
InsiteIQ v1 Foundation — Users directory + admin create/update.

Read:
  - srs_coordinators: ven todos los users del tenant
  - tech_field + client_coordinator: narrow scope (solo users con WOs compartidas)

Write (SRS owner/director authority only):
  - POST /api/users       crea user con temp_password + must_change_password=true
  - PATCH /api/users/{id} actualiza full_name, phone, country, memberships,
                          is_active (desactivar en vez de borrar)

Returns temp_password solo en POST response (el SRS coord copia + comparte
fuera de banda). Nunca se persiste en clear — se hashea y guarda el hash.
"""
import secrets
import string
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.dependencies import CurrentUser, get_current_user
from app.core.security import hash_password
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.models.user import AuthorityLevel, EmploymentType, Space

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


# ---------------- Create / Update (SRS admin only) ----------------

OWNER_AUTHORITY = {"owner", "director"}


def _is_admin(user: CurrentUser) -> bool:
    """Only SRS coord with director+ authority can write users/orgs/sites."""
    if not user.has_space("srs_coordinators"):
        return False
    m = user.membership_in("srs_coordinators")
    return bool(m and m.get("authority_level") in OWNER_AUTHORITY)


def _gen_temp_password(length: int = 12) -> str:
    """URL-safe temp password without ambiguous chars (0/O/1/l/I)."""
    alphabet = (
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
    )
    return "".join(secrets.choice(alphabet) for _ in range(length))


class MembershipBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    space: Space
    role: str
    authority_level: AuthorityLevel = "mid_manager"
    organization_id: str | None = None
    active: bool = True


class CreateUserBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    full_name: str
    phone: str | None = None
    country: str | None = None
    employment_type: EmploymentType = "plantilla"
    email_provisioned_by_srs: bool = False
    memberships: list[MembershipBody] = Field(default_factory=list)
    notes: str | None = None


class UpdateUserBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    full_name: str | None = None
    phone: str | None = None
    country: str | None = None
    is_active: bool | None = None
    employment_type: EmploymentType | None = None
    memberships: list[MembershipBody] | None = None
    notes: str | None = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_user(
    body: CreateUserBody, user: CurrentUser = Depends(get_current_user)
):
    if not _is_admin(user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Solo SRS owner/director puede crear users",
        )
    if not body.memberships:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Se requiere al menos una membership",
        )

    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    # Uniqueness: email within tenant
    existing = await db.users.find_one(
        {"tenant_id": user.tenant_id, "email": body.email.lower()}
    )
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Ya existe un user con email {body.email}",
        )

    temp = _gen_temp_password()
    now = datetime.now(timezone.utc)

    doc = {
        "tenant_id": user.tenant_id,
        "email": body.email.lower(),
        "full_name": body.full_name,
        "phone": body.phone,
        "country": body.country,
        "hashed_password": hash_password(temp),
        "is_active": True,
        "employment_type": body.employment_type,
        "email_provisioned_by_srs": body.email_provisioned_by_srs,
        "space_memberships": [m.model_dump() for m in body.memberships],
        "must_change_password": True,
        "password_changed_at": None,
        "last_login_at": None,
        "notes": body.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    result = await db.users.insert_one(doc)
    new_id = str(result.inserted_id)

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="user.create",
        entity_refs=[{"collection": "users", "id": new_id, "label": body.full_name}],
        context_snapshot={
            "email": body.email,
            "employment_type": body.employment_type,
            "memberships": [m.space for m in body.memberships],
        },
    )

    return {
        **_shape({**doc, "_id": result.inserted_id}),
        "temp_password": temp,  # solo en este response
    }


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    body: UpdateUserBody,
    user: CurrentUser = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Solo SRS owner/director puede actualizar users",
        )

    db = get_db()
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid user_id")

    doc = await db.users.find_one({"_id": oid, "tenant_id": user.tenant_id})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    patch: dict = {}
    if body.full_name is not None:
        patch["full_name"] = body.full_name
    if body.phone is not None:
        patch["phone"] = body.phone
    if body.country is not None:
        patch["country"] = body.country
    if body.is_active is not None:
        patch["is_active"] = body.is_active
    if body.employment_type is not None:
        patch["employment_type"] = body.employment_type
    if body.memberships is not None:
        patch["space_memberships"] = [m.model_dump() for m in body.memberships]
    if body.notes is not None:
        patch["notes"] = body.notes

    if not patch:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nada para actualizar")

    now = datetime.now(timezone.utc)
    patch["updated_at"] = now
    patch["updated_by"] = user.user_id

    await db.users.update_one({"_id": oid}, {"$set": patch})

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="user.update",
        entity_refs=[
            {"collection": "users", "id": user_id, "label": doc.get("full_name")}
        ],
        context_snapshot={"fields": list(patch.keys())},
    )

    refreshed = await db.users.find_one({"_id": oid})
    return _shape(refreshed)
