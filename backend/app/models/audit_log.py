"""
InsiteIQ v1 Foundation — audit_log entry model
Principle #7: "Nuestro corazon guarda todo."
Append-only, immutable, forensic-grade.

Two sources write here:
- middleware/audit_log.py -> HTTP envelope (coarse, automatic on every mutation)
- domain code via write_audit_event() -> rich (entity_refs + context_snapshot)

Together they guarantee no mutation goes untracked.
"""
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Source = Literal["http_middleware", "domain", "system", "seed"]


class EntityRef(BaseModel):
    model_config = ConfigDict(extra="ignore")
    collection: str  # e.g. "work_orders", "assets"
    id: str
    label: str | None = None


class AuditLogEntry(BaseModel):
    """
    Writes only. Never read-modify-write.
    Query: always by tenant_id + time range + optional actor/action filter.
    """
    model_config = ConfigDict(extra="ignore")

    ts: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: Source
    tenant_id: str | None = None
    actor_user_id: str | None = None
    actor_memberships: list[dict] = Field(default_factory=list)
    action: str
    # Optional HTTP fields (set by middleware)
    http_method: str | None = None
    http_path: str | None = None
    http_status: int | None = None
    duration_ms: int | None = None
    client_ip: str | None = None
    # Optional domain fields (set by write_audit_event)
    entity_refs: list[EntityRef] = Field(default_factory=list)
    context_snapshot: dict = Field(default_factory=dict)
