"""
InsiteIQ v1 — Invoice + BillingLine (Pasito X-b · Fase 3 Admin/Finance).

El alma de AR. Cada mes (o periodo que configuremos) SRS genera un Invoice
por cliente+agreement agrupando todos los WOs cerrados en ese rango,
aplicando el rate_card del agreement.

Principio #7 (audit_log guarda todo) implica aqui: una vez emitido, el
invoice es inmutable en sus totales. Cambios de status (sent / paid /
overdue) se stampean con timestamp + actor.

BillingLine es el item de factura — un WO puede generar 1-N lines
(base + after_hours_uplift + travel + parts_markup) segun lo que toque
segun el rate_card y el shape del WO.
"""
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

InvoiceStatus = Literal[
    "draft",      # generated, not sent to client
    "sent",       # emitted to client (email + date)
    "paid",       # payment received
    "overdue",    # past due_date unpaid
    "void",       # cancelled post-emission (audit trail preserved)
]

BillingCategory = Literal[
    "wo_base",            # base_price_per_wo or hourly × time
    "after_hours_uplift", # multiplier delta over base
    "travel_flat",        # travel_flat_fee per visit
    "travel_mileage",     # mileage × km
    "parts_markup",       # markup over parts cost
    "monthly_fee",        # subscription
    "quarterly_fee",      # subscription
    "adjustment",         # manual
]


class BillingLine(BaseModel):
    """Item de factura. Vive embebido en el Invoice para atomicidad."""
    model_config = ConfigDict(extra="ignore")

    # Source reference
    work_order_id: str | None = None  # None for adjustments / recurring fees
    work_order_reference: str | None = None  # snapshot denormalized

    # Line content
    category: BillingCategory
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    subtotal: float = 0.0  # quantity × unit_price, computed server-side

    # Context (for auditability / drill-back)
    context: dict = Field(default_factory=dict)


class Invoice(BaseMongoModel):
    # Who
    organization_id: str = Field(..., description="Client org")
    service_agreement_id: str = Field(..., description="Agreement snapshot source")
    srs_entity_id: str | None = None  # which SRS entity invoices (SR-UK/US/SA)

    # What / when
    currency: str = "USD"
    period_start: datetime  # inclusive
    period_end: datetime    # inclusive
    invoice_number: str | None = None  # SRS internal ref (auto: INV-YYYYMM-ORG-NNN)
    client_ref: str | None = None      # client PO/BPA ref if aplica

    # Lines
    billing_lines: list[BillingLine] = Field(default_factory=list)

    # Totals (computed at generation, preserved)
    subtotal: float = 0.0
    tax_rate_pct: float = 0.0
    tax_amount: float = 0.0
    total: float = 0.0

    # Lifecycle
    status: InvoiceStatus = "draft"
    issued_at: datetime | None = None     # when moved draft -> sent
    due_date: datetime | None = None      # net-30 default, editable
    sent_at: datetime | None = None       # first dispatch
    paid_at: datetime | None = None
    void_at: datetime | None = None
    void_reason: str | None = None

    # Generation metadata
    generated_from_wo_count: int = 0       # count of WOs rolled into this invoice
    work_order_ids: list[str] = Field(default_factory=list)  # the WOs stamped

    notes: str | None = None
