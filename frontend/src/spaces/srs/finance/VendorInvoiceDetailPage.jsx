/**
 * Vendor Invoice detail · v2 paleta F (Iter 2.30).
 *
 * Migración v1 amber legacy → v2 usando v2-shared. Lifecycle:
 *   received → matched → approved → paid (o disputed/rejected)
 * Todas las acciones SRS admin only. SRS-internal: client 403.
 *
 * Endpoints:
 *   GET /api/vendor-invoices/{id}
 *   POST /api/vendor-invoices/{id}/{match|approve|paid|dispute|reject}
 */
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useFetch } from "../../../lib/useFetch";
import { formatAge } from "../../../components/ui/Badges";
import ActionDialog, {
  DialogInput,
  DialogLabel,
  DialogTextarea,
  DialogCheckbox,
} from "../../../components/ui/ActionDialog";
import BackLinkV2 from "../../../components/v2-shared/BackLinkV2";
import SectionCard, { SectionTitle } from "../../../components/v2-shared/SectionCard";
import MetaRow from "../../../components/v2-shared/MetaRow";
import { JAKARTA, MONO, MONO_CAPS } from "../../../components/v2-shared/typography";

const VI_STATUS = {
  received: { dot: "#8B95A8", color: "#3D4A66", label: "received" },
  matched:  { dot: "#1E3A8A", color: "#1E40AF", label: "matched" },
  approved: { dot: "#E8A33D", color: "#7E5212", label: "approved · ready to pay" },
  paid:     { dot: "#16A34A", color: "#0A6131", label: "paid" },
  disputed: { dot: "#DC2626", color: "#991B1B", label: "disputed" },
  rejected: { dot: "#C8CDD8", color: "#8B95A8", label: "rejected" },
};

const MATCH_LOOK = {
  match:         { color: "#0A6131", label: "MATCH" },
  partial_match: { color: "#7E5212", label: "PARTIAL" },
  mismatch:      { color: "#991B1B", label: "MISMATCH" },
  no_po:         { color: "#8B95A8", label: "NO PO" },
};

function StatusPill({ status }) {
  const s = VI_STATUS[status] || VI_STATUS.received;
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
      {s.label}
    </span>
  );
}

