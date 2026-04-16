"""
InsiteIQ v1 Foundation — FastAPI dependencies
Auth extraction + RBAC enforcement by space.

Usage:
    @router.get("/work-orders")
    async def list_wo(user: CurrentUser = Depends(require_space("srs_coordinators"))):
        ...
"""
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser:
    """Resolved identity carried through the request lifecycle."""

    def __init__(self, *, user_id: str, tenant_id: str, memberships: list[dict]):
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.memberships = memberships

    def has_space(self, space: str) -> bool:
        return any(m["space"] == space for m in self.memberships)

    def membership_in(self, space: str) -> dict | None:
        return next((m for m in self.memberships if m["space"] == space), None)

    def authority_level_in(self, space: str) -> str | None:
        m = self.membership_in(space)
        return m["authority_level"] if m else None


async def get_current_user(
    request: Request,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> CurrentUser:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    try:
        payload = decode_token(creds.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Wrong token type")

    user = CurrentUser(
        user_id=payload["sub"],
        tenant_id=payload["tenant_id"],
        memberships=payload.get("memberships", []),
    )
    # Expose on request.state so audit middleware can read actor without re-decoding
    request.state.current_user = user
    return user


def require_space(space: str):
    """
    Endpoint dependency: user must be a member of the given space.
    Spaces: srs_coordinators | client_coordinator | tech_field
    """
    async def _dep(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not user.has_space(space):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail=f"User not member of space '{space}'",
            )
        return user

    return _dep


def require_authority(space: str, minimum: str):
    """
    Enforce minimum authority_level within a given space.
    Authority hierarchy (ascending):
        reports_only < contractor < approval_on_site < mid_manager < director < owner
    """
    order = [
        "reports_only",
        "contractor",
        "approval_on_site",
        "mid_manager",
        "director",
        "owner",
    ]

    async def _dep(user: CurrentUser = Depends(require_space(space))) -> CurrentUser:
        level = user.authority_level_in(space)
        if level is None or order.index(level) < order.index(minimum):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail=f"Requires authority >= {minimum} in {space}",
            )
        return user

    return _dep
