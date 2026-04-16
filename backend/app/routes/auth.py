"""
InsiteIQ v1 Foundation — Auth routes
Login + refresh token. No registration endpoint (users provisioned by SRS admin / seed).

Domain audit event is written on successful login so we can forensically trace
who accessed the system and when, even if HTTP middleware output is rotated.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
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
    return {
        "id": user.user_id,
        "tenant_id": user.tenant_id,
        "memberships": user.memberships,
    }
