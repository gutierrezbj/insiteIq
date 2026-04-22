/**
 * Vendor Invoice detail — lifecycle: received → matched → approved → paid
 * (o disputed / rejected). Todas las acciones SRS admin only.
 * SRS-internal: client 403.
 */
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useFetch } from "../../../lib/useFetch";
import ActionDialog, {
  DialogInput,
  DialogLabel,
  DialogTextarea,
  DialogCheckbox,
} from "../../../components/ui/ActionDialog";
import { formatAge } from "../../../components/ui/Badges";

const STATUS_LOOK = {
  received: { bg: "bg-text-tertiary", text: "text-text-tertiary", label: "received" },
  matched: { bg: "bg-info", text: "text-info", label: "matched" },
  approved: { bg: "bg-warning", text: "text-warning", label: "approved · ready to pay" },
  paid: { bg: "bg-success", text: "text-success", label: "paid" },
  disputed: { bg: "bg-danger", text: "text-danger", label: "disputed" },
  rejected: { bg: "bg-text-tertiary", text: "text-text-tertiary", label: "rejected" },
};

const MATCH_LOOK = {
  match: { text: "text-success", label: "MATCH" },
  partial_match: { text: "text-warning", label: "PARTIAL" },
  mismatch: { text: "text-danger", label: "MISMATCH" },
  no_po: { text: "text-text-tertiary", label: "NO PO" },
};

