"""
InsiteIQ v1 — AIProvider service (Pasito Y-c · AI Learning Engine Fase 2).

ADR-019 pluggable per-tenant. Actually Fase 1 solo soporta 2 providers:
  - "disabled"  no-op (default · cero costo · cero lock-in)
  - "openai"    gpt-4o-mini (barato, buena calidad)

Futuro (Y-c Fase 2+):
  - "anthropic" Claude Haiku/Sonnet
  - "ollama"    local llama3.1 8B (zero data leak)
  - "sa99"      SRS centralized router

Config via env:
  INSITEIQ_AI_PROVIDER=disabled|openai
  OPENAI_API_KEY=sk-...
  OPENAI_MODEL=gpt-4o-mini
  INSITEIQ_AI_MAX_TOKENS=200   (output cap)
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any


@dataclass
class AIResponse:
    text: str
    model: str
    tokens_input: int | None = None
    tokens_output: int | None = None
    error: str | None = None


class AIProvider:
    """Abstract provider. Subclasses implement .generate()."""

    name: str = "abstract"

    async def generate(self, system: str, user: str) -> AIResponse:
        raise NotImplementedError

    @property
    def enabled(self) -> bool:
        return False


class DisabledProvider(AIProvider):
    name = "disabled"

    @property
    def enabled(self) -> bool:
        return False

    async def generate(self, system: str, user: str) -> AIResponse:
        return AIResponse(
            text="",
            model="disabled",
            error="AI provider disabled",
        )


class OpenAIProvider(AIProvider):
    """
    OpenAI gpt-4o-mini por defecto. Barato (~$0.0001 per briefing).
    Lazy import del SDK para que api boot no rompa si openai no esta instalado.
    """

    name = "openai"

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        max_tokens: int = 200,
    ):
        self.api_key = api_key
        self.model = model
        self.max_tokens = max_tokens
        self._client = None

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def _get_client(self):
        if self._client is None:
            # openai SDK imports lazy
            from openai import AsyncOpenAI

            self._client = AsyncOpenAI(api_key=self.api_key)
        return self._client

    async def generate(self, system: str, user: str) -> AIResponse:
        if not self.enabled:
            return AIResponse(
                text="", model=self.model, error="OPENAI_API_KEY not configured"
            )
        try:
            client = self._get_client()
            resp = await client.chat.completions.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=0.3,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            )
            choice = resp.choices[0]
            text = (choice.message.content or "").strip()
            usage = getattr(resp, "usage", None)
            return AIResponse(
                text=text,
                model=self.model,
                tokens_input=getattr(usage, "prompt_tokens", None) if usage else None,
                tokens_output=(
                    getattr(usage, "completion_tokens", None) if usage else None
                ),
            )
        except Exception as e:
            return AIResponse(
                text="",
                model=self.model,
                error=f"{type(e).__name__}: {str(e)[:200]}",
            )


def get_ai_provider() -> AIProvider:
    """
    Factory · read INSITEIQ_AI_PROVIDER env.
    Tenant-specific override aterriza en Y-c Fase 2 leyendo Tenant.ai_config.
    """
    kind = (os.getenv("INSITEIQ_AI_PROVIDER") or "disabled").lower()
    if kind == "openai":
        key = os.getenv("OPENAI_API_KEY") or ""
        model = os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
        max_tokens = int(os.getenv("INSITEIQ_AI_MAX_TOKENS") or 200)
        return OpenAIProvider(api_key=key, model=model, max_tokens=max_tokens)
    return DisabledProvider()


# ---------------- Briefing summarization helper ----------------

BRIEFING_SYSTEM_PROMPT = (
    "Eres SRS Copilot, asistente interno de coordinación de field services IT. "
    "Tu tarea: destilar un briefing operativo para el tech que va a ejecutar "
    "un WorkOrder. Te damos datos estructurados del site, historial y casos "
    "similares. Respondes MAXIMO 3 frases en castellano, directas, prácticas, "
    "sin adornos. Formato de salida: texto plano, SIN markdown, SIN bullets. "
    "Cero invención: si el dato no está en el input, no lo escribes. "
    "Prioriza: qué tiende a pasar en este site, qué funcionó la última vez, "
    "qué llevar/verificar específico. Si no hay data suficiente, dilo honesto."
)


def _format_date(iso_or_dt) -> str:
    if not iso_or_dt:
        return "—"
    if hasattr(iso_or_dt, "isoformat"):
        return iso_or_dt.isoformat()[:10]
    return str(iso_or_dt)[:10]


def build_briefing_user_prompt(wo: dict, sections: dict) -> str:
    """
    Build the compact structured prompt for the LLM.
    Keep it under ~600 tokens input to stay cheap with gpt-4o-mini.
    """
    parts: list[str] = []
    parts.append("WORK ORDER QUE SE VA A EJECUTAR:")
    parts.append(f"- Título: {wo.get('title') or '—'}")
    if wo.get("description"):
        desc = wo["description"][:240]
        parts.append(f"- Descripción: {desc}")
    parts.append(f"- Severity: {wo.get('severity') or '—'}")
    parts.append(f"- Shield: {wo.get('shield_level') or '—'}")

    sb = sections.get("site_bible_summary") or {}
    if sb:
        parts.append("")
        parts.append("SITE:")
        parts.append(f"- {sb.get('site_name') or '—'}")
        if sb.get("city") or sb.get("country"):
            parts.append(f"- Ubicación: {sb.get('city') or ''} / {sb.get('country') or ''}")
        if sb.get("access_notes"):
            parts.append(f"- Access notes: {sb['access_notes'][:200]}")
        if sb.get("has_physical_resident"):
            parts.append("- Tiene residente físico (DC/24×7)")

    history = sections.get("history") or []
    if history:
        parts.append("")
        parts.append(f"HISTORIAL EN MISMO SITE ({len(history)}):")
        for h in history[:3]:
            line = f"- {h.get('reference', '?')} ({_format_date(h.get('closed_at'))})"
            if h.get("what_found_snippet"):
                line += f"\n    found: {h['what_found_snippet'][:120]}"
            if h.get("what_did_snippet"):
                line += f"\n    did: {h['what_did_snippet'][:120]}"
            if h.get("time_on_site_minutes"):
                line += f"\n    time_on_site: {h['time_on_site_minutes']}min"
            if h.get("after_hours"):
                line += "\n    (after-hours)"
            parts.append(line)

    similar = sections.get("similar_cross_site") or []
    if similar:
        parts.append("")
        parts.append(
            f"CASOS SIMILARES MISMO CLIENTE OTROS SITES ({len(similar)}):"
        )
        for s in similar[:5]:
            line = (
                f"- {s.get('reference')} @ {s.get('site_name') or '—'} "
                f"(score {s.get('match_score')}, terms: "
                f"{', '.join(s.get('matched_terms') or [])})"
            )
            if s.get("what_did_snippet"):
                line += f"\n    did: {s['what_did_snippet'][:120]}"
            parts.append(line)

    sm = sections.get("site_metrics") or {}
    if sm and sm.get("wo_count_90d") is not None:
        parts.append("")
        parts.append("SITE METRICS (90d):")
        parts.append(f"- WOs: {sm.get('wo_count_90d')}")
        if sm.get("avg_resolution_minutes"):
            parts.append(f"- Avg resolve: {sm['avg_resolution_minutes']}min")
        if sm.get("repeat_count_30d"):
            parts.append(f"- Repeat en 30d: {sm['repeat_count_30d']}")
        if sm.get("after_hours_pct"):
            parts.append(f"- After-hours: {sm['after_hours_pct']}%")

    parts.append("")
    parts.append(
        "Genera el briefing (3 frases MÁXIMO, español, texto plano, "
        "enfocado en acción práctica para el tech)."
    )
    return "\n".join(parts)
