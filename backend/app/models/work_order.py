"""
InsiteIQ v1 Modo 1 — WorkOrder (7 etapas + ball_in_court + shield snapshot)

Decision #1+7 etapas (project_modo1_reactivo_decisions.md):
    intake -> triage -> pre_flight -> dispatched -> en_route -> on_site -> resolved -> closed

    'resolved' y 'closed' son dos etapas distintas: tech resuelve (resolved),
    luego NOC Operator o residente fisico firma cierre (closed). Entre medio
    el balon esta del lado cliente esperando sign-off.

Decision #5: Ball-in-court visible en cabecera. Owner + timestamp. Tiempo
sentado se mide. Lado que acumula mas tiempo se expone en reporte ejecutivo.

Decision #3: shield_level + sla_spec se SNAPSHOTEAN al intake. Si el contrato
se renegocia, work_orders viejos conservan su SLA original.

audit_log rich entry se escribe por cada transicion (old_status, new_status,
actor, ball_change) via write_audit_event en la route handler.
"""
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel
from app.models.service_agreement import ShieldLevel, SLASpec

# 7 etapas + 'closed' (terminal)
WorkOrderStatus = Literal[
    "intake",       # received, not yet triaged
    "triage",       # SRS reviewing scope / severity / feasibility
    "pre_flight",   # checklist kit + parts + Site Bible read; MUST be all_green before dispatch
    "dispatched",   # assigned to tech, en route scheduled
    "en_route",     # tech moving to site
    "on_site",      # tech arrived, geofenced check-in done
    "resolved",     # tech finished intervention, awaiting client sign-off
    "closed",       # NOC Operator (or onsite resident) signed off; billing_line emitted
    "cancelled",    # closed without resolution (client withdrew, out of scope, etc.)
]

# Legal transitions (happy path + explicit cancellation from any non-terminal state)
ALLOWED_TRANSITIONS: dict[WorkOrderStatus, list[WorkOrderStatus]] = {
    "intake":     ["triage", "cancelled"],
    "triage":     ["pre_flight", "cancelled"],
    "pre_flight": ["dispatched", "triage", "cancelled"],   # can go back to triage if scope shifts
    "dispatched": ["en_route", "triage", "cancelled"],
    "en_route":   ["on_site", "cancelled"],
    "on_site":    ["resolved", "en_route", "cancelled"],    # can step out for parts etc
    "resolved":   ["closed", "on_site", "cancelled"],       # can reopen if client rejects sign-off
    "closed":     [],                                       # terminal
    "cancelled":  [],                                       # terminal
}

BallSide = Literal["srs", "tech", "client"]


class BallInCourt(BaseModel):
    """
    Who owns the next action on this work_order. Displayed publicly in the
    ticket header so both SRS + client can see where time is sitting.
    """
    model_config = ConfigDict(extra="ignore")

    side: BallSide
    actor_user_id: str | None = None
    since: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reason: str | None = None


# Ball side per status (who owns the default next move)
DEFAULT_BALL_BY_STATUS: dict[WorkOrderStatus, BallSide] = {
    "intake":     "srs",       # SRS triaging
    "triage":     "srs",       # SRS planning dispatch
    "pre_flight": "srs",       # SRS coordinator verifying checklist
    "dispatched": "tech",      # tech must get moving
    "en_route":   "tech",
    "on_site":    "tech",
    "resolved":   "client",    # waiting for NOC / resident sign-off
    "closed":     "srs",       # SRS issues invoice; here just for symmetry
    "cancelled":  "srs",
}


class Handshake(BaseModel):
    """Explicit handshake event at key boundaries (check-in, resolution, closure)."""
    model_config = ConfigDict(extra="ignore")
    kind: Literal["check_in", "resolution", "closure"]
    ts: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    actor_user_id: str
    notes: str | None = None
    # geofence snapshot (set if available — PWA provides lat/lng on check-in)
    lat: float | None = None
    lng: float | None = None


class WorkOrder(BaseMongoModel):
    # Client / scope
    organization_id: str = Field(..., description="Client org")
    site_id: str
    service_agreement_id: str
    reference: str = Field(..., description="Client reference, e.g. CS0533456")

    title: str
    description: str | None = None
    severity: Literal["low", "normal", "high", "critical"] = "normal"

    # Stage + ball
    status: WorkOrderStatus = "intake"
    ball_in_court: BallInCourt

    # People
    assigned_tech_user_id: str | None = None
    srs_coordinator_user_id: str | None = None
    noc_operator_user_id: str | None = None       # Decision #7 default contraparte
    onsite_resident_user_id: str | None = None    # exception (DC / 24x7 sites)

    # Shield snapshot at intake (Decision #3)
    shield_level: ShieldLevel
    sla_snapshot: SLASpec

    # SLA deadlines derived from sla_snapshot at intake
    deadline_receive_at: datetime | None = None
    deadline_resolve_at: datetime | None = None

    # Handshakes
    handshakes: list[Handshake] = Field(default_factory=list)

    # Pre-flight state (becomes "all_green" when every check is passed)
    pre_flight_checklist: dict = Field(default_factory=dict)

    # Billing line emitted at close (Fase 3 connects this to Finance)
    billing_line_id: str | None = None

    closed_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancel_reason: str | None = None


def transition_allowed(current: WorkOrderStatus, target: WorkOrderStatus) -> bool:
    """State-machine guard: is the current -> target transition legal?"""
    return target in ALLOWED_TRANSITIONS.get(current, [])


def default_ball_for_status(status: WorkOrderStatus, actor_user_id: str | None = None) -> BallInCourt:
    """Compute the default ball-in-court for a given status."""
    return BallInCourt(
        side=DEFAULT_BALL_BY_STATUS[status],
        actor_user_id=actor_user_id,
        since=datetime.now(timezone.utc),
    )
