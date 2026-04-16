"""
InsiteIQ v1 Foundation — Organization with partner_relationships
ADR-008: an organization can hold N relationship types simultaneously.
Canonical example: Fervimax is client (GRUMA), channel_partner (Panama),
joint_venture_partner (Bepensa). Same legal entity, three hats.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

PartnerType = Literal[
    "client",
    "channel_partner",
    "vendor_labor",
    "vendor_material",
    "vendor_service",
    "end_client_metadata",
    "prime_contractor",
    "joint_venture_partner",
]


class PartnerRelationship(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: PartnerType
    contract_ref: str | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    status: str = "active"  # active | inactive | terminated
    terms: dict = Field(default_factory=dict)
    # channel_partner specific
    commission_rule: dict | None = None
    # joint_venture_partner specific
    revenue_split_pct: float | None = None
    cost_split_pct: float | None = None
    notes: str | None = None


class Organization(BaseMongoModel):
    legal_name: str
    display_name: str | None = None
    country: str | None = None  # ISO-3166 alpha-2
    jurisdiction: str | None = None
    tax_ids: dict[str, str] = Field(default_factory=dict)
    bank_accounts: list[dict] = Field(default_factory=list)
    partner_relationships: list[PartnerRelationship] = Field(default_factory=list)
    status: str = "active"
    notes: str | None = None

    def has_role(self, role: PartnerType) -> bool:
        return any(
            pr.type == role and pr.status == "active" for pr in self.partner_relationships
        )

    def active_roles(self) -> list[PartnerType]:
        return [pr.type for pr in self.partner_relationships if pr.status == "active"]
