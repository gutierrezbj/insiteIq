"""AI Reporter — genera reportes post-intervención.

Al cerrar una intervention (status=completed), agrega timeline + notas + KB hits
y produce: executive summary cliente-facing, technical report interno, KB candidate,
y draft de email de cierre listo para enviar.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from app.database import get_db
from app.services import llm_service


REPORT_SYSTEM = """Eres un Field Service Engineer senior redactando el reporte de
cierre de una intervención IT en sitio. Tono profesional, conciso, claro.
Devuelves SOLO JSON válido con este schema:

{
  "executive_summary": "string (3-5 líneas, idioma del cliente, sin jerga técnica)",
  "technical_report": "string (markdown, detalle interno: qué se hizo, hallazgos, equipos tocados)",
  "actions_taken": ["string"],
  "issues_found": ["string"],
  "follow_up_required": "string or null",
  "kb_candidate": {
    "should_create": boolean,
    "category": "networking|hardware|software|cabling|power|access|security|other",
    "problem": "string",
    "solution": "string"
  },
  "client_email_draft": {
    "subject": "string",
    "body": "string (en el idioma del cliente, listo para enviar)"
  }
}
"""


async def generate_report(intervention_id: str, *, premium: bool = False) -> dict:
    """Genera reporte completo. premium=True usa Claude Sonnet (facturable)."""
    db = get_db()
    intv = await db["interventions"].find_one({"_id": intervention_id})
    if not intv:
        raise ValueError(f"Intervention {intervention_id} not found")

    site = await db["sites"].find_one({"_id": intv.get("site_id")}) or {}
    tech = await db["technicians"].find_one({"_id": intv.get("technician_id")}) or {}

    context = {
        "reference": intv.get("reference"),
        "type": intv.get("type"),
        "priority": intv.get("priority"),
        "description": intv.get("description"),
        "site": {
            "name": site.get("name"),
            "client": site.get("client"),
            "address": site.get("address"),
            "country": site.get("country"),
        },
        "technician": {
            "name": tech.get("name"),
            "skills": tech.get("skills", []),
        },
        "timeline": intv.get("timeline", []),
        "resolution": intv.get("resolution", {}),
        "created_at": str(intv.get("created_at", "")),
        "completed_at": str(intv.get("completed_at", "")),
    }

    prompt = (
        "Genera el reporte de cierre para esta intervención.\n\n"
        f"DATOS:\n{json.dumps(context, default=str, ensure_ascii=False, indent=2)}"
    )

    result = await llm_service.complete(
        task="report_premium" if premium else "report_draft",
        prompt=prompt,
        system=REPORT_SYSTEM,
        json_mode=True,
        temperature=0.3,
        intervention_id=intervention_id,
        client_name=site.get("client"),
    )

    report = result["json"] or {}
    report_doc = {
        "intervention_id": intervention_id,
        "tier": result["tier"],
        "premium": premium,
        "report": report,
        "created_at": datetime.now(timezone.utc),
    }
    await db["intervention_reports"].insert_one(report_doc)

    # Si el reporte sugiere crear KB, lo dejamos en cola needs_review
    kb_cand = report.get("kb_candidate") or {}
    if kb_cand.get("should_create"):
        await db["kb_suggestions"].insert_one({
            "intervention_id": intervention_id,
            "candidate": kb_cand,
            "status": "pending_review",
            "created_at": datetime.now(timezone.utc),
        })

    return report
