"""
InsiteIQ v1 Foundation — Tenant
v1 has a single tenant (SRS). Multi-tenant is prepped from day 0 for future Ghost Tech.
"""
from pydantic import Field

from app.models.base import BaseMongoModel


class Tenant(BaseMongoModel):
    code: str = Field(..., description="Short code, e.g. 'SRS'")
    name: str
    status: str = "active"  # active | suspended | archived
    tier: str = "internal"  # internal | ghost_tech (future)
    notes: str | None = None

    # Tenants don't have a tenant_id themselves — they ARE the tenant.
    # We keep the field for BaseMongoModel uniformity and self-reference it.
