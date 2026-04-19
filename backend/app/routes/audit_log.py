"""
InsiteIQ v1 Foundation — audit_log read routes (append-only DB, read API).

Principio #7: "Nuestro corazón guarda todo." La escritura pasa siempre
por el middleware. Este router sólo lee.

Read scope:
  - srs_coordinators: tenant-wide. Pueden filtrar por action, actor, entity.
  - Otros: 403. Audit log es interno SRS (Principio #4 "la ropa se lava en casa").

Endpoints:
  GET /api/audit-log                    lista paginada + filtros
  GET /api/audit-log/{id}               detalle (contexto completo)
"""
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db

router = APIRouter(prefix="/audit-log", tags=["audit_log"])


def _shape(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "tenant_id": doc.get("tenant_id"),
        "actor_user_id": doc.get("actor_user_id"),
        "action": doc.get("action"),
        "entity_refs": doc.get("entity_refs") or [],
        "context_snapshot": doc.get("context_snapshot") or {},
        "ip": doc.get("ip"),
        "method": doc.get("method"),
        "path": doc.get("path"),
        "ts": doc.get("ts") or doc.get("created_at"),
    }


@router.get("")
async def list_audit(
    action: str | None = None,
    action_prefix: str | None = None,
    actor_user_id: str | None = None,
    entity_collection: str | None = None,
    entity_id: str | None = None,
    since: str | None = None,
    limit: int = 100,
    user: CurrentUser = Depends(get_current_user),
):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Audit log is SRS-internal")

    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    q: dict = {"tenant_id": user.tenant_id}
    if action:
        q["action"] = action
    elif action_prefix:
        q["action"] = {"$regex": f"^{action_prefix}"}
    if actor_user_id:
        q["actor_user_id"] = actor_user_id
    if entity_collection or entity_id:
        elem: dict = {}
        if entity_collection:
            elem["collection"] = entity_collection
        if entity_id:
            elem["id"] = entity_id
        q["entity_refs"] = {"$elemMatch": elem}
    if since:
        try:
            q["ts"] = {"$gte": datetime.fromisoformat(since)}
        except Exception:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Invalid 'since' ISO datetime"
            )

    # Timestamp key may vary — sort by _id desc (ObjectId is time-sortable)
    cursor = db.audit_log.find(q).sort("_id", -1).limit(min(limit, 500))
    docs = await cursor.to_list(None)
    return [_shape(d) for d in docs]


@router.get("/{entry_id}")
async def get_audit_entry(
    entry_id: str, user: CurrentUser = Depends(get_current_user)
):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Audit log is SRS-internal")

    db = get_db()
    try:
        doc = await db.audit_log.find_one(
            {"_id": ObjectId(entry_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Audit entry not found")
    return _shape(doc)