export default function VendorInvoiceDetailPage() {
  const { vi_id } = useParams();
  const { user } = useAuth();
  const srsMem = user?.memberships?.find(
    (m) => m.space === "srs_coordinators"
  );
  const isSrsAdmin =
    !!srsMem && ["owner", "director"].includes(srsMem.authority_level);

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
  if (error)
    return <Centered text={`error · ${error.message}`} />;
  if (!vi) return <Centered text="—" />;

  const look = STATUS_LOOK[vi.status] || STATUS_LOOK.received;
  const match = vi.match_report;

  return (
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide">
      <Link
        to="/srs/finance"
        className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary hover:text-primary-light inline-block mb-3"
      >
        ← Finance
      </Link>

      <div className="accent-bar pl-4 mb-6">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <span className="label-caps">Vendor invoice · AP</span>
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {vi.vendor_invoice_number}
          </span>
          <span
            className={`flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest-srs ${look.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${look.bg}`} />
            {look.label}
          </span>
        </div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          {vendor?.legal_name || vi.vendor_organization_id}
        </h1>
        <p className="font-body text-text-secondary text-sm mt-1">
          Received {shortDate(vi.received_at)}
          {vi.issued_at && ` · issued ${shortDate(vi.issued_at)}`}
          {vi.due_date && ` · due ${shortDate(vi.due_date)}`}
        </p>
      </div>

      {/* Totals + actions */}
      <section className="bg-surface-raised accent-bar rounded-sm p-4 mb-5 flex flex-wrap gap-6">
        <Stat
          label="Subtotal"
          value={`${vi.subtotal.toFixed(2)} ${vi.currency}`}
        />
        <Stat
          label={`Tax (${vi.tax_rate_pct}%)`}
          value={`${vi.tax_amount.toFixed(2)} ${vi.currency}`}
        />
        <div>
          <div className="label-caps mb-1">Total a pagar</div>
          <div className="font-display text-3xl text-warning leading-none">
            {vi.total.toFixed(2)} {vi.currency}
          </div>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap self-end">
          {isSrsAdmin && ["received", "matched"].includes(vi.status) && (
            <MatchAction vi={vi} reload={reload} />
          )}
          {isSrsAdmin &&
            ["received", "matched", "disputed"].includes(vi.status) && (
              <ApproveAction vi={vi} reload={reload} />
            )}
          {isSrsAdmin && vi.status === "approved" && (
            <PaidAction vi={vi} reload={reload} />
          )}
          {isSrsAdmin && !["paid", "rejected"].includes(vi.status) && (
            <DisputeAction vi={vi} reload={reload} />
          )}
          {isSrsAdmin && !["paid", "rejected"].includes(vi.status) && (
            <RejectAction vi={vi} reload={reload} />
          )}
        </div>
      </section>

      {/* Three-way match */}
      <section className="bg-surface-raised accent-bar rounded-sm p-4 mb-5">
        <div className="label-caps mb-3">Three-way match</div>
        {!match ? (
          <p className="font-body text-sm text-text-secondary">
            Aun no corrido. El match compara PO (budget_approval totals) ↔
            vendor invoice ↔ receipts (tech_captures.parts_used). Corre cuando
            tengas al menos un linked_budget_approval_id.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <div className="label-caps mb-0.5">Resultado</div>
              <div
                className={`font-display text-xl ${
                  MATCH_LOOK[match.result]?.text || "text-text-tertiary"
                }`}
              >
                {MATCH_LOOK[match.result]?.label || match.result}
              </div>
            </div>
            <div>
              <div className="label-caps mb-0.5">PO total</div>
              <div className="font-mono text-text-primary">
                {match.po_total.toFixed(2)} {vi.currency}
              </div>
            </div>
            <div>
              <div className="label-caps mb-0.5">Invoice</div>
              <div className="font-mono text-text-primary">
                {match.invoice_total.toFixed(2)} {vi.currency}
              </div>
            </div>
            <div>
              <div className="label-caps mb-0.5">Variance</div>
              <div
                className={`font-mono ${
                  Math.abs(match.variance_pct) > 5
                    ? "text-warning"
                    : "text-text-primary"
                }`}
              >
                {match.variance >= 0 ? "+" : ""}
                {match.variance.toFixed(2)} ({match.variance_pct.toFixed(1)}%)
              </div>
            </div>
            <div>
              <div className="label-caps mb-0.5">Receipts</div>
              <div className="font-mono text-text-primary">
                {match.receipt_matched_items} items
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Links + lifecycle + lines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-surface-raised accent-bar rounded-sm p-4">
          <div className="label-caps mb-3">Trazabilidad</div>
          <dl className="font-body text-sm divide-y divide-surface-border">
            <Row label="Vendor" value={vendor?.legal_name || vi.vendor_organization_id} />
            <Row label="SRS entity" value={vi.srs_entity_id || "—"} />
            <Row label="Vendor ref" value={vi.vendor_invoice_number} />
            <Row
              label="Linked WOs"
              value={(vi.linked_work_order_ids || []).length}
            />
            <Row
              label="Linked POs"
              value={(vi.linked_budget_approval_ids || []).length}
            />
          </dl>

          {(vi.linked_work_order_ids || []).length > 0 && (
            <div className="mt-3">
              <div className="label-caps mb-1.5">WOs vinculadas</div>
              <div className="space-y-1">
                {vi.linked_work_order_ids.map((woId) => (
                  <Link
                    key={woId}
                    to={`/srs/ops/${woId}`}
                    className="block font-mono text-2xs uppercase tracking-widest-srs text-primary-light hover:text-primary bg-surface-base rounded-sm px-2 py-1"
                  >
                    {woId.slice(-6)} ↗
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="bg-surface-raised accent-bar rounded-sm p-4">
          <div className="label-caps mb-3">Lifecycle</div>
          <div className="grid grid-cols-2 gap-3">
            <TimelineStat label="Received" iso={vi.received_at} />
            <TimelineStat
              label="Approved"
              iso={vi.approved_at}
              by={vi.approved_by}
            />
            <TimelineStat
              label={vi.status === "disputed" ? "Disputed" : "Paid"}
              iso={vi.paid_at || vi.disputed_at}
              by={vi.paid_by}
              tone={vi.status === "disputed" ? "danger" : "success"}
            />
            <TimelineStat
              label="Rejected"
              iso={vi.rejected_at}
              tone="danger"
            />
          </div>
          {vi.wire_ref && (
            <div className="mt-3 bg-surface-base rounded-sm p-3">
              <div className="label-caps mb-0.5">Wire ref</div>
              <div className="font-mono text-sm text-success">
                {vi.wire_ref}
              </div>
            </div>
          )}
          {vi.dispute_reason && (
            <div className="mt-3 bg-surface-base rounded-sm p-3 border-l-2 border-danger">
              <div className="label-caps mb-0.5 text-danger">Dispute reason</div>
              <div className="font-body text-sm text-text-primary">
                {vi.dispute_reason}
              </div>
            </div>
          )}
          {vi.reject_reason && (
            <div className="mt-3 bg-surface-base rounded-sm p-3 border-l-2 border-text-tertiary">
              <div className="label-caps mb-0.5">Reject reason</div>
              <div className="font-body text-sm text-text-primary">
                {vi.reject_reason}
              </div>
            </div>
          )}
        </section>
      </div>

      {(vi.lines || []).length > 0 && (
        <section className="bg-surface-raised accent-bar rounded-sm mt-4">
          <header className="px-4 py-3 border-b border-surface-border">
            <div className="label-caps">Invoice lines · {vi.lines.length}</div>
          </header>
          <div className="divide-y divide-surface-border">
            {vi.lines.map((l, i) => (
              <div
                key={i}
                className="px-4 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-body text-sm text-text-primary truncate">
                    {l.description}
                  </div>
                  <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                    {l.category}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm text-text-primary">
                    {l.subtotal.toFixed(2)}
                  </div>
                  <div className="text-2xs text-text-tertiary">
                    {l.quantity} × {l.unit_price.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {vi.notes && (
        <section className="bg-surface-raised accent-bar rounded-sm p-4 mt-4">
          <div className="label-caps mb-1.5">Notas</div>
          <p className="font-body text-sm text-text-primary whitespace-pre-line">
            {vi.notes}
          </p>
        </section>
      )}

      <p className="mt-6 text-text-tertiary font-mono text-2xs uppercase tracking-widest-srs">
        X-d AP · trazabilidad deudas con proveedores · audit log graba todo
      </p>
    </div>
  );
}

// -------------------- Actions --------------------

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
      className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-surface-overlay text-text-secondary border border-surface-border hover:text-text-primary hover:border-primary transition-colors duration-fast disabled:opacity-50"
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
      >
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
          <div className="bg-surface-base rounded-sm p-3 border-l-2 border-danger">
            <div className="label-caps mb-1 text-danger">⚠ Match reporta MISMATCH</div>
            <p className="font-body text-sm text-text-primary">
              Variance {vi.match_report?.variance_pct?.toFixed(1)}% entre PO
              (${vi.match_report?.po_total?.toFixed(2)}) e invoice
              (${vi.match_report?.invoice_total?.toFixed(2)}).
            </p>
            <div className="mt-2">
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
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-success text-text-inverse hover:bg-success/90 hover:shadow-glow-success transition-all duration-fast ease-out-expo"
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-surface-overlay text-text-tertiary border border-surface-border hover:text-danger hover:border-danger transition-colors duration-fast"
      >
        Disputar
      </button>
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
          <DialogLabel htmlFor="vi-dr">Razon</DialogLabel>
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-surface-overlay text-text-tertiary border border-surface-border hover:text-danger hover:border-danger transition-colors duration-fast"
      >
        Rechazar
      </button>
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
          <DialogLabel htmlFor="vi-rr">Razon</DialogLabel>
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

// -------------------- Blocks --------------------

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary flex-shrink-0">
        {label}
      </span>
      <span className="font-body text-sm text-text-primary truncate max-w-[60%] text-right">
        {value}
      </span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="label-caps mb-1">{label}</div>
      <div className="font-display text-xl text-text-primary leading-none">
        {value}
      </div>
    </div>
  );
}

function TimelineStat({ label, iso, by, tone = "neutral" }) {
  const tint =
    tone === "success"
      ? "text-success"
      : tone === "danger"
      ? "text-danger"
      : "text-text-primary";
  return (
    <div className="bg-surface-base rounded-sm p-3">
      <div className="label-caps mb-0.5">{label}</div>
      <div className={`font-body text-sm ${tint}`}>
        {iso ? shortDate(iso) : "—"}
      </div>
      {iso && (
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-0.5">
          {formatAge(iso)} ago{by && ` · ${by.slice(-6)}`}
        </div>
      )}
    </div>
  );
}

function Centered({ text }) {
  return (
    <div className="px-8 py-16 text-center font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
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
