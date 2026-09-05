"""
InsiteIQ Modo 5 — helpers del survey: plantilla ↔ respuestas ↔ playbook.

missing_required_fields(template, responses) -> [labels]
template_for_work_order(db, wo) -> template doc | None
"""
from typing import Any

from bson import ObjectId


def _has_value(field: dict, value: Any) -> bool:
    ftype = field.get("type")
    if value is None:
        return False
    if ftype in ("photo", "photos"):
        photos = value if isinstance(value, list) else [value]
        photos = [p for p in photos if p]
        need = field.get("min_photos") or 1
        return len(photos) >= need
    if ftype == "boolean":
        return isinstance(value, bool)
    if ftype in ("number", "rating"):
        return value != "" and value is not None
    return str(value).strip() != ""


def missing_required_fields(template: dict | None, responses: dict | None) -> list[dict]:
    """Campos obligatorios sin respuesta · [{section, key, label}]."""
    if not template:
        return []
    responses = responses or {}
    missing = []
    for sec in template.get("sections") or []:
        for f in sec.get("fields") or []:
            if f.get("required") and not _has_value(f, responses.get(f.get("key"))):
                missing.append({"section": sec.get("title"), "key": f.get("key"), "label": f.get("label")})
    return missing


def playbook_progress(template: dict | None, responses: dict | None) -> dict:
    if not template:
        return {"required_total": 0, "required_done": 0, "missing": []}
    total = sum(1 for sec in template.get("sections") or [] for f in sec.get("fields") or [] if f.get("required"))
    missing = missing_required_fields(template, responses)
    return {"required_total": total, "required_done": total - len(missing), "missing": missing}


async def template_for_work_order(db, wo: dict) -> dict | None:
    pid = wo.get("project_id")
    if not pid or not ObjectId.is_valid(pid):
        return None
    project = await db.projects.find_one({"_id": ObjectId(pid)}, {"report_template_id": 1})
    tid = (project or {}).get("report_template_id")
    if not tid or not ObjectId.is_valid(tid):
        return None
    return await db.report_templates.find_one({"_id": ObjectId(tid), "tenant_id": wo["tenant_id"]})
