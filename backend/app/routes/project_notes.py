"""
InsiteIQ v1 — ProjectNotes routes (Iter 2.7 · Sprint Rollouts v2).

Endpoints:
  GET    /api/projects/{project_id}/notes        list scoped por espacio
  POST   /api/projects/{project_id}/notes        create · SRS only
  PATCH  /api/projects/{project_id}/notes/{id}   update · author only
  DELETE /api/projects/{project_id}/notes/{id}   soft delete · author only

RBAC enforced server-side:
  - SRS ven todas (tenant + project_id), escriben/editan/borran propias
  - Client coordinator ve solo visibility="shared"
  - Tech: 403
"""
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.models.project_note import NoteVisibility, ProjectNote


router = APIRouter(prefix="/projects/{project_id}/notes", tags=["project_notes"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _oid(s: str) -> ObjectId:
    try:
        return ObjectId(s)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"invalid id: {s}")


def _serialize(doc: dict[str, Any]) -> dict[str, Any]:
    out = dict(doc)
    out["id"] = str(out.pop("_id"))
    for k in ("created_at", "updated_at"):
        v = out.get(k)
        if isinstance(v, datetime):
            out[k] = v.isoformat()
    return out


# ---------------- schemas ----------------


class NoteCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    body: str
    visibility: NoteVisibility = "srs_internal"


class NoteUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    body: str | None = None
    visibility: NoteVisibility | None = None


# ---------------- helpers ----------------


async def _project_or_404(project_id: str, user: CurrentUser) -> dict[str, Any]:
    db = get_db()
    p = await db.projects.find_one({"_id": _oid(project_id), "tenant_id": user.tenant_id})
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "project not found")
    return p


async def _note_or_404(note_id: str, project_id: str, user: CurrentUser) -> dict[str, Any]:
    db = get_db()
    n = await db.project_notes.find_one(
        {
            "_id": _oid(note_id),
            "tenant_id": user.tenant_id,
            "project_id": project_id,
            "is_deleted": False,
        }
    )
    if not n:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "note not found")
    return n


def _can_read_note(doc: dict[str, Any], user: CurrentUser) -> bool:
    """RBAC for individual note read."""
    if user.has_space("srs_coordinators"):
        return True
    if user.has_space("client_coordinator"):
        return doc.get("visibility") == "shared"
    return False


# ---------------- list ----------------


@router.get("")
async def list_notes(
    project_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    await _project_or_404(project_id, user)
    db = get_db()

    q: dict[str, Any] = {
        "tenant_id": user.tenant_id,
        "project_id": project_id,
        "is_deleted": False,
    }

    # Scope: client coord only sees shared
    if not user.has_space("srs_coordinators"):
        if user.has_space("client_coordinator"):
            q["visibility"] = "shared"
        else:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Notes not available for this role")

    cursor = db.project_notes.find(q).sort("created_at", -1).limit(500)
    docs = await cursor.to_list(length=500)
    return {"items": [_serialize(d) for d in docs], "count": len(docs)}


# ---------------- create (SRS only) ----------------


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_note(
    project_id: str,
    body: NoteCreate,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "SRS only")
    if not body.body or not body.body.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "body required")
    await _project_or_404(project_id, user)

    db = get_db()
    # Snapshot author full_name at creation time (immutable in note even if user renamed)
    u = await db.users.find_one({"_id": _oid(user.user_id)})
    author_name = (u or {}).get("full_name") or (u or {}).get("email") or "—"

    note = ProjectNote(
        tenant_id=user.tenant_id,
        created_by=user.user_id,
        updated_by=user.user_id,
        project_id=project_id,
        author_user_id=user.user_id,
        author_full_name=author_name,
        body=body.body.strip(),
        visibility=body.visibility,
    )
    doc = note.to_mongo()
    result = await db.project_notes.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


# ---------------- update (author only) ----------------


@router.patch("/{note_id}")
async def update_note(
    project_id: str,
    note_id: str,
    body: NoteUpdate,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    n = await _note_or_404(note_id, project_id, user)
    if n.get("author_user_id") != user.user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only author can edit")

    update: dict[str, Any] = {"updated_at": _now(), "updated_by": user.user_id}
    if body.body is not None:
        if not body.body.strip():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "body cannot be empty")
        update["body"] = body.body.strip()
    if body.visibility is not None:
        update["visibility"] = body.visibility

    db = get_db()
    await db.project_notes.update_one({"_id": _oid(note_id)}, {"$set": update})
    updated = await db.project_notes.find_one({"_id": _oid(note_id)})
    return _serialize(updated)


# ---------------- delete (soft, author only) ----------------


@router.delete("/{note_id}", status_code=status.HTTP_200_OK)
async def delete_note(
    project_id: str,
    note_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    n = await _note_or_404(note_id, project_id, user)
    if n.get("author_user_id") != user.user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only author can delete")

    db = get_db()
    await db.project_notes.update_one(
        {"_id": _oid(note_id)},
        {"$set": {"is_deleted": True, "updated_at": _now(), "updated_by": user.user_id}},
    )
    return {"id": note_id, "deleted": True}
