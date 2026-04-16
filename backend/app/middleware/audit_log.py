"""
InsiteIQ v1 Foundation — audit_log middleware
"Nuestro corazon guarda todo." Principle #7 Blueprint v1.1.

Every mutating HTTP request (POST/PUT/PATCH/DELETE) appends an immutable entry to
the audit_log collection. Append-only, no DELETE or UPDATE from application code.

Design choices:
- Middleware captures the HTTP envelope (method, path, status, actor, duration).
- Business-level entity changes are appended by domain code via `write_audit_event()`
  helper so the entry carries entity_refs + context_snapshot with rich detail.
- The middleware guarantees NO mutation is silently untracked: even if domain code
  forgets to call the helper, the HTTP envelope is in the log.
"""
import time
from datetime import datetime, timezone
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Paths we never audit (health probes, docs, openapi)
SKIP_PATHS = {"/health", "/api/health", "/docs", "/openapi.json", "/redoc"}


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Intercepts every request, appends envelope entry on mutations."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response: Response = await call_next(request)
        duration_ms = int((time.perf_counter() - start) * 1000)

        method = request.method.upper()
        path = request.url.path

        if method in MUTATING_METHODS and path not in SKIP_PATHS:
            try:
                from app.database import get_db

                db = get_db()
                if db is not None:
                    actor = _extract_actor(request)
                    entry = {
                        "ts": datetime.now(timezone.utc),
                        "source": "http_middleware",
                        "tenant_id": actor["tenant_id"],
                        "actor_user_id": actor["user_id"],
                        "actor_memberships": actor["memberships"],
                        "action": f"{method} {path}",
                        "http_method": method,
                        "http_path": path,
                        "http_status": response.status_code,
                        "duration_ms": duration_ms,
                        "client_ip": _client_ip(request),
                        "entity_refs": [],  # filled by domain helper if available
                        "context_snapshot": {},  # filled by domain helper if available
                    }
                    # append-only — never update/delete
                    await db.audit_log.insert_one(entry)
            except Exception:
                # audit MUST NOT break the request; log & continue.
                # In production this goes to stderr -> SA99 telegram.
                import traceback

                traceback.print_exc()

        return response


def _extract_actor(request: Request) -> dict[str, Any]:
    """
    Actor may be set by get_current_user dep (populates request.state.current_user)
    or be anonymous (login, public endpoints).
    """
    user = getattr(request.state, "current_user", None)
    if user is None:
        return {"user_id": None, "tenant_id": None, "memberships": []}
    return {
        "user_id": user.user_id,
        "tenant_id": user.tenant_id,
        "memberships": user.memberships,
    }


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


async def write_audit_event(
    db,
    *,
    tenant_id: str,
    actor_user_id: str | None,
    action: str,
    entity_refs: list[dict],
    context_snapshot: dict,
    source: str = "domain",
) -> None:
    """
    Append a domain-level audit entry.

    Called by route handlers / services after mutating business entities.
    This is the RICH entry (entity_refs + context_snapshot with diffs).
    The HTTP envelope entry written by the middleware is the COARSE one.
    Together they form a complete forensic trail.
    """
    await db.audit_log.insert_one(
        {
            "ts": datetime.now(timezone.utc),
            "source": source,
            "tenant_id": tenant_id,
            "actor_user_id": actor_user_id,
            "action": action,
            "entity_refs": entity_refs,
            "context_snapshot": context_snapshot,
        }
    )
