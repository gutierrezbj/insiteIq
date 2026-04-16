"""
InsiteIQ v1 Foundation — Domain 11 Asset Management (Blueprint v1.1)
"Cada tele vale 5K" — full lifecycle trackability of client assets.

Entities:
- Asset: current state snapshot (serial, location, status, lifecycle_stage, ownership)
- AssetEvent: immutable log entry (one per state change) with Visibility Model C

Principle "la ropa se lava en casa":
- internal events NEVER exposed to client space by default
- per-contract override configurable (organization.contract_overrides)
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

AssetCategory = Literal[
    "display", "network", "pos", "server", "security", "cabling", "other"
]
AssetStatus = Literal[
    "active", "in_repair", "in_transit", "decommissioned", "missing", "stored"
]
AssetLifecycle = Literal["new", "deployed", "maintained", "aging", "eol"]
OwnershipType = Literal["client_owned", "srs_procured_with_markup"]

EventType = Literal[
    "installed", "replaced", "repaired", "relocated",
    "decommissioned", "inspected", "diagnostic_notes",
    "vendor_complaint", "cost_overrun", "warranty_claim",
    "firmware_update", "missing_reported", "found",
]
Visibility = Literal["public", "internal", "restricted"]

# Default visibility per event_type (ADR-015 Visibility Model C)
EVENT_DEFAULT_VISIBILITY: dict[EventType, Visibility] = {
    "installed": "public",
    "replaced": "public",
    "repaired": "public",
    "relocated": "public",
    "decommissioned": "public",
    "inspected": "public",
    "diagnostic_notes": "internal",
    "vendor_complaint": "internal",
    "cost_overrun": "internal",
    "warranty_claim": "public",
    "firmware_update": "public",
    "missing_reported": "public",
    "found": "public",
}

# Value lookup fallback (SDD-03, Domain 11 Section 11.8)
VALUE_LOOKUP_USD: dict[AssetCategory, dict] = {
    "display":  {"range": "$2,000 — $8,000", "default": 5000},
    "network":  {"range": "$200 — $3,000",   "default": 1200},  # AP or switch avg
    "pos":      {"range": "$800 — $3,000",   "default": 1500},
    "server":   {"range": "$3,000 — $15,000","default": 6000},
    "security": {"range": "$300 — $1,500",   "default": 600},
    "cabling":  {"range": "$50 — $500",      "default": 150},
    "other":    {"range": "—",               "default": 0},
}


class Ownership(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: OwnershipType = "client_owned"
    acquired_by: str | None = None      # "SRS" when srs_procured_with_markup
    cost_to_srs: float | None = None
    markup_pct: float | None = None     # default 60 for srs_procured
    transfer_price: float | None = None
    transfer_date: datetime | None = None
    invoice_ref: str | None = None


class Warranty(BaseModel):
    model_config = ConfigDict(extra="ignore")
    expires_at: datetime | None = None
    provider: str | None = None
    terms: str | None = None


class Asset(BaseMongoModel):
    organization_id: str = Field(..., description="Owning client org")
    serial_number: str
    asset_tag: str | None = None
    category: AssetCategory
    make: str | None = None
    model: str | None = None
    value_usd: float | None = None
    value_is_estimated: bool = False  # True when using VALUE_LOOKUP_USD fallback
    current_site_id: str | None = None
    status: AssetStatus = "active"
    lifecycle_stage: AssetLifecycle = "deployed"
    ownership: Ownership = Field(default_factory=Ownership)
    warranty: Warranty | None = None
    notes: str | None = None


class AssetEvent(BaseMongoModel):
    """
    Immutable log. Append-only, no update/delete from domain code.
    One per state change. Combined with audit_log they form asset forensics.
    """
    asset_id: str
    event_type: EventType
    intervention_id: str | None = None
    performed_by: str  # user_id
    site_id: str | None = None
    ts: datetime = Field(default_factory=lambda: datetime.utcnow())
    data: dict = Field(default_factory=dict)
    notes: str | None = None
    visibility: Visibility  # resolved from EVENT_DEFAULT_VISIBILITY + contract override
