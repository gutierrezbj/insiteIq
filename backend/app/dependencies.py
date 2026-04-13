from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

from app.database import get_db
from app.utils.security import decode_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    db = get_db()
    from bson import ObjectId

    user = await db.users.find_one({"_id": ObjectId(payload["sub"]), "is_active": True})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    user["id"] = str(user.pop("_id"))
    return user


def require_role(*roles: str):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return role_checker


# ── Multi-tenant filter ──────────────────────────────────────────────
# Internal roles (admin, coordinator, supervisor) see everything.
# Client role only sees data belonging to their organization.
# Technician sees their own assignments (handled separately per route).

INTERNAL_ROLES = {"admin", "coordinator", "supervisor"}


def client_filter(user: dict, field: str = "client") -> dict:
    """Return a MongoDB query filter that scopes data to the user's org.
    Internal users get {}, client users get {field: org_name}."""
    if user.get("role") in INTERNAL_ROLES:
        return {}
    org = user.get("organization")
    if not org:
        return {}  # Fallback: no filter if org missing (shouldn't happen)
    return {field: org}
