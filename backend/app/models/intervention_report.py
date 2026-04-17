"""
InsiteIQ v1 Modo 1 — InterventionReport (Principle #1: Emit outward)

El entregable canonico que el cliente recibe al cierre de un work_order.
Se ensambla UNA VEZ (al cierre) y se expone por los 5 canales estandar:
  1. JSON (portal view + machine integrations)
  2. HTML (render bonito, soporta generacion PDF posterior)
  3. CSV (exportable, reconciliable)
  4. Email (via email_outbox — SMTP worker en futuro)
  5. Webhook (via webhook_outbox — worker en futuro)

Nunca ingestamos inbound del cliente (Principio #1). Solo emitimos.

Scope del contenido:
  - Header: referencia, titulo, client, site, shield_level, severity
  - Timeline: intake + handshakes + advance events (lectura de audit_log)
  - SLA compliance: deadlines vs realidad, margen
  - Ball-in-court timeline: quien tuvo el balon, por cuanto tiempo
  - Capture: findings + devices + anything_new_about_site (del tech)
  - Threads summary: shared count (internal NO se expone al cliente)

Regenera = supersede. Version counter preserva historia.
"""
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

ReportStatus = Literal["draft", "final", "superseded"]


class ReportHeader(BaseModel):
    model_config = ConfigDict(extra="ignore")
    work_order_reference: str
    title: str
    severity: str
    shield_level: str
    client_name: str | None = None
    site_name: str | None = None
    site_country: str | None = None
    site_city: str | None = None
    tech_name: str | None = None
    srs_coordinator_name: str | None = None
    opened_at: datetime
    closed_at: datetime | None = None


class TimelineEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ts: datetime
    kind: str  # "intake" | "advance" | "handshake" | "capture" | "briefing" | "cancel"
    label: str
    actor_name: str | None = None
    from_status: str | None = None
    to_status: str | None = None
    ball_side: str | None = None


class SLACompliance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    receive_deadline: datetime | None = None
    resolve_deadline: datetime | None = None
    first_action_at: datetime | None = None
    resolution_at: datetime | None = None
    received_within_sla: bool | None = None
    resolved_within_sla: bool | None = None
    receive_margin_minutes: int | None = None
    resolve_margin_minutes: int | None = None


class BallSpan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    side: str
    since: datetime
    until: datetime | None = None
    duration_minutes: int | None = None


class CaptureSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    what_found: str | None = None
    what_did: str | None = None
    anything_new_about_site: str | None = None
    devices_touched: list[dict] = Field(default_factory=list)
    time_on_site_minutes: int | None = None
    photos_count: int = 0
    follow_up_needed: bool = False


class ThreadsSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    shared_message_count: int = 0
    internal_message_count: int = 0  # SRS-only in rendered report, 0 for client view


class DeliveryEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    channel: Literal["email", "webhook", "portal", "csv", "html", "pdf"]
    target: str | None = None  # email address, webhook URL, portal URL, file path
    enqueued_at: datetime
    status: Literal["queued", "sent", "delivered", "failed"] = "queued"
    attempts: int = 0
    last_error: str | None = None
    requested_by: str | None = None  # user_id


class InterventionReport(BaseMongoModel):
    work_order_id: str = Field(..., description="1 active report per WO (supersede chain)")
    version: int = 1
    status: ReportStatus = "draft"
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    generated_by: str | None = None  # user_id or None for auto-gen at close
    supersedes_id: str | None = None

    header: ReportHeader
    timeline: list[TimelineEvent] = Field(default_factory=list)
    sla: SLACompliance = Field(default_factory=SLACompliance)
    ball_timeline: list[BallSpan] = Field(default_factory=list)
    capture: CaptureSummary = Field(default_factory=CaptureSummary)
    threads: ThreadsSummary = Field(default_factory=ThreadsSummary)

    # Machine-readable / emit channels
    deliveries: list[DeliveryEvent] = Field(default_factory=list)

    # Rendered copies (for fast re-serve without re-assembly)
    html_rendered: str | None = None
    csv_rendered: str | None = None
