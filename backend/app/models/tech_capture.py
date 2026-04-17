"""
InsiteIQ v1 Modo 1 — TechCapture (Domain 10.4, Blueprint v1.1)

Ritual post-intervencion obligatorio. Tech NO puede cerrar la intervencion
(on_site -> resolved) sin completar este formulario. Alimenta Site Bible +
Device Bible en Fase 5 (observed -> confirmed -> verified workflow).

Simetria con Copilot Briefing:
  pre  -> briefing (ack antes de en_route)
  post -> capture  (submit antes de resolved)
Cero brecha de conocimiento por rotacion de tech.

Campos obligatorios (Domain 10.4):
  - what_found        : que se encontro al llegar
  - what_did          : que se hizo
  - anything_new_about_site : cambios/quirks observados (alimenta Site Bible)
  - devices_touched   : device_type + known_failure flag (alimenta Device Bible)
  - photos            : evidencia multimedia

Resubmit supersedes: igual que briefing, si el tech re-envia el capture,
el viejo queda 'superseded'. Historial preservado.
"""
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel
from app.models.ticket_thread import MessageAttachment  # reuse attachment shape

CaptureStatus = Literal["submitted", "superseded"]


class DeviceTouched(BaseModel):
    """
    One entry per device the tech interacted with.
    Known failures feed Device Bible confidence workflow (Fase 5).
    """
    model_config = ConfigDict(extra="ignore")
    device_type: str                # "Cisco AP", "Samsung QM55R", etc
    device_id: str | None = None    # reference to `assets` collection if known
    category: str | None = None     # display | network | pos | ...
    known_failure: bool = False     # was this a pre-existing known failure?
    failure_detail: str | None = None  # if known_failure, describe (feeds Device Bible)
    resolution_action: str | None = None  # replaced | repaired | rebooted | ...


class TechCapture(BaseMongoModel):
    work_order_id: str = Field(..., description="1 active capture per WO (supersede chain)")
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    submitted_by: str  # assigned_tech_user_id

    # Core mandatory fields (Domain 10.4 ritual)
    what_found: str
    what_did: str
    anything_new_about_site: str | None = None

    devices_touched: list[DeviceTouched] = Field(default_factory=list)
    photos: list[MessageAttachment] = Field(default_factory=list)

    # Extra context (optional)
    time_on_site_minutes: int | None = None
    parts_used: list[dict] = Field(default_factory=list)
    follow_up_needed: bool = False
    follow_up_notes: str | None = None

    status: CaptureStatus = "submitted"
    supersedes_id: str | None = None

    # Fase 5 hooks — once Site Bible + Device Bible exist, this capture
    # seeds/updates them. For now we just store the raw fields.
    site_bible_sync_status: Literal["pending", "synced", "skipped"] = "pending"
    device_bible_sync_status: Literal["pending", "synced", "skipped"] = "pending"
