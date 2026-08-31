"""
InsiteIQ — Notifications routes (Sprint Afinar · 2026-08-31)

Endpoints (bajo /api/notifications):
  GET  /                → lista del usuario actual (unread_only + limit)
  GET  /unread-count    → {"unread": N, "ball_to_me": M} · para el badge
  POST /{id}/read       → marca UNA como leída
  POST /read-all        → marca todas como leídas

Solo tus propias notificaciones · el filtro user_id es SIEMPRE el del JWT
(no hay forma de leer las de otro usuario).

Las lecturas NO se auditan (serían ruido) · el middleware de audit solo
intercepta mutaciones y estas son idempotentes de bajo valor forense.
"""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _serialize(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "event_type": doc.get("event_type"),
        "entity_type": doc.get("entity_type"),
        "entity_id": doc.get("entity_id"),
        "title": doc.get("title"),
        "body": doc.get("body"),
        "ball_to_me": bool(doc.get("ball_to_me")),
        "cta_url": doc.get("cta_url"),
        "read_at": doc.get("read_at"),
        "actor_user_id": doc.get("actor_user_id"),
        "created_at": doc.get("created_at"),
    }


@router.get("")
async def list_notifications(
    user: CurrentUser = Depends(get_current_user),
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
):
    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")
    q: dict = {"tenant_id": user.tenant_id, "user_id": user.user_id}
    if unread_only:
        q["read_at"] = None
    cursor = db.notifications.find(q).sort("created_at", -1).limit(limit)
    return [_serialize(d) async for d in cursor]


@router.get("/unread-count")
async def unread_count(user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")
    base = {"tenant_id": user.tenant_id, "user_id": user.user_id, "read_at": None}
    unread = await db.notifications.count_documents(base)
    ball = await db.notifications.count_documents({**base, "ball_to_me": True})
    return {"unread": unread, "ball_to_me": ball}


@router.post("/read-all")
async def read_all(user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")
    from datetime import datetime, timezone
    result = await db.notifications.update_many(
        {"tenant_id": user.tenant_id, "user_id": user.user_id, "read_at": None},
        {"$set": {"read_at": datetime.now(timezone.utc)}},
    )
    return {"marked": result.modified_count}


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")
    try:
        oid = ObjectId(notification_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid notification id")
    from datetime import datetime, timezone
    result = await db.notifications.update_one(
        {"_id": oid, "tenant_id": user.tenant_id, "user_id": user.user_id},
        {"$set": {"read_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    return {"ok": True}
