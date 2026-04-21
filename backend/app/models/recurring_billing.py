"""
InsiteIQ v1 — RecurringBillingSubscription (Pasito X-c · Fase 3 Admin/Finance).

Captura el stream oculto descubierto en Blueprint: Panama $154K/año
subscription-style que hoy vive en Excel de Adriana. Cada mes (o periodo
configurado) genera un Invoice standalone SIN agrupar WOs — es un servicio
recurring fijo independiente del trafico de break-fix.

Flujo:
  SRS admin crea Subscription (org + agreement + monto + cadence + next_run)
  Cada vez que llega el cron tick (o SRS dispara manual), si status=active
  y hoy >= next_run:
    - Se genera Invoice draft con 1 BillingLine categoria=monthly_fee/quarterly_fee
    - Se calcula next_run = next_run + cadence
    - Se stampean last_run, runs_count, last_invoice_id
  Si el admin pausa -> status=paused, no corre
  Si se cancela -> status=cancelled, no corre ni se reactiva

Note: el cron tick aterriza en Horizonte 3 (worker). En X-c cerramos:
  - Entity + CRUD
  - POST /subscriptions/:id/run-now para forzar la corrida (testing + real)
  - UI en Finance tab "Recurring"
"""
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

SubscriptionCadence = Literal["monthly", "quarterly", "annual"]
SubscriptionStatus = Literal["active", "paused", "cancelled"]


class RecurringBillingSubscription(BaseMongoModel):
    # Who
    organization_id: str = Field(..., description="Client org billed")
    service_agreement_id: str = Field(..., description="Which contract")
    srs_entity_id: str | None = None

    # What
    title: str  # e.g. "Panama ops recurring fee"
    description: str | None = None
    category: Literal["monthly_fee", "quarterly_fee"] = "monthly_fee"
    amount: float  # in currency
    currency: str = "USD"
    tax_rate_pct: float = 0.0

    # When
    cadence: SubscriptionCadence = "monthly"
    next_run: datetime  # next date to generate invoice
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ends_at: datetime | None = None  # None = open-ended
    due_in_days: int = 30  # net terms aplicados al invoice generado

    # Lifecycle
    status: SubscriptionStatus = "active"
    last_run: datetime | None = None
    last_invoice_id: str | None = None
    runs_count: int = 0

    notes: str | None = None
