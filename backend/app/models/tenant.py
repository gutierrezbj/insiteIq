"""
InsiteIQ v1 Foundation — Tenant
v1 has a single tenant (SRS). Multi-tenant is prepped from day 0 for future Ghost Tech.
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

AIProviderKind = Literal[
    "disabled",          # no AI, features degrade gracefully
    "sa99",              # SRS's SA99 LiteLLM gateway (default for SRS tenant)
    "direct_api",        # Anthropic/OpenAI/Gemini direct with tenant keys
    "direct_litellm",    # tenant's own LiteLLM container (v0 pattern if requested)
    "ollama",            # on-prem local inference (EU/banca/gov/offline)
]


class TenantAIConfig(BaseModel):
    """
    Per-tenant AI configuration. Null/missing => AI disabled for this tenant
    and any AI-enhanced feature falls back to rule-based/manual behavior.
    Interface lives in `services/ai_provider.py` (to be implemented when first
    AI feature lands — likely Fase 5 Modo 5 auto-deliverable 80/20). ADR-019.
    """
    model_config = ConfigDict(extra="ignore")

    provider: AIProviderKind = "disabled"
    endpoint: str | None = None          # gateway URL (sa99, direct_litellm, ollama)
    api_key_ref: str | None = None       # env var NAME holding the secret; never the raw key
    tier_mapping: dict[str, str] = Field(default_factory=dict)
    # ex: {"iiq-l0": "qwen3-8b-local", "iiq-l2": "claude-sonnet-4"}
    anonymization_required: bool = False  # Modo 5 redact → draft → rehydrate wrapper
    notes: str | None = None


class Tenant(BaseMongoModel):
    code: str = Field(..., description="Short code, e.g. 'SRS'")
    name: str
    status: str = "active"  # active | suspended | archived
    tier: str = "internal"  # internal | ghost_tech (future)
    notes: str | None = None

    # ADR-019: AI pluggable per-tenant. None => disabled (graceful degradation).
    ai_config: TenantAIConfig | None = None

    # Tenants don't have a tenant_id themselves — they ARE the tenant.
    # We keep the field for BaseMongoModel uniformity and self-reference it.
