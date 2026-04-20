"""
InsiteIQ v1 Foundation — File uploads (local volume, Fase 2 simple storage).

Scope: authenticated users upload + read files within their tenant.
No per-entity ACL aun; se anade cuando el dolor aparezca (Fase 3+).

Storage:
  - Binary content en volumen local `UPLOADS_ROOT` (docker bind-mount)
  - Metadata en collection `uploads`
  - Filename interno = {ObjectId}.{ext} para evitar colisiones + path traversal

Endpoints:
  POST /api/uploads          multipart/form-data, returns {id, url, ...}
  GET  /api/uploads/{id}     streams file (auth required, same tenant)

Límites Fase 2:
  - Max size: 15 MB (config)
  - Mime types: imagenes jpeg/png/webp/heic + pdf
  - Un archivo por request
"""
import os
import uuid
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOADS_ROOT = os.getenv("INSITEIQ_UPLOADS_ROOT", "/app/uploads")
MAX_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB

ALLOWED_MIME = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "application/pdf": "pdf",
}


def _ensure_root():
    os.makedirs(UPLOADS_ROOT, exist_ok=True)


def _safe_ext(filename: str, mime: str) -> str:
    # Trust mime over client-sent extension
    ext = ALLOWED_MIME.get(mime)
    if ext:
        return ext
    # fallback to filename extension sanitized
    if filename and "." in filename:
        raw = filename.rsplit(".", 1)[-1].lower()
        if len(raw) <= 5 and raw.isalnum():
            return raw
    return "bin"


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
):
    if not file.content_type or file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Mime '{file.content_type}' not allowed. Accept: {sorted(ALLOWED_MIME)}",
        )

    _ensure_root()
    content = await file.read()
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty file")
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File exceeds {MAX_SIZE_BYTES // (1024*1024)}MB limit",
        )

    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    upload_id = ObjectId()
    ext = _safe_ext(file.filename or "upload", file.content_type)
    storage_name = f"{str(upload_id)}.{ext}"
    storage_path = os.path.join(UPLOADS_ROOT, storage_name)

    # Write atomically: tmp then rename
    tmp_path = storage_path + f".tmp-{uuid.uuid4().hex}"
    with open(tmp_path, "wb") as fh:
        fh.write(content)
    os.replace(tmp_path, storage_path)

    now = datetime.now(timezone.utc)
    kind = "image" if file.content_type.startswith("image/") else (
        "file" if file.content_type == "application/pdf" else "other"
    )

    doc = {
        "_id": upload_id,
        "tenant_id": user.tenant_id,
        "original_filename": file.filename,
        "size_bytes": len(content),
        "mime_type": file.content_type,
        "extension": ext,
        "storage_name": storage_name,
        "kind": kind,
        "uploaded_by": user.user_id,
        "uploaded_at": now,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    await db.uploads.insert_one(doc)

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="upload.create",
        entity_refs=[{"collection": "uploads", "id": str(upload_id)}],
        context_snapshot={
            "mime_type": file.content_type,
            "size_bytes": len(content),
            "filename": file.filename,
        },
    )

    return {
        "id": str(upload_id),
        "url": f"/api/uploads/{str(upload_id)}",
        "filename": file.filename,
        "size_bytes": len(content),
        "mime_type": file.content_type,
        "kind": kind,
    }


@router.get("/{upload_id}")
async def get_file(upload_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB not ready")

    try:
        doc = await db.uploads.find_one(
            {"_id": ObjectId(upload_id), "tenant_id": user.tenant_id}
        )
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Upload not found")

    storage_path = os.path.join(UPLOADS_ROOT, doc["storage_name"])
    if not os.path.exists(storage_path):
        raise HTTPException(
            status.HTTP_410_GONE, "File no longer on storage (orphan metadata)"
        )

    return FileResponse(
        storage_path,
        media_type=doc.get("mime_type") or "application/octet-stream",
        filename=doc.get("original_filename") or doc["storage_name"],
    )
