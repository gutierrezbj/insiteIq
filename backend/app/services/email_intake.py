"""Email Intake — parsing de WOs entrantes a Intervention.

Pipeline:
  raw_email → llm_service.complete(json) → match/create Site →
  create Intervention(source=email) → store thread_id

Soporta dos fuentes:
  - Microsoft Graph (producción) — requiere GRAPH_* env vars
  - Manual paste / JSON drop (piloto) — endpoint POST /api/intake/email
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.database import get_db
from app.services import llm_service


PARSE_SYSTEM = """Eres un parser de Work Orders de soporte IT en campo.
Recibes un email crudo (puede estar en español, inglés o mezclado) de proveedores
como Claro, Fractalia, Inditex, etc. Devuelves SOLO JSON válido con este schema:

{
  "client": "string (Claro, Fractalia, Inditex, etc)",
  "external_reference": "string (FM 20434, WOT0029142, INC..., NSR, etc)",
  "site_name": "string",
  "site_address": "string",
  "site_city": "string",
  "site_country": "string",
  "site_lat": number or null,
  "site_lng": number or null,
  "service_date": "YYYY-MM-DD or null",
  "service_time": "HH:MM or null",
  "service_type": "install|maintenance|troubleshoot|remote_hands|other",
  "priority": "low|normal|high|emergency",
  "scope_of_work": "string (resumen)",
  "equipment": ["string"],
  "tools_required": ["string"],
  "client_contact_name": "string",
  "client_contact_email": "string",
  "client_contact_phone": "string",
  "site_contact_name": "string",
  "site_contact_phone": "string",
  "language": "es|en|pt",
  "confidence": number between 0 and 1
}

Si un campo no aparece en el email, ponlo como null o array vacío. NO inventes datos.
"""


async def parse_email(raw_text: str, *, subject: str = "") -> dict:
    """Llama al LLM para extraer campos estructurados del email."""
    prompt = f"SUBJECT: {subject}\n\nBODY:\n{raw_text}"
    result = await llm_service.complete(
        task="email_parse",
        prompt=prompt,
        system=PARSE_SYSTEM,
        json_mode=True,
        temperature=0.0,
    )
    return result["json"] or {}


async def ingest_email(
    raw_text: str,
    *,
    subject: str = "",
    sender: str = "",
    message_id: str | None = None,
    thread_id: str | None = None,
    source: str = "manual",
) -> dict:
    """Pipeline completo: parsea, guarda email, crea intervention en estado needs_review."""
    db = get_db()

    parsed = await parse_email(raw_text, subject=subject)
    confidence = float(parsed.get("confidence") or 0)

    email_doc = {
        "message_id": message_id or f"manual-{datetime.now(timezone.utc).isoformat()}",
        "thread_id": thread_id,
        "subject": subject,
        "sender": sender,
        "raw_body": raw_text[:50000],
        "parsed": parsed,
        "confidence": confidence,
        "source": source,
        "status": "parsed" if confidence >= 0.7 else "needs_review",
        "created_at": datetime.now(timezone.utc),
    }
    await db["email_messages"].insert_one(email_doc)

    return {
        "email_id": str(email_doc.get("_id", "")),
        "parsed": parsed,
        "confidence": confidence,
        "status": email_doc["status"],
    }


# ── Microsoft Graph stub (pendiente provisioning admin Office365) ──

async def graph_poll() -> list[dict]:
    """Worker stub: cuando GRAPH_* esté provisto, lee buzón y dispara ingest_email."""
    from app.core.config import settings

    if not settings.EMAIL_INTAKE_ENABLED or not settings.GRAPH_TENANT_ID:
        return []
    # TODO: implementar con msal + httpx cuando IT entregue credenciales
    # 1. Obtener token con client_credentials flow
    # 2. GET /users/{mailbox}/mailFolders/Inbox/messages?$filter=isRead eq false
    # 3. Para cada mensaje → ingest_email() → marcar leído
    return []
