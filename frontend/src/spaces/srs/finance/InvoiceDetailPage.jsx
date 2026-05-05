/**
 * Invoice detail · v2 paleta F (Iter 2.29).
 *
 * Migración v1 amber legacy → v2 usando v2-shared. Lines breakdown +
 * lifecycle actions (send / paid / void) + P&L 3 margenes (X-g).
 * Visible a SRS (todo) + client coord (solo los de su org).
 *
 * Endpoints:
 *   GET /api/invoices/{id}
 *   GET /api/invoices/{id}/pnl (X-g · SRS only)
 *   POST /api/invoices/{id}/send
 *   POST /api/invoices/{id}/paid
 *   POST /api/invoices/{id}/void
 */
import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useFetch } from "../../../lib/useFetch";
import { formatAge } from "../../../components/ui/Badges";
import ActionDialog, {
  DialogInput,
  DialogLabel,
  DialogTextarea,
} from "../../../components/ui/ActionDialog";
import BackLinkV2 from "../../../components/v2-shared/BackLinkV2";
import SectionCard, { SectionTitle } from "../../../components/v2-shared/SectionCard";
import KpiTile from "../../../components/v2-shared/KpiTile";
import { JAKARTA, MONO, MONO_CAPS } from "../../../components/v2-shared/typography";

const INVOICE_STATUS = {
  draft:   { dot: "#8B95A8", color: "#3D4A66" },
  sent:    { dot: "#E8A33D", color: "#7E5212" },
  paid:    { dot: "#16A34A", color: "#0A6131" },
  overdue: { dot: "#DC2626", color: "#991B1B" },
  void:    { dot: "#C8CDD8", color: "#8B95A8" },
};

const CATEGORY_LABEL = {
  wo_base: "WO base",
  after_hours_uplift: "After-hours uplift",
  travel_flat: "Travel flat",
  travel_mileage: "Travel km",
  parts_markup: "Parts markup",
  monthly_fee: "Monthly fee",
  quarterly_fee: "Quarterly fee",
  adjustment: "Adjustment",
};

