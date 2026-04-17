"""
InsiteIQ v1 Modo 1 — BudgetApprovalRequest (Decision #5, Blueprint Fase 1)

Expone publicamente donde se atasca el dinero sin confrontar. Las partes
necesarias SRS las compra si operativamente hacen falta (no bloqueamos
despacho por aprobacion). En paralelo se abre este request con su propio
ball_in_court, visible al cliente, midiendo tiempo sentado.

Umbral por contrato (service_agreement.parts_approval_threshold_usd):
  - total_amount_usd <= threshold: auto-aprobado, SRS compra, sin mover ball
    al cliente. Se registra igual por auditoria.
  - total_amount_usd >  threshold: status='sent_to_client', ball al cliente,
    esperando respuesta. SRS puede auto-comprar igual (urgent ops) y queda
    flag auto_purchased=true documentando la decision.

Exchanges: historial de back-and-forth publico (quote_sent, client_question,
srs_answer, approval, rejection, auto_purchase). Cada movimiento cambia
el ball de lado + reinicia el timestamp 'since'.

KPI clave: time-in-queue por lado (srs vs client) — entra a intervention_report
como seccion que el cliente ejecutivo (Diego Telefonica) ve.
"""
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

RequestStatus = Literal[
    "draft",              # SRS preparando cotizacion
    "sent_to_client",     # cotizacion enviada, ball al cliente
    "client_responded",   # cliente respondio (intermedio, ball a SRS)
    "approved",           # cliente aprobo (o auto-approved bajo umbral)
    "rejected",           # cliente rechazo
    "expired",            # timeout sin respuesta
    "superseded",         # re-cotizado
]
BallSide = Literal["srs", "client"]
ExchangeKind = Literal[
    "quote_sent",
    "client_question",
    "srs_answer",
    "approval",
    "rejection",
    "auto_purchase",
    "srs_revision",       # SRS ajusta cotizacion
    "timeout_noted",
]


class PartItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    part_number: str | None = None
    quantity: int = 1
    unit_price_usd: float
    total_price_usd: float  # quantity * unit_price, computed on create
    vendor: str | None = None
    lead_time_days: int | None = None
    notes: str | None = None


class BallInCourtParts(BaseModel):
    model_config = ConfigDict(extra="ignore")
    side: BallSide
    actor_user_id: str | None = None
    since: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reason: str | None = None


class Exchange(BaseModel):
    """Back-and-forth history. Each entry may flip the ball."""
    model_config = ConfigDict(extra="ignore")
    ts: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    actor_user_id: str
    kind: ExchangeKind
    notes: str | None = None
    ball_side_after: BallSide | None = None  # recorded state after this move


class BudgetApprovalRequest(BaseMongoModel):
    work_order_id: str
    service_agreement_id: str

    parts: list[PartItem] = Field(default_factory=list)
    total_amount_usd: float = 0.0
    currency_native: str = "USD"  # for reporting, not conversion
    total_amount_native: float | None = None

    threshold_applied_usd: float                 # snapshot del threshold del agreement
    below_threshold: bool = False
    auto_purchased: bool = False                 # SRS compro ya (flag, no bloquea status)
    auto_purchased_at: datetime | None = None
    auto_purchase_reason: str | None = None

    status: RequestStatus = "draft"
    ball_in_court: BallInCourtParts

    exchanges: list[Exchange] = Field(default_factory=list)
    expires_at: datetime | None = None
    supersedes_id: str | None = None

    # Final outcome trace
    resolved_at: datetime | None = None
    resolved_by: str | None = None
