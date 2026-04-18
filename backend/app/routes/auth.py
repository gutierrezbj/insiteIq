"""
InsiteIQ v1 Foundation — Auth routes
Login + refresh token. No registration endpoint (users provisioned by SRS admin / seed).

Domain audit event is written on successful login so we can forensically trace
who accessed the system and when, even if HTTP middleware output is rotated.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr

from app.core.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.middleware.audit_log import write_audit_event

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict  # minimal profile (id, email, full_name, memberships)


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/login", response_model=TokenPair)
async def login(body: LoginRequest):
    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    doc = await db.users.find_one({"email": body.email.lower()})
    if not doc or not doc.get("is_active", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    hashed = doc.get("hashed_password")
    if not hashed or not verify_password(body.password, hashed):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    user_id = str(doc["_id"])
    tenant_id = doc["tenant_id"]
    memberships_raw = doc.get("space_memberships", [])
    # Only active memberships enter the JWT
    memberships = [
        {
            "space": m["space"],
            "role": m.get("role", ""),
            "authority_level": m.get("authority_level", "mid_manager"),
            "organization_id": m.get("organization_id"),
        }
        for m in memberships_raw
        if m.get("active", True)
    ]

    if not memberships:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "User has no active space memberships — contact SRS admin",
        )

    access = create_access_token(
        subject=user_id, tenant_id=tenant_id, memberships=memberships
    )
    refresh = create_refresh_token(subject=user_id, tenant_id=tenant_id)

    # Rich audit entry for login event
    await write_audit_event(
        db,
        tenant_id=tenant_id,
        actor_user_id=user_id,
        action="auth.login",
        entity_refs=[{"collection": "users", "id": user_id, "label": doc.get("full_name")}],
        context_snapshot={"email": body.email, "spaces": [m["space"] for m in memberships]},
    )

    return TokenPair(
        access_token=access,
        refresh_token=refresh,
        user={
            "id": user_id,
            "email": doc["email"],
            "full_name": doc.get("full_name"),
            "memberships": memberships,
        },
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: RefreshRequest):
    try:
        payload = decode_token(body.refresh_token)
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong token type")

    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    from bson import ObjectId  # lazy import to keep module boot light

    user_id = payload["sub"]
    try:
        doc = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        doc = await db.users.find_one({"_id": user_id})

    if not doc or not doc.get("is_active", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not active")

    memberships = [
        {
            "space": m["space"],
            "role": m.get("role", ""),
            "authority_level": m.get("authority_level", "mid_manager"),
            "organization_id": m.get("organization_id"),
        }
        for m in doc.get("space_memberships", [])
        if m.get("active", True)
    ]

    new_access = create_access_token(
        subject=user_id, tenant_id=doc["tenant_id"], memberships=memberships
    )
    new_refresh = create_refresh_token(subject=user_id, tenant_id=doc["tenant_id"])

    return TokenPair(
        access_token=new_access,
        refresh_token=new_refresh,
        user={
            "id": user_id,
            "email": doc["email"],
            "full_name": doc.get("full_name"),
            "memberships": memberships,
        },
    )


@router.get("/me")
async def me(user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    profile_extras = {}
    if db is not None:
        try:
            from bson import ObjectId
            doc = await db.users.find_one(
                {"_id": ObjectId(user.user_id)},
                {"must_change_password": 1, "email": 1, "full_name": 1, "password_changed_at": 1},
            )
            if doc:
                profile_extras = {
                    "email": doc.get("email"),
                    "full_name": doc.get("full_name"),
                    "must_change_password": bool(doc.get("must_change_password")),
                    "password_changed_at": doc.get("password_changed_at"),
                }
        except Exception:
            pass
    return {
        "id": user.user_id,
        "tenant_id": user.tenant_id,
        "memberships": user.memberships,
        **profile_extras,
    }


class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    body: ChangePasswordBody,
    user: CurrentUser = Depends(get_current_user),
):
    """
    User rotates their own password. Requires current password. Clears the
    must_change_password flag. Audited.
    """
    if len(body.new_password) < 10:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "New password must be at least 10 characters",
        )
    if body.new_password == body.current_password:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "New password must differ from current",
        )

    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    from bson import ObjectId
    try:
        doc = await db.users.find_one({"_id": ObjectId(user.user_id)})
    except Exception:
        doc = None
    if not doc or not doc.get("is_active", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not active")

    hashed = doc.get("hashed_password")
    if not hashed or not verify_password(body.current_password, hashed):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Current password invalid")

    from datetime import datetime, timezone
    from app.core.security import hash_password

    now = datetime.now(timezone.utc)
    new_hash = hash_password(body.new_password)
    await db.users.update_one(
        {"_id": ObjectId(user.user_id)},
        {
            "$set": {
                "hashed_password": new_hash,
                "must_change_password": False,
                "password_changed_at": now,
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="auth.change_password",
        entity_refs=[{"collection": "users", "id": user.user_id}],
        context_snapshot={"self_rotation": True},
    )

    return {"ok": True, "password_changed_at": now.isoformat()}