function StatusPill({ status }) {
  const s = INVOICE_STATUS[status] || INVOICE_STATUS.draft;
  return (
    <span
      style={{
        ...MONO_CAPS,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 9.5,
        color: s.color,
        letterSpacing: "0.12em",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {status || "—"}
    </span>
  );
}

export default function InvoiceDetailPage() {
  const { invoice_id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const srsMem = user?.memberships?.find((m) => m.space === "srs_coordinators");
  const isSrsAdmin = !!srsMem && ["owner", "director"].includes(srsMem.authority_level);

  const { data: inv, loading, error, reload } = useFetch(
    `/invoices/${invoice_id}`,
    { deps: [invoice_id] }
  );
  const { data: orgs } = useFetch("/organizations");

  const org = useMemo(() => {
    if (!inv || !orgs) return null;
    return orgs.find((o) => o.id === inv.organization_id);
  }, [inv, orgs]);

  const inClientSpace = location.pathname.startsWith("/client");
  const backHref = inClientSpace ? "/client" : "/srs/finance";
  const backLabel = inClientSpace ? "Status" : "Finance";

  if (loading) return <Centered text="cargando…" />;
  if (error) return <Centered text={`error · ${error.message}`} />;
  if (!inv) return <Centered text="—" />;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      <BackLinkV2 to={backHref} label={backLabel} />

      <div style={{ paddingLeft: 16, borderLeft: "3px solid #0A1628", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#0A1628", letterSpacing: "0.16em" }}>
            Invoice
          </span>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.12em" }}>
            {inv.invoice_number}
          </span>
          <StatusPill status={inv.status} />
          {inv.client_ref && (
            <span style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.12em" }}>
              · client ref {inv.client_ref}
            </span>
          )}
        </div>
        <h1
          style={{
            fontFamily: JAKARTA,
            fontSize: 28,
            fontWeight: 800,
            color: "#0A1628",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          {org?.legal_name || inv.organization_id}
        </h1>
        <p style={{ fontFamily: JAKARTA, fontSize: 13.5, color: "#3D4A66", marginTop: 8, fontWeight: 500 }}>
          Período {shortDate(inv.period_start)} → {shortDate(inv.period_end)} ·{" "}
          {inv.generated_from_wo_count} WO{inv.generated_from_wo_count === 1 ? "" : "s"}
        </p>
      </div>

      {/* Totals strip + actions */}
      <SectionCard style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-end" }}>
          <Stat label="Subtotal" value={`${inv.subtotal.toFixed(2)} ${inv.currency}`} />
          <Stat label={`Tax (${inv.tax_rate_pct}%)`} value={`${inv.tax_amount.toFixed(2)} ${inv.currency}`} />
          <div>
            <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
              Total
            </div>
            <div
              style={{
                fontFamily: JAKARTA,
                fontSize: 32,
                fontWeight: 800,
                color: "#0A1628",
                letterSpacing: "-0.02em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {inv.total.toFixed(2)} <span style={{ fontSize: 18, color: "#3D4A66", fontWeight: 700 }}>{inv.currency}</span>
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            {isSrsAdmin && inv.status === "draft" && <SendAction inv={inv} reload={reload} />}
            {isSrsAdmin && (inv.status === "sent" || inv.status === "overdue") && (
              <MarkPaidAction inv={inv} reload={reload} />
            )}
            {isSrsAdmin && inv.status !== "void" && <VoidAction inv={inv} reload={reload} />}
          </div>
        </div>
      </SectionCard>

      {/* Lifecycle */}
      <SectionCard style={{ marginBottom: 16 }}>
        <SectionTitle>Lifecycle</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          <TimelineStat label="Generado" iso={inv.created_at} />
          <TimelineStat label="Emitido" iso={inv.issued_at || inv.sent_at} />
          <TimelineStat label="Vence" iso={inv.due_date} tone={inv.status === "overdue" ? "danger" : "neutral"} />
          <TimelineStat
            label={inv.status === "void" ? "Void" : "Cobrado"}
            iso={inv.paid_at || inv.void_at}
            tone={inv.status === "paid" ? "success" : "neutral"}
          />
        </div>
        {inv.void_reason && (
          <div
            style={{
              marginTop: 14,
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderLeft: "3px solid #DC2626",
              borderRadius: 4,
              padding: "10px 14px",
            }}
          >
            <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#991B1B", letterSpacing: "0.14em", marginBottom: 4 }}>
              Void reason
            </div>
            <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", fontWeight: 500 }}>
              {inv.void_reason}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Billing lines */}
      <SectionCard padding={0}>
        <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
          <SectionTitle marginBottom={0}>
            Billing lines · {(inv.billing_lines || []).length}
          </SectionTitle>
        </header>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "5fr 2fr 1fr 2fr 2fr",
            gap: 12,
            padding: "10px 18px",
            background: "#F4F6F8",
            borderBottom: "1px solid #E2E5EC",
            ...MONO_CAPS,
            fontSize: 9.5,
            color: "#3D4A66",
            letterSpacing: "0.14em",
          }}
        >
          <div>Descripción</div>
          <div>Category</div>
          <div style={{ textAlign: "right" }}>Qty</div>
          <div style={{ textAlign: "right" }}>Unit</div>
          <div style={{ textAlign: "right" }}>Subtotal</div>
        </div>
        <div>
          {(inv.billing_lines || []).length === 0 && (
            <div style={{ padding: "20px 18px", ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
              — sin lines —
            </div>
          )}
          {(inv.billing_lines || []).map((l, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "5fr 2fr 1fr 2fr 2fr",
                gap: 12,
                padding: "10px 18px",
                borderBottom: "1px solid #F0F2F7",
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: JAKARTA,
                    fontSize: 13,
                    color: "#0A1628",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {l.description}
                </div>
                {l.work_order_id && (
                  <Link
                    to={`/srs/ops/${l.work_order_id}`}
                    style={{
                      ...MONO_CAPS,
                      fontSize: 9.5,
                      color: "#0A1628",
                      letterSpacing: "0.12em",
                      textDecoration: "underline",
                      textDecorationStyle: "dotted",
                      fontWeight: 800,
                    }}
                  >
                    {l.work_order_reference || "wo"} ↗
                  </Link>
                )}
              </div>
              <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em" }}>
                {CATEGORY_LABEL[l.category] || l.category}
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontFamily: MONO,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0A1628",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {l.quantity}
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontFamily: MONO,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0A1628",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {l.unit_price.toFixed(2)}
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontFamily: JAKARTA,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0A1628",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {l.subtotal.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "8fr 4fr",
            padding: "14px 18px",
            background: "#F4F6F8",
            borderTop: "1px solid #E2E5EC",
            alignItems: "center",
          }}
        >
          <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", textAlign: "right" }}>
            Total
          </div>
          <div
            style={{
              textAlign: "right",
              fontFamily: JAKARTA,
              fontSize: 22,
              fontWeight: 800,
              color: "#0A1628",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.01em",
            }}
          >
            {inv.total.toFixed(2)}{" "}
            <span style={{ fontSize: 14, color: "#3D4A66", fontWeight: 700 }}>{inv.currency}</span>
          </div>
        </div>
      </SectionCard>

      {/* P&L section · SRS only */}
      {isSrsAdmin && <InvoicePnLSection invoice={inv} />}

      {inv.notes && (
        <SectionCard style={{ marginTop: 16 }}>
          <SectionTitle marginBottom={6}>Notas</SectionTitle>
          <p
            style={{
              fontFamily: JAKARTA,
              fontSize: 13,
              color: "#0A1628",
              whiteSpace: "pre-line",
              lineHeight: 1.55,
              fontWeight: 500,
            }}
          >
            {inv.notes}
          </p>
        </SectionCard>
      )}

      <p style={{ marginTop: 24, ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
        Iter 2.29 · X-b + X-g · PDF + email outbox · SMTP/PDF workers Horizonte 3
      </p>
    </div>
  );
}

/* ─── Status actions ───────────────────────────────────────────── */

function SendAction({ inv, reload }) {
  const [open, setOpen] = useState(false);
  const [due, setDue] = useState(30);

  async function submit() {
    await api.post(`/invoices/${inv.id}/send`, { due_in_days: Number(due) || 30 });
    reload();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-trigger-v2">
        Emitir al cliente
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Emitir invoice"
        subtitle="Draft → sent. Fija issued_at + due_date."
        submitLabel="Emitir"
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="sa-due">Due in days</DialogLabel>
          <DialogInput
            id="sa-due"
            type="number"
            min="1"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>
        <p style={{ fontFamily: JAKARTA, fontSize: 11.5, color: "#8B95A8", lineHeight: 1.5, fontWeight: 500 }}>
          Cuando tengamos SMTP worker (Horizonte 3), este botón dispara email automático al cliente.
          Hoy solo cambia status + audit log.
        </p>
      </ActionDialog>
    </>
  );
}

function MarkPaidAction({ inv, reload }) {
  const [open, setOpen] = useState(false);
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");

  async function submit() {
    const body = {};
    if (paidAt) body.paid_at = new Date(paidAt + "T12:00:00Z").toISOString();
    if (notes.trim()) body.notes = notes.trim();
    await api.post(`/invoices/${inv.id}/paid`, body);
    reload();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          ...MONO_CAPS,
          fontSize: 11,
          letterSpacing: "0.14em",
          padding: "8px 14px",
          background: "#16A34A",
          color: "#FFFFFF",
          border: "1.5px solid #16A34A",
          borderRadius: 6,
          cursor: "pointer",
          boxShadow: "0 2px 6px -1px rgba(22, 163, 74, 0.32)",
          transition: "all 160ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#0A6131";
          e.currentTarget.style.borderColor = "#0A6131";
          e.currentTarget.style.boxShadow = "0 4px 12px -2px rgba(22, 163, 74, 0.42)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#16A34A";
          e.currentTarget.style.borderColor = "#16A34A";
          e.currentTarget.style.boxShadow = "0 2px 6px -1px rgba(22, 163, 74, 0.32)";
        }}
      >
        Marcar cobrada
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Marcar cobrada"
        subtitle={`Total ${inv.total.toFixed(2)} ${inv.currency}`}
        submitLabel="Confirmar"
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="mp-date" optional>
            Fecha de cobro (default hoy)
          </DialogLabel>
          <DialogInput id="mp-date" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        </div>
        <div>
          <DialogLabel htmlFor="mp-notes" optional>
            Notas
          </DialogLabel>
          <DialogTextarea
            id="mp-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Wire ref / check # / exchange rate"
          />
        </div>
      </ActionDialog>
    </>
  );
}

function VoidAction({ inv, reload }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function submit() {
    await api.post(`/invoices/${inv.id}/void`, { reason });
    reload();
  }

  const canSubmit = reason.trim().length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          ...MONO_CAPS,
          fontSize: 11,
          letterSpacing: "0.14em",
          padding: "8px 14px",
          background: "#FFFFFF",
          color: "#3D4A66",
          border: "1.5px solid #C8CDD8",
          borderRadius: 6,
          cursor: "pointer",
          transition: "all 160ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#991B1B";
          e.currentTarget.style.borderColor = "#DC2626";
          e.currentTarget.style.background = "#FEF2F2";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#3D4A66";
          e.currentTarget.style.borderColor = "#C8CDD8";
          e.currentTarget.style.background = "#FFFFFF";
        }}
      >
        Void
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Void invoice"
        subtitle="Invalida y libera los WOs para re-billing en otra factura."
        submitLabel="Void"
        destructive
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="va-reason">Razón</DialogLabel>
          <DialogTextarea
            id="va-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Emitida con error · cliente pide re-agrupar · currency equivocado…"
            required
          />
        </div>
      </ActionDialog>
    </>
  );
}

/* ─── Blocks ───────────────────────────────────────────────────── */

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: JAKARTA,
          fontSize: 20,
          fontWeight: 700,
          color: "#0A1628",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function TimelineStat({ label, iso, tone = "neutral" }) {
  const valueColor =
    tone === "success" ? "#0A6131" : tone === "danger" ? "#991B1B" : "#0A1628";
  return (
    <div
      style={{
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        padding: "10px 12px",
      }}
    >
      <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: JAKARTA, fontSize: 13, color: valueColor, fontWeight: 600 }}>
        {iso ? shortDate(iso) : "—"}
      </div>
      {iso && (
        <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 2 }}>
          {formatAge(iso)} ago
        </div>
      )}
    </div>
  );
}

function Centered({ text }) {
  return (
    <div
      style={{
        padding: "60px 32px",
        textAlign: "center",
        ...MONO_CAPS,
        fontSize: 11,
        color: "#8B95A8",
        letterSpacing: "0.14em",
      }}
    >
      {text}
    </div>
  );
}

function shortDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

/* ─── P&L 3 márgenes (X-g) ─────────────────────────────────────── */

function InvoicePnLSection({ invoice }) {
  const { data: pnl, loading, error } = useFetch(`/invoices/${invoice.id}/pnl`, {
    deps: [invoice.id],
  });

  if (loading) {
    return (
      <SectionCard style={{ marginTop: 16 }}>
        <SectionTitle marginBottom={4}>P&L · 3 márgenes</SectionTitle>
        <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
          calculando…
        </div>
      </SectionCard>
    );
  }
  if (error || !pnl) {
    return (
      <SectionCard style={{ marginTop: 16 }}>
        <SectionTitle marginBottom={4}>P&L · 3 márgenes</SectionTitle>
        <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#991B1B", fontWeight: 500 }}>
          {error?.message || "No se pudo computar P&L"}
        </p>
      </SectionCard>
    );
  }

  const coverage = pnl.coverage || {};
  const lowCoverage = (coverage.pct_any_cost ?? 0) < 60;

  return (
    <SectionCard padding={0} style={{ marginTop: 16 }}>
      <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
        <SectionTitle marginBottom={4}>P&L · 3 márgenes · X-g Fase 2</SectionTitle>
        <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
          Revenue {pnl.revenue.toFixed(2)} {pnl.currency} ·{" "}
          <span style={{ color: "#3D4A66", fontWeight: 500 }}>
            cost committed {pnl.cost_committed.toFixed(2)} · cash out {pnl.cash_out.toFixed(2)}
          </span>
        </div>
        <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 6 }}>
          Coverage {coverage.wo_with_any_cost}/{coverage.wo_count} ({coverage.pct_any_cost?.toFixed(0)}%)
          {" · "}
          <span style={{ color: "#0A1628", fontWeight: 800 }}>{coverage.wo_with_vendor_invoice} vendor_invoice</span>
          {" · "}
          <span style={{ color: "#3D4A66", fontWeight: 700 }}>{coverage.wo_with_snapshot} snapshot</span>
          {coverage.wo_with_both > 0 && (
            <span style={{ marginLeft: 6, color: "#1E40AF", fontWeight: 700 }}>
              · {coverage.wo_with_both} both (vendor gana)
            </span>
          )}
          {lowCoverage && (
            <span style={{ marginLeft: 8, color: "#7E5212", fontWeight: 800 }}>
              · low coverage — P&L incompleto
            </span>
          )}
        </div>
      </header>

      <div
        style={{
          padding: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <MarginCard
          label="Nominal"
          tone="primary"
          data={pnl.margins.nominal}
          currency={pnl.currency}
          footnote={pnl.margins.nominal.based_on}
        />
        <MarginCard
          label="Cash-flow"
          tone={pnl.margins.cash_flow.invoice_paid ? "success" : "muted"}
          data={pnl.margins.cash_flow}
          currency={pnl.currency}
          footnote={
            pnl.margins.cash_flow.invoice_paid
              ? `invoice paid · cash out ${pnl.margins.cash_flow.cash_out.toFixed(2)} (solo vendors paid)`
              : "invoice no-paid aún · revenue=0 hasta cobro"
          }
        />
        <MarginCard
          label="Proxy-adjusted"
          tone="warning"
          data={pnl.margins.proxy_adjusted}
          currency={pnl.currency}
          footnote={`menos ${pnl.coordination_cost.toFixed(2)} coordination absorbido`}
        />
      </div>

      <div style={{ padding: "14px 18px", borderTop: "1px solid #E2E5EC" }}>
        <SectionTitle marginBottom={10}>Per-WO breakdown</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 380, overflowY: "auto" }}>
          {(pnl.per_wo || []).map((w) => (
            <Link
              key={w.work_order_id}
              to={`/srs/ops/${w.work_order_id}`}
              style={{
                display: "block",
                background: "#F4F6F8",
                border: "1px solid #E2E5EC",
                borderRadius: 4,
                padding: "8px 12px",
                textDecoration: "none",
                transition: "background 160ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#E8EDF5")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#F4F6F8")}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                    <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
                      {w.reference || w.work_order_id.slice(-6)}
                    </span>
                    <CostSourcePill source={w.cost_source} />
                    {w.vendor_invoices_count > 0 && (
                      <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A1628", letterSpacing: "0.12em", fontWeight: 800 }}>
                        · {w.vendor_invoices_count} VI
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: JAKARTA,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#0A1628",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {w.title || "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {w.cost_source === "none" ? (
                    <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em" }}>
                      sin cost
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#0A1628",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {w.cost_committed.toFixed(2)}
                      </div>
                      {w.cash_out > 0 && w.cash_out !== w.cost_committed && (
                        <div
                          style={{
                            fontFamily: MONO,
                            fontSize: 10,
                            color: "#0A6131",
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                            marginTop: 2,
                          }}
                        >
                          {w.cash_out.toFixed(2)} cash
                        </div>
                      )}
                      {w.coordination_cost > 0 && (
                        <div
                          style={{
                            fontFamily: MONO,
                            fontSize: 10,
                            color: "#7E5212",
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                            marginTop: 2,
                          }}
                        >
                          +{w.coordination_cost.toFixed(2)} coord
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: "10px 18px",
          borderTop: "1px solid #E2E5EC",
          ...MONO_CAPS,
          fontSize: 9.5,
          color: "#8B95A8",
          letterSpacing: "0.14em",
        }}
      >
        X-g Fase 2 · vendor_invoices prioritarias (AP real) · cost_snapshot fallback
      </div>
    </SectionCard>
  );
}

function CostSourcePill({ source }) {
  if (source === "vendor_invoice") {
    return (
      <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A1628", letterSpacing: "0.12em", fontWeight: 800 }}>
        · vendor_invoice
      </span>
    );
  }
  if (source === "cost_snapshot") {
    return (
      <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.12em", fontWeight: 700 }}>
        · snapshot
      </span>
    );
  }
  return null;
}

function MarginCard({ label, tone, data, currency, footnote }) {
  const tones = {
    primary: { color: "#0A1628", bar: "#0A1628" },
    success: { color: "#0A6131", bar: "#16A34A" },
    warning: { color: "#7E5212", bar: "#E8A33D" },
    muted:   { color: "#3D4A66", bar: "#C8CDD8" },
  };
  const t = tones[tone] || tones.primary;
  const neg = data.amount < 0;
  const valueColor = neg ? "#991B1B" : t.color;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        borderLeft: `3px solid ${neg ? "#DC2626" : t.bar}`,
        borderRadius: 6,
        padding: "12px 16px",
      }}
    >
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: JAKARTA,
          fontSize: 28,
          fontWeight: 800,
          color: valueColor,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {data.amount.toFixed(2)}
      </div>
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 6 }}>
        {currency}
        {" · "}
        <span style={{ color: valueColor, fontWeight: 800 }}>{data.pct.toFixed(1)}%</span>
      </div>
      {footnote && (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color: "#8B95A8",
            marginTop: 8,
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          {footnote}
        </div>
      )}
    </div>
  );
}
