"""
InsiteIQ v1 Modo 1 — TicketThread + TicketMessage (Decision #8 — WhatsApp kill)

One work_order can have up to 2 threads:
  - kind="shared"    : SRS coord + tech asignado + NOC operator + client coord
                       + onsite resident. Todos ven todo.
  - kind="internal"  : SRS-only (srs_coordinators space). Para conversacion privada
                       de coordinacion sin exponer roces al cliente.

Messages are in a separate collection (ticket_messages) for scale + pagination.
Evidence (photos, files) are attached to messages as `attachments`.
State-machine transitions on the work_order auto-emit system_event messages
on the shared thread (see routes/work_orders.py hooks).
Threads seal (sealed_at) when the work_order closes or cancels — append-only
up to that point, fully immutable after.
"""
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

ThreadKind = Literal["shared", "internal"]
MessageKind = Literal["message", "system_event", "evidence"]


class ThreadParticipant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    role: str  # "srs_coordinator" | "tech_assigned" | "noc_operator" | "client_coordinator" | "onsite_resident"
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    added_by: str | None = None


class TicketThread(BaseMongoModel):
    work_order_id: str = Field(..., description="1 thread per (work_order, kind)")
    kind: ThreadKind
    participants: list[ThreadParticipant] = Field(default_factory=list)
    sealed_at: datetime | None = None

    # Denormalized (set at creation, useful for list queries without a join)
    organization_id: str | None = None
    site_id: str | None = None
    work_order_reference: str | None = None


class MessageAttachment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    url: str  # where the asset is stored (S3 future; local path for dev)
    kind: Literal["image", "file", "video", "audio", "other"] = "file"
    label: str | None = None
    size_bytes: int | None = None
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TicketMessage(BaseMongoModel):
    thread_id: str
    work_order_id: str  # denormalized for scoped queries
    kind: MessageKind = "message"
    actor_user_id: str | None = None  # None for system_event
    ts: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    text: str | None = None
    attachments: list[MessageAttachment] = Field(default_factory=list)
    mentions: list[str] = Field(default_factory=list)  # list of user_ids mentioned
    # For system_event: structured payload (e.g., {"from":"triage","to":"pre_flight"})
    payload: dict = Field(default_factory=dict)
