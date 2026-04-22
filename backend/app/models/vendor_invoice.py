"""
InsiteIQ v1 — VendorInvoice (Pasito X-d · Fase 3 AP).

La otra cara del libro: lo que SRS DEBE a proveedores.
Vendors son entidades con partner_relationships.type in
{vendor_labor, vendor_material, vendor_service}. El mismo modelo de
Organization, distinto rol.

Flujo AP operativo:
  1. Vendor manda factura (pdf/email) con su numero + amount
  2. SRS registra como VendorInvoice (received status)
  3. SRS vincula con work_order_ids + budget_approval_ids (el PO original)
  4. Three-way match compara:
     - PO (budget_approval_request) amount
     - Vendor invoice amount
     - Receipt (tech_capture parts_used) si aplica
     Resultado: match / partial_match / mismatch
  5. SRS aprueba (approved) si el match es bueno o hace override
  6. SRS marca paid con wire_ref + paid_at
  7. Feed al P&L como cost_real (X-g Fase 2)

Estados:
  received        registrada, pending review
  matched         3-way match ejecutado (con resultado)
  approved        ready to pay
  paid            cash salio del banco SRS
  disputed        SRS cuestiona el amount
  rejected        SRS rechaza (void post-registro)

Aging buckets (computed):
  current (0-30d desde received)
  30-60d
  60-90d
  90d+
"""
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

VendorInvoiceStatus = Literal[
    "received",  # registrada, pending review
    "matched",   # three-way match ejecutado
    "approved",  # ok to pay
    "paid",      # cash salido
    "disputed",  # SRS cuestiona
    "rejected",  # invalidada
]

MatchResult = Literal["match", "partial_match", "mismatch", "no_po"]


class VendorInvoiceLine(BaseModel):
    """Linea de la factura del vendor (opcional, para detalle interno)."""
    model_config = ConfigDict(extra="ignore")

    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    subtotal: float = 0.0
    category: Literal[
        "labor", "parts", "travel", "service", "other"
    ] = "other"
    # If this line maps to a specific budget_approval_request.parts entry
    matched_part_name: str | None = None


class ThreeWayMatchReport(BaseModel):
    """Resultado del match PO ↔ VendorInvoice ↔ Receipt."""
    model_config = ConfigDict(extra="ignore")

    result: MatchResult
    po_total: float = 0.0
    invoice_total: float = 0.0
    receipt_matched_items: int = 0
    variance: float = 0.0  # invoice - po (positive = vendor charges more)
    variance_pct: float = 0.0
    notes: str | None = None
    matched_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    matched_by: str | None = None


class VendorInvoice(BaseMongoModel):
    # Who
    vendor_organization_id: str = Field(
        ..., description="Vendor org (partner_relationships.type=vendor_*)"
    )
    srs_entity_id: str | None = None  # which SR entity owes (SR-UK/US/SA)

    # What (from vendor)
    vendor_invoice_number: str  # the vendor's own invoice #
    issued_at: datetime | None = None  # vendor invoice date
    due_date: datetime | None = None
    currency: str = "USD"
    subtotal: float = 0.0
    tax_rate_pct: float = 0.0
    tax_amount: float = 0.0
    total: float

    # Lines (optional, for internal detail)
    lines: list[VendorInvoiceLine] = Field(default_factory=list)

    # Links to what we asked for and what we received
    linked_work_order_ids: list[str] = Field(default_factory=list)
    linked_budget_approval_ids: list[str] = Field(default_factory=list)
    # If this invoice is for a recurring thing (not WO-bound), allow agreement-only
    service_agreement_id: str | None = None

    # Three-way match result (stamped after running)
    match_report: ThreeWayMatchReport | None = None

    # Lifecycle
    status: VendorInvoiceStatus = "received"
    received_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    approved_at: datetime | None = None
    approved_by: str | None = None
    paid_at: datetime | None = None
    paid_by: str | None = None
    wire_ref: str | None = None  # bank reference / check # / invoice payment ref
    rejected_at: datetime | None = None
    reject_reason: str | None = None
    disputed_at: datetime | None = None
    dispute_reason: str | None = None

    # Attachments (upload IDs — pdf del vendor, receipts, etc.)
    attachment_urls: list[str] = Field(default_factory=list)

    notes: str | None = None
