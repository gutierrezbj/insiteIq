"""
InsiteIQ v1 Modo 1 — CopilotBriefing (Domain 10.5, Blueprint v1.1)

Mata el "Sajid manda wall-of-text por WhatsApp" + el "tech llega sin saber nada
del site". Es un paquete estructurado que se arma automaticamente a partir de:
  - Site Bible (acceso, contacto, parking, security, known_issues)
  - Device Bible (fallos conocidos confirmed+ del device a intervenir)
  - Historial site (ultimas 3 intervenciones resumidas)
  - Parts estimate (basado en Device Bible + tipo de intervencion)

Para Fase 1 el assembly es minimo: usa lo disponible del modelo `site` actual
y del historico de `work_orders` en el mismo site. Cuando Fase 5 traiga Site
Bible + Device Bible completos, este assembly crece — la ESTRUCTURA +
el GUARD ya quedan fijados ahora.

Regla: El tech DEBE acknowledge el briefing antes de que el work_order pase
a `en_route`. Sin ack -> sistema bloquea la transicion. Override solo con
flag `emergency=true` en advance (queda grabado en audit_log).
"""
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

BriefingStatus = Literal["assembled", "acknowledged", "superseded"]


class SiteBibleSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    site_name: str | None = None
    address: str | None = None
    country: str | None = None
    city: str | None = None
    timezone: str | None = None
    onsite_contact: dict | None = None
    access_notes: str | None = None
    has_physical_resident: bool = False
    # Domain 10.1 future fields (empty until Fase 5):
    parking_notes: str | None = None
    security_requirements: str | None = None
    known_issues: list[dict] = Field(default_factory=list)
    confidence: str | None = None  # draft | confirmed | verified


class DeviceBibleEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    device_type: str
    category: str | None = None
    common_failures: list[dict] = Field(default_factory=list)  # confirmed+ only
    parts_commonly_needed: list[str] = Field(default_factory=list)
    setup_notes: str | None = None


class HistoricalIntervention(BaseModel):
    model_config = ConfigDict(extra="ignore")
    work_order_id: str
    reference: str
    title: str | None = None
    status: str
    closed_at: datetime | None = None
    outcome_summary: str | None = None  # Fase 5: derived from post_mortem


class CopilotBriefing(BaseMongoModel):
    work_order_id: str = Field(..., description="1 briefing per work_order (unique)")
    assembled_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    assembled_by: str | None = None  # user_id or None for auto

    site_bible_summary: SiteBibleSummary = Field(default_factory=SiteBibleSummary)
    device_bible: list[DeviceBibleEntry] = Field(default_factory=list)
    history: list[HistoricalIntervention] = Field(default_factory=list)
    parts_estimate: list[dict] = Field(default_factory=list)
    # Free-form notes SRS can add to the brief (per-WO context)
    coordinator_notes: str | None = None

    status: BriefingStatus = "assembled"
    acknowledged_at: datetime | None = None
    acknowledged_by: str | None = None  # must be the assigned_tech_user_id
    # If briefing is re-assembled (e.g., revisit), the old one is marked 'superseded'
    supersedes_id: str | None = None
