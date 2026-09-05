"""
InsiteIQ Modo 5 — Report templates (el molde del cliente · versionado).

GET  /api/report-templates            SRS + tech (el tech necesita el molde para el playbook)
GET  /api/report-templates/{id}       cualquier usuario autenticado del tenant
POST /api/report-templates            SRS owner/director · crea versión (supersedes_id opcional)
"""
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.models.report_template import TemplateSection

router = APIRouter(prefix="/report-templates", tags=["report_templates"])

OWNER_AUTHORITY = {"owner", "director"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


def _is_admin(user: CurrentUser) -> bool:
    m = user.membership_in("srs_coordinators")
    return bool(m and m.get("authority_level") in OWNER_AUTHORITY)


class CreateTemplateBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    code: str
    version: str
    name: str
    language: str = "es"
    client_organization_id: str | None = None
    sections: list[TemplateSection] = Field(default_factory=list)
    supersedes_id: str | None = None
    notes: str | None = None


@router.get("")
async def list_templates(include_superseded: bool = False, user: CurrentUser = Depends(get_current_user)):
    if not (user.has_space("srs_coordinators") or user.has_space("tech_field")):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "SRS or tech only")
    db = get_db()
    q: dict = {"tenant_id": user.tenant_id}
    if not include_superseded:
        q["status"] = {"$ne": "superseded"}
    docs = await db.report_templates.find(q).sort([("code", 1), ("version", -1)]).to_list(200)
    return [_serialize(d) for d in docs]


@router.get("/{template_id}")
async def get_template(template_id: str, user: CurrentUser = Depends(get_current_user)):
    if not ObjectId.is_valid(template_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid id")
    db = get_db()
    doc = await db.report_templates.find_one({"_id": ObjectId(template_id), "tenant_id": user.tenant_id})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    return _serialize(doc)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_template(body: CreateTemplateBody, user: CurrentUser = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo SRS owner/director")
    db = get_db()
    dup = await db.report_templates.find_one(
        {"tenant_id": user.tenant_id, "code": body.code, "version": body.version}
    )
    if dup:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Ya existe {body.code} v{body.version}")
    now = _now()
    doc = {
        "tenant_id": user.tenant_id,
        "code": body.code,
        "version": body.version,
        "name": body.name,
        "language": body.language,
        "client_organization_id": body.client_organization_id,
        "sections": [s.model_dump() for s in body.sections],
        "status": "active",
        "supersedes_id": body.supersedes_id,
        "notes": body.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    res = await db.report_templates.insert_one(doc)
    if body.supersedes_id and ObjectId.is_valid(body.supersedes_id):
        await db.report_templates.update_one(
            {"_id": ObjectId(body.supersedes_id), "tenant_id": user.tenant_id},
            {"$set": {"status": "superseded", "updated_at": now, "updated_by": user.user_id}},
        )
    await write_audit_event(
        db, tenant_id=user.tenant_id, actor_user_id=user.user_id, action="report_template.create",
        entity_refs=[{"collection": "report_templates", "id": str(res.inserted_id), "label": f"{body.code} v{body.version}"}],
        context_snapshot={"sections": len(body.sections), "supersedes_id": body.supersedes_id},
    )
    doc["_id"] = res.inserted_id
    return _serialize(doc)
