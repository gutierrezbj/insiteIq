"""
InsiteIQ v1 Foundation — Health endpoint
Consumed by healthcheck.sh + SA99 InfraService + Docker healthcheck.
No auth, no audit_log (path in SKIP_PATHS).
"""
from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import settings
from app.database import get_db

router = APIRouter(tags=["health"])


# Exposed at BOTH /health (local/docker healthcheck) and /api/health (via nginx)
# See main.py where this router is included twice.
@router.get("/health")
async def health():
    db = get_db()
    mongo_ok = False
    if db is not None:
        try:
            await db.command("ping")
            mongo_ok = True
        except Exception:
            mongo_ok = False

    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "env": settings.APP_ENV,
        "ts": datetime.now(timezone.utc).isoformat(),
        "mongo": "ok" if mongo_ok else "down",
    }
