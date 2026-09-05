"""
InsiteIQ Modo 5 — plantilla del WO + entregable por sitio.

GET /api/work-orders/{wo_id}/template            plantilla del proyecto + progreso del playbook (SRS · tech asignado)
GET /api/work-orders/{wo_id}/deliverable         entregable ensamblado (JSON)
GET /api/work-orders/{wo_id}/deliverable.html    entregable con fotos incrustadas (imprimir → PDF) · SRS + cliente
"""
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.routes.intervention_reports import _load_wo, _photo_data_uris
from app.services.survey import playbook_progress, template_for_work_order
from app.services.survey_deliverable import assemble_site_deliverable, render_site_deliverable_html

router = APIRouter(prefix="/work-orders/{wo_id}", tags=["survey"])


@router.get("/template")
async def get_wo_template(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    wo = await _load_wo(db, wo_id, user)
    template = await template_for_work_order(db, wo)
    if not template:
        return {"exists": False, "work_order_id": wo_id}
    capture = await db.tech_captures.find_one(
        {"work_order_id": wo_id, "tenant_id": user.tenant_id, "status": "submitted"}
    )
    responses = (capture or {}).get("template_responses") or {}
    template["id"] = str(template.pop("_id"))
    return {"exists": True, "template": template, "progress": playbook_progress(template, responses), "responses": responses}


@router.get("/deliverable")
async def get_deliverable(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    wo = await _load_wo(db, wo_id, user)
    report = await assemble_site_deliverable(db, wo)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Este WO no pertenece a un proyecto con plantilla")
    return report


@router.get("/deliverable.html", response_class=Response)
async def get_deliverable_html(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    wo = await _load_wo(db, wo_id, user)
    report = await assemble_site_deliverable(db, wo)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Este WO no pertenece a un proyecto con plantilla")
    photo_uris = await _photo_data_uris(db, {"capture": {"photos": report.get("photos") or []}}, user.tenant_id)
    return Response(content=render_site_deliverable_html(report, photo_uris), media_type="text/html; charset=utf-8")
