"""
InsiteIQ v1 Modo 1 — Site (minimal for Fase 1)

Site is the physical location where a work_order executes. Fase 5 will expand
this with the full Site Bible (Domain 10 Knowledge: access_instructions,
parking_notes, known_issues, network_topology, photos, confidence workflow).

For Fase 1 we keep it lean: identity + location + default contrapart.

Decision #7 (project_modo1_reactivo_decisions.md): contraparte por default es
NOC Operator REMOTO, no residente fisico. El residente fisico es excepcion
(DCs, sitios 24/7). `has_physical_resident` flag guia el cierre.
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel


class SiteContact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    phone: str | None = None
    email: str | None = None
    role: str | None = None  # "store_manager", "it_onsite", ...


class Site(BaseMongoModel):
    organization_id: str = Field(..., description="Owning client organization")
    code: str | None = None  # internal client ref (e.g. "ZARA-TAL-01")
    name: str
    country: str  # ISO-3166 alpha-2
    city: str | None = None
    address: str | None = None
    timezone: str | None = None  # IANA TZ ("Europe/Madrid", "America/Santiago")

    # Geolocation (Z-b · cockpit + mapa)
    # lat/lng almacenados como float decimal. geofence_radius_m usado por
    # Modo 1 tech-arrival confirm + WO distance validation.
    lat: float | None = None
    lng: float | None = None
    geofence_radius_m: int | None = None  # default null → 200m implicit

    # Site typology for cockpit color/icon (Z-b)
    # "retail"=tienda · "dc"=datacenter · "office"=oficina ·
    # "warehouse"=almacen · "branch"=sucursal bancaria · "other"
    site_type: Literal["retail", "dc", "office", "warehouse", "branch", "other"] = "retail"

    # Contacts
    onsite_contact: SiteContact | None = None

    # Cierre model (Decision #7)
    has_physical_resident: bool = False  # True = DC / 24x7 staffed site
    default_noc_operator_user_id: str | None = None

    # Access (basic — full Site Bible in Fase 5)
    access_notes: str | None = None

    status: Literal["active", "decommissioned"] = "active"
    notes: str | None = None
