"""
InsiteIQ v1 Foundation — SRS legal entities
Multi-entity financial truth. Every transaction MUST declare which entity issued/received.

Active today: SR-UK (London), SR-US, SR-SA (Saudi Arabia).
Closed: SR-ES (Spain, closed 2026-04-15).
"""
from pydantic import Field

from app.models.base import BaseMongoModel


class SRSEntity(BaseMongoModel):
    code: str = Field(..., description="SR-UK | SR-US | SR-SA | SR-ES")
    legal_name: str
    country: str  # ISO-3166 alpha-2
    currency: str  # ISO-4217 (GBP, USD, SAR, EUR...)
    tax_ids: dict[str, str] = Field(default_factory=dict)  # {"vat": "...", "ein": "..."}
    bank_accounts: list[dict] = Field(default_factory=list)
    status: str = "active"  # active | closed
    closed_at: str | None = None  # ISO date if closed
    notes: str | None = None
