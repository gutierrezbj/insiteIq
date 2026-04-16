"""
InsiteIQ v1 Foundation — Security primitives
JWT + password hashing. No business logic, no DB access.
"""
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(
    *,
    subject: str,  # user_id
    tenant_id: str,
    memberships: list[dict],  # [{space, role, authority_level}]
    expires_delta: timedelta | None = None,
) -> str:
    """
    Issues a signed JWT. Payload carries tenant_id + space memberships so RBAC
    can be enforced at the endpoint decorator without another DB roundtrip.
    """
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.JWT_ACCESS_EXPIRE_MINUTES))
    payload = {
        "sub": subject,
        "tenant_id": tenant_id,
        "memberships": memberships,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(*, subject: str, tenant_id: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    payload = {
        "sub": subject,
        "tenant_id": tenant_id,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
