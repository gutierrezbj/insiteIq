"""
InsiteIQ v1 Modo 1 — ServiceAgreement (contrato + Shield level)

Decision #3 (project_modo1_reactivo_decisions.md):
Shield levels viven en service_agreement. Un cliente puede tener varios
contratos con Shield distinto. 3 niveles base (Bronze/Silver/Gold) + bronze_plus
para contratos tipo Fractalia-Telefonica (1/2/3 NBD, Blueprint v1.1 Fase 1).

SLA spec se embebe para snapshot al crear work_orders (evita breaking changes
si el contrato se renegocia — work_orders viejos preservan su SLA al intake).
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

ShieldLevel = Literal["bronze", "bronze_plus", "silver", "gold"]


class SLASpec(BaseModel):
    """
    Tiempos + requisitos por Shield level. Snapshot en work_order al intake.
    """
    model_config = ConfigDict(extra="ignore")

    # Tiempos en minutos (granularidad fina para dashboards en tiempo real)
    receive_minutes: int          # time-to-acknowledge (respond to intake)
    resolve_minutes: int          # time-to-resolution (fix onsite)

    # Requisitos de evidencia
    photos_required: Literal["none", "milestones", "all"] = "milestones"

    # Escalacion
    escalation_role: str | None = None       # "project_manager" | "juan"
    escalation_minutes: int | None = None    # Si sin movimiento >X min, escala

    # Cobertura
    coverage_247: bool = False
    dedicated_coordinator: bool = False

    # Copilot read-only para cliente (solo Gold)
    client_copilot_readonly: bool = False


# Defaults por Shield level (Decision #3)
SHIELD_DEFAULTS: dict[ShieldLevel, dict] = {
    "bronze": {
        "receive_minutes": 240,    # 4h
        "resolve_minutes": 72 * 60,  # 72h
        "photos_required": "milestones",
        "coverage_247": False,
        "dedicated_coordinator": False,
        "client_copilot_readonly": False,
    },
    # bronze_plus: Fractalia-Telefonica — 1 NBD receive / 2 NBD attend / 3 NBD solve
    # Using 9h per NBD as working-day approximation for the minute math.
    "bronze_plus": {
        "receive_minutes": 9 * 60,       # 1 NBD
        "resolve_minutes": 3 * 9 * 60,   # 3 NBD
        "photos_required": "milestones",
        "coverage_247": False,
        "dedicated_coordinator": False,
        "client_copilot_readonly": False,
    },
    "silver": {
        "receive_minutes": 120,    # 2h
        "resolve_minutes": 48 * 60,  # 48h
        "photos_required": "milestones",
        "escalation_role": "project_manager",
        "escalation_minutes": 240,  # 4h
        "coverage_247": False,
        "dedicated_coordinator": True,
        "client_copilot_readonly": False,
    },
    "gold": {
        "receive_minutes": 60,     # 1h
        "resolve_minutes": 24 * 60,  # 24h
        "photos_required": "all",
        "escalation_role": "juan",
        "escalation_minutes": 120,  # 2h
        "coverage_247": True,
        "dedicated_coordinator": True,
        "client_copilot_readonly": True,
    },
}


class ServiceAgreement(BaseMongoModel):
    organization_id: str = Field(..., description="Client org")
    contract_ref: str                        # client's contract number
    title: str
    shield_level: ShieldLevel
    sla_spec: SLASpec

    # Parts auto-purchase threshold (Decision #5 — Ball-in-court)
    # Below this USD, SRS auto-compra sin esperar aprobacion. Above, espera.
    parts_approval_threshold_usd: float = 200.0

    # Facturacion
    srs_entity_id: str | None = None  # which SR-UK/US/SA entity invoices
    currency: str = "USD"

    active: bool = True
    starts_at: str | None = None  # ISO date
    ends_at: str | None = None
    notes: str | None = None

    @classmethod
    def make_sla(cls, level: ShieldLevel) -> SLASpec:
        """Helper: build a default SLASpec for a Shield level."""
        return SLASpec(**SHIELD_DEFAULTS[level])