export default function VendorInvoiceDetailPage() {
  const { vi_id } = useParams();
  const { user } = useAuth();
  const srsMem = user?.memberships?.find((m) => m.space === "srs_coordinators");
  const isSrsAdmin = !!srsMem && ["owner", "director"].includes(srsMem.authority_level);

  const { data: vi, loading, error, reload } = useFetch(
    `/vendor-invoices/${vi_id}`,
    { deps: [vi_id] }
  );
  const { data: orgs } = useFetch("/organizations");

  const vendor = useMemo(() => {
    if (!vi || !orgs) return null;
    return orgs.find((o) => o.id === vi.vendor_organization_id);
  }, [vi, orgs]);

  if (loading) return <Centered text="cargando…" />;
  if (error) return <Centered text={`error · ${error.message}`} />;
  if (!vi) return <Centered text="—" />;

  const match = vi.match_report;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      <BackLinkV2 to="/srs/finance" label="Finance" />

      <div style={{ paddingLeft: 16, borderLeft: "3px solid #0A1628", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#0A1628", letterSpacing: "0.16em" }}>
            Vendor invoice · AP
          </span>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.12em" }}>
            {vi.vendor_invoice_number}
          </span>
          <StatusPill status={vi.status} />
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
          {vendor?.legal_name || vi.vendor_organization_id}
        </h1>
        <p style={{ fontFamily: JAKARTA, fontSize: 13.5, color: "#3D4A66", marginTop: 8, fontWeight: 500 }}>
          Received {shortDate(vi.received_at)}
          {vi.issued_at && ` · issued ${shortDate(vi.issued_at)}`}
          {vi.due_date && ` · due ${shortDate(vi.due_date)}`}
        </p>
      </div>

      {/* Totals + actions */}
      <SectionCard style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-end" }}>
          <Stat label="Subtotal" value={`${vi.subtotal.toFixed(2)} ${vi.currency}`} />
          <Stat label={`Tax (${vi.tax_rate_pct}%)`} value={`${vi.tax_amount.toFixed(2)} ${vi.currency}`} />
          <div>
            <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
              Total a pagar
            </div>
            <div
              style={{
                fontFamily: JAKARTA,
                fontSize: 32,
                fontWeight: 800,
                color: "#7E5212",
                letterSpacing: "-0.02em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {vi.total.toFixed(2)} <span style={{ fontSize: 18, color: "#3D4A66", fontWeight: 700 }}>{vi.currency}</span>
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            {isSrsAdmin && ["received", "matched"].includes(vi.status) && (
              <MatchAction vi={vi} reload={reload} />
            )}
            {isSrsAdmin && ["received", "matched", "disputed"].includes(vi.status) && (
              <ApproveAction vi={vi} reload={reload} />
            )}
            {isSrsAdmin && vi.status === "approved" && <PaidAction vi={vi} reload={reload} />}
            {isSrsAdmin && !["paid", "rejected"].includes(vi.status) && (
              <DisputeAction vi={vi} reload={reload} />
            )}
            {isSrsAdmin && !["paid", "rejected"].includes(vi.status) && (
              <RejectAction vi={vi} reload={reload} />
            )}
          </div>
        </div>
      </SectionCard>

      {/* Three-way match */}
      <SectionCard style={{ marginBottom: 16 }}>
        <SectionTitle>Three-way match</SectionTitle>
        {!match ? (
          <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", lineHeight: 1.55, fontWeight: 500 }}>
            Aún no corrido. El match compara PO (budget_approval totals) ↔ vendor invoice ↔ receipts
            (tech_captures.parts_used). Corre cuando tengas al menos un linked_budget_approval_id.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
                Resultado
              </div>
              <div
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 18,
                  fontWeight: 800,
                  color: MATCH_LOOK[match.result]?.color || "#8B95A8",
                  letterSpacing: "-0.01em",
                }}
              >
                {MATCH_LOOK[match.result]?.label || match.result}
              </div>
            </div>
            <MatchStat label="PO total" value={`${match.po_total.toFixed(2)} ${vi.currency}`} />
            <MatchStat label="Invoice" value={`${match.invoice_total.toFixed(2)} ${vi.currency}`} />
            <MatchStat
              label="Variance"
              value={`${match.variance >= 0 ? "+" : ""}${match.variance.toFixed(2)} (${match.variance_pct.toFixed(1)}%)`}
              valueColor={Math.abs(match.variance_pct) > 5 ? "#7E5212" : "#0A1628"}
            />
            <MatchStat label="Receipts" value={`${match.receipt_matched_items} items`} />
          </div>
        )}
      </SectionCard>

      {/* Trazabilidad + Lifecycle */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 16,
        }}
      >
        <SectionCard>
          <SectionTitle>Trazabilidad</SectionTitle>
          <dl style={{ display: "flex", flexDirection: "column" }}>
            <MetaRow label="Vendor" value={vendor?.legal_name || vi.vendor_organization_id} />
            <MetaRow label="SRS entity" value={vi.srs_entity_id || "—"} />
            <MetaRow label="Vendor ref" value={vi.vendor_invoice_number} />
            <MetaRow label="Linked WOs" value={(vi.linked_work_order_ids || []).length} />
            <MetaRow label="Linked POs" value={(vi.linked_budget_approval_ids || []).length} />
          </dl>

          {(vi.linked_work_order_ids || []).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 8 }}>
                WOs vinculadas
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {vi.linked_work_order_ids.map((woId) => (
                  <Link
                    key={woId}
                    to={`/srs/ops/${woId}`}
                    style={{
                      display: "block",
                      background: "#F4F6F8",
                      border: "1px solid #E2E5EC",
                      borderRadius: 4,
                      padding: "6px 10px",
                      ...MONO_CAPS,
                      fontSize: 9.5,
                      color: "#0A1628",
                      letterSpacing: "0.12em",
                      fontWeight: 700,
                      textDecoration: "none",
                      transition: "background 160ms",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#E8EDF5")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#F4F6F8")}
                  >
                    {woId.slice(-6)} ↗
                  </Link>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard>
          <SectionTitle>Lifecycle</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <TimelineStat label="Received" iso={vi.received_at} />
            <TimelineStat label="Approved" iso={vi.approved_at} by={vi.approved_by} />
            <TimelineStat
              label={vi.status === "disputed" ? "Disputed" : "Paid"}
              iso={vi.paid_at || vi.disputed_at}
              by={vi.paid_by}
              tone={vi.status === "disputed" ? "danger" : "success"}
            />
            <TimelineStat label="Rejected" iso={vi.rejected_at} tone="danger" />
          </div>
          {vi.wire_ref && (
            <div
              style={{
                marginTop: 14,
                background: "#F4F6F8",
                border: "1px solid #E2E5EC",
                borderRadius: 4,
                padding: "10px 12px",
              }}
            >
              <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
                Wire ref
              </div>
              <div style={{ fontFamily: MONO, fontSize: 13, color: "#0A6131", fontWeight: 700 }}>
                {vi.wire_ref}
              </div>
            </div>
          )}
          {vi.dispute_reason && (
            <CalloutBox tone="danger" label="Dispute reason" text={vi.dispute_reason} />
          )}
          {vi.reject_reason && (
            <CalloutBox tone="muted" label="Reject reason" text={vi.reject_reason} />
          )}
        </SectionCard>
      </div>

      {(vi.lines || []).length > 0 && (
        <SectionCard padding={0} style={{ marginTop: 16 }}>
          <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
            <SectionTitle marginBottom={0}>Invoice lines · {vi.lines.length}</SectionTitle>
          </header>
          <div>
            {vi.lines.map((l, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 18px",
                  borderBottom: "1px solid #F0F2F7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
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
                    {l.description}
                  </div>
                  <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 2 }}>
                    {l.category}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontFamily: JAKARTA,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0A1628",
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1.1,
                    }}
                  >
                    {l.subtotal.toFixed(2)}
                  </div>
                  <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em" }}>
                    {l.quantity} × {l.unit_price.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {vi.notes && (
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
            {vi.notes}
          </p>
        </SectionCard>
      )}

      <p style={{ marginTop: 24, ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
        Iter 2.30 · X-d AP · trazabilidad deudas con proveedores · audit log graba todo
      </p>
    </div>
  );
}

/* ─── Actions ──────────────────────────────────────────────────── */

function MatchAction({ vi, reload }) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      await api.post(`/vendor-invoices/${vi.id}/match`);
      reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      style={{
        ...MONO_CAPS,
        fontSize: 11,
        letterSpacing: "0.14em",
        padding: "8px 14px",
        background: "#FFFFFF",
        color: "#3D4A66",
        border: "1.5px solid #C8CDD8",
        borderRadius: 6,
        cursor: busy ? "not-allowed" : "pointer",
        opacity: busy ? 0.5 : 1,
        transition: "all 160ms",
      }}
      onMouseEnter={(e) => {
        if (busy) return;
        e.currentTarget.style.borderColor = "#0A1628";
        e.currentTarget.style.color = "#0A1628";
        e.currentTarget.style.background = "#F4F6F8";
      }}
      onMouseLeave={(e) => {
        if (busy) return;
        e.currentTarget.style.borderColor = "#C8CDD8";
        e.currentTarget.style.color = "#3D4A66";
        e.currentTarget.style.background = "#FFFFFF";
      }}
    >
      {busy ? "matching…" : "Run match"}
    </button>
  );
}

function ApproveAction({ vi, reload }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [override, setOverride] = useState(false);
  const mismatch = vi.match_report?.result === "mismatch";

  async function submit() {
    await api.post(`/vendor-invoices/${vi.id}/approve`, {
      notes: notes.trim() || null,
      override_mismatch: override,
    });
    reload();
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-trigger-v2">
        Aprobar
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Aprobar vendor invoice"
        subtitle={`${vi.total.toFixed(2)} ${vi.currency} · ready-to-pay`}
        submitLabel="Aprobar"
        submitDisabled={mismatch && !override}
        onSubmit={submit}
      >
        {mismatch && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderLeft: "3px solid #DC2626",
              borderRadius: 4,
              padding: "10px 14px",
            }}
          >
            <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#991B1B", letterSpacing: "0.14em", marginBottom: 6 }}>
              ⚠ Match reporta MISMATCH
            </div>
            <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", fontWeight: 500, lineHeight: 1.5 }}>
              Variance {vi.match_report?.variance_pct?.toFixed(1)}% entre PO
              (${vi.match_report?.po_total?.toFixed(2)}) e invoice
              (${vi.match_report?.invoice_total?.toFixed(2)}).
            </p>
            <div style={{ marginTop: 10 }}>
              <DialogCheckbox
                id="vi-ovr"
                label="Override mismatch (queda audited)"
                checked={override}
                onChange={setOverride}
              />
            </div>
          </div>
        )}
        <div>
          <DialogLabel htmlFor="vi-an" optional>
            Notas
          </DialogLabel>
          <DialogTextarea
            id="vi-an"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </ActionDialog>
    </>
  );
}

function PaidAction({ vi, reload }) {
  const [open, setOpen] = useState(false);
  const [wire, setWire] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");

  async function submit() {
    const body = { wire_ref: wire.trim() };
    if (paidAt) body.paid_at = new Date(paidAt + "T12:00:00Z").toISOString();
    if (notes.trim()) body.notes = notes.trim();
    await api.post(`/vendor-invoices/${vi.id}/paid`, body);
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
        Pagar
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Marcar pagada"
        subtitle={`${vi.total.toFixed(2)} ${vi.currency} · wire_ref requerido`}
        submitLabel="Confirmar pago"
        submitDisabled={!wire.trim()}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="vip-wire">Wire ref / check #</DialogLabel>
          <DialogInput
            id="vip-wire"
            value={wire}
            onChange={(e) => setWire(e.target.value)}
            placeholder="WIRE-20260421-FERVI-001"
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="vip-date" optional>
            Fecha de pago (default hoy)
          </DialogLabel>
          <DialogInput
            id="vip-date"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />
        </div>
        <div>
          <DialogLabel htmlFor="vip-notes" optional>
            Notas
          </DialogLabel>
          <DialogTextarea
            id="vip-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </ActionDialog>
    </>
  );
}

function DisputeAction({ vi, reload }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  async function submit() {
    await api.post(`/vendor-invoices/${vi.id}/dispute`, { reason });
    reload();
  }
  return (
    <>
      <GhostBtn onClick={() => setOpen(true)}>Disputar</GhostBtn>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Disputar vendor invoice"
        subtitle="Flagged · SRS cuestiona el monto o el trabajo no se entregó"
        submitLabel="Disputar"
        destructive
        submitDisabled={!reason.trim()}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="vi-dr">Razón</DialogLabel>
          <DialogTextarea
            id="vi-dr"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Fervimax cobra 2 visitas cuando fue 1 · parts no entregadas · variance excesiva…"
            required
          />
        </div>
      </ActionDialog>
    </>
  );
}

function RejectAction({ vi, reload }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  async function submit() {
    await api.post(`/vendor-invoices/${vi.id}/reject`, { reason });
    reload();
  }
  return (
    <>
      <GhostBtn onClick={() => setOpen(true)}>Rechazar</GhostBtn>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Rechazar vendor invoice"
        subtitle="Invalida · no se paga. Para re-registrar hay que crear nueva."
        submitLabel="Rechazar"
        destructive
        submitDisabled={!reason.trim()}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="vi-rr">Razón</DialogLabel>
          <DialogTextarea
            id="vi-rr"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: factura duplicada · vendor equivocado · no corresponde…"
            required
          />
        </div>
      </ActionDialog>
    </>
  );
}

/* ─── Blocks ───────────────────────────────────────────────────── */

function GhostBtn({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
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
      {children}
    </button>
  );
}

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

function MatchStat({ label, value, valueColor = "#0A1628" }) {
  return (
    <div>
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 14,
          fontWeight: 700,
          color: valueColor,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function TimelineStat({ label, iso, by, tone = "neutral" }) {
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
          {formatAge(iso)} ago{by && ` · ${by.slice(-6)}`}
        </div>
      )}
    </div>
  );
}

function CalloutBox({ tone, label, text }) {
  const colors = tone === "danger"
    ? { bg: "#FEF2F2", border: "#FCA5A5", left: "#DC2626", labelColor: "#991B1B" }
    : { bg: "#F4F6F8", border: "#E2E5EC", left: "#C8CDD8", labelColor: "#3D4A66" };
  return (
    <div
      style={{
        marginTop: 14,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${colors.left}`,
        borderRadius: 4,
        padding: "10px 14px",
      }}
    >
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: colors.labelColor, letterSpacing: "0.14em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", fontWeight: 500, lineHeight: 1.5 }}>
        {text}
      </div>
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
