"""LLM Service — cliente único hacia LiteLLM gateway.

Hablamos OpenAI-format al proxy litellm:4000. El proxy enruta a Qwen local
(SA96 vía Tailscale), Claude, Gemini, etc. según el alias `iiq-lX`.

Patrón heredado de SA99 ADR-021.
"""

from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from typing import Any

from openai import AsyncOpenAI

from app.core.config import settings
from app.database import get_db


_client = AsyncOpenAI(
    base_url=settings.LITELLM_BASE_URL,
    api_key=settings.LITELLM_MASTER_KEY,
)


async def _track_usage(
    task: str,
    tier: str,
    intervention_id: str | None,
    client_name: str | None,
    usage: Any,
    latency_ms: int,
    status: str,
    error: str | None = None,
) -> None:
    """Persistir cada llamada para billing y observabilidad."""
    db = get_db()
    doc = {
        "task": task,
        "tier": tier,
        "intervention_id": intervention_id,
        "client": client_name,
        "tokens_in": getattr(usage, "prompt_tokens", 0) if usage else 0,
        "tokens_out": getattr(usage, "completion_tokens", 0) if usage else 0,
        "latency_ms": latency_ms,
        "status": status,
        "error": error,
        "created_at": datetime.now(timezone.utc),
    }
    await db["ai_usage"].insert_one(doc)


async def complete(
    task: str,
    prompt: str,
    *,
    tier: str | None = None,
    system: str | None = None,
    json_mode: bool = False,
    intervention_id: str | None = None,
    client_name: str | None = None,
    temperature: float = 0.2,
) -> dict:
    """Llamada genérica al gateway. Devuelve {content, raw, usage}."""
    tier = tier or _default_tier(task)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    started = time.monotonic()
    try:
        kwargs: dict = {
            "model": tier,
            "messages": messages,
            "temperature": temperature,
        }
        # Nota: no usamos response_format=json_object porque LM Studio
        # solo acepta json_schema|text. Pedimos JSON por prompt y parseamos.

        resp = await _client.chat.completions.create(**kwargs)
        latency_ms = int((time.monotonic() - started) * 1000)
        content = resp.choices[0].message.content or ""

        parsed_json = None
        if json_mode:
            parsed_json = _extract_json(content)

        await _track_usage(
            task, tier, intervention_id, client_name,
            resp.usage, latency_ms, "ok",
        )
        return {
            "content": content,
            "json": parsed_json,
            "tier": tier,
            "latency_ms": latency_ms,
        }
    except Exception as exc:  # noqa: BLE001
        latency_ms = int((time.monotonic() - started) * 1000)
        await _track_usage(
            task, tier, intervention_id, client_name,
            None, latency_ms, "error", str(exc),
        )
        raise


def _extract_json(text: str) -> dict | None:
    """Extrae JSON de la respuesta del modelo. Tolera fences ```json y prosa."""
    if not text:
        return None
    # Strip code fences
    fenced = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.DOTALL)
    candidate = fenced.group(1) if fenced else None
    if candidate is None:
        # Primer { ... } balanceado por heurística simple
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = text[start : end + 1]
    if not candidate:
        return None
    try:
        return json.loads(candidate)
    except Exception:
        return None


def _default_tier(task: str) -> str:
    mapping = {
        "email_parse": settings.LLM_TIER_EMAIL_PARSE,
        "kb_suggest": settings.LLM_TIER_KB_SUGGEST,
        "report_draft": settings.LLM_TIER_REPORT_DRAFT,
        "report_premium": settings.LLM_TIER_REPORT_PREMIUM,
        "client_email": settings.LLM_TIER_CLIENT_EMAIL,
    }
    return mapping.get(task, settings.LLM_TIER_EMAIL_PARSE)
