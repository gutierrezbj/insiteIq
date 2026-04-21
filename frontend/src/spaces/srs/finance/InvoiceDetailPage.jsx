/**
 * Invoice detail — lines breakdown + lifecycle actions (send / paid / void).
 * Visible a SRS (todo) + client coord (solo los de su org).
 */
import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useFetch } from "../../../lib/useFetch";
import ActionDialog, {
  DialogInput,
  DialogLabel,
  DialogTextarea,
} from "../../../components/ui/ActionDialog";
import { formatAge } from "../../../components/ui/Badges";

const STATUS_LOOK = {
  draft: { bg: "bg-text-tertiary", text: "text-text-tertiary", label: "draft" },
  sent: { bg: "bg-warning", text: "text-warning", label: "sent" },
  paid: { bg: "bg-success", text: "text-success", label: "paid" },
  overdue: { bg: "bg-danger", text: "text-danger", label: "overdue" },
  void: { bg: "bg-text-tertiary", text: "text-text-tertiary", label: "void" },
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

export default function InvoiceDetailPage() {
  const { invoice_id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const srsMem = user?.memberships?.find(
    (m) => m.space === "srs_coordinators"
  );
  const isSrsAdmin =
    !!srsMem && ["owner", "director"].includes(srsMem.authority_level);

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
  if (error)
    return <Centered text={`error · ${error.message}`} />;
  if (!inv) return <Centered text="—" />;

  const look = STATUS_LOOK[inv.status] || STATUS_LOOK.draft;

  return (
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide">
      <Link
        to={backHref}
        className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary hover:text-primary-light inline-block mb-3"
      >
        ← {backLabel}
      </Link>

      <div className="accent-bar pl-4 mb-6">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <span className="label-caps">Invoice</span>
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {inv.invoice_number}
          </span>
          <span
            className={`flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest-srs ${look.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${look.bg}`} />
            {look.label}
          </span>
          {inv.client_ref && (
            <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              · client ref {inv.client_ref}
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          {org?.legal_name || inv.organization_id}
        </h1>
        <p className="font-body text-text-secondary text-sm mt-1">
          Periodo {shortDate(inv.period_start)} → {shortDate(inv.period_end)} ·{" "}
          {inv.generated_from_wo_count} WO
          {inv.generated_from_wo_count === 1 ? "" : "s"}
        </p>
      </div>

      {/* Totals strip */}
      <section className="bg-surface-raised accent-bar rounded-sm p-4 mb-5 flex flex-wrap gap-6">
        <Stat
          label="Subtotal"
          value={`${inv.subtotal.toFixed(2)} ${inv.currency}`}
        />
        <Stat
          label={`Tax (${inv.tax_rate_pct}%)`}
          value={`${inv.tax_amount.toFixed(2)} ${inv.currency}`}
        />
        <div>
          <div className="label-caps mb-1">Total</div>
          <div className="font-display text-3xl text-primary-light leading-none">
            {inv.total.toFixed(2)} {inv.currency}
          </div>
        </div>
        <div className="ml-auto flex gap-2 items-end flex-wrap">
          {isSrsAdmin && inv.status === "draft" && (
            <SendAction inv={inv} reload={reload} />
          )}
          {isSrsAdmin && (inv.status === "sent" || inv.status === "overdue") && (
            <MarkPaidAction inv={inv} reload={reload} />
          )}
          {isSrsAdmin && inv.status !== "void" && (
            <VoidAction inv={inv} reload={reload} />
          )}
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-surface-raised accent-bar rounded-sm p-4 mb-5">
        <div className="label-caps mb-3">Lifecycle</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <TimelineStat label="Generado" iso={inv.created_at} />
          <TimelineStat
            label="Emitido"
            iso={inv.issued_at || inv.sent_at}
          />
          <TimelineStat
            label="Vence"
            iso={inv.due_date}
            tone={inv.status === "overdue" ? "danger" : "neutral"}
          />
          <TimelineStat
            label={inv.status === "void" ? "Void" : "Cobrado"}
            iso={inv.paid_at || inv.void_at}
            tone={inv.status === "paid" ? "success" : "neutral"}
          />
        </div>
        {inv.void_reason && (
          <div className="mt-3 bg-surface-base rounded-sm p-3 border-l-2 border-danger">
            <div className="label-caps mb-0.5 text-danger">Void reason</div>
            <div className="font-body text-sm text-text-primary">
              {inv.void_reason}
            </div>
          </div>
        )}
      </section>

      {/* Lines */}
      <section className="bg-surface-raised accent-bar rounded-sm">
        <header className="px-4 py-3 border-b border-surface-border">
          <div className="label-caps">
            Billing lines · {(inv.billing_lines || []).length}
          </div>
        </header>
        <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-surface-border text-text-tertiary">
          <div className="col-span-5 label-caps">Descripcion</div>
          <div className="col-span-2 label-caps">Category</div>
          <div className="col-span-1 label-caps text-right">Qty</div>
          <div className="col-span-2 label-caps text-right">Unit</div>
          <div className="col-span-2 label-caps text-right">Subtotal</div>
        </div>
        <div className="divide-y divide-surface-border">
          {(inv.billing_lines || []).length === 0 && (
            <div className="px-4 py-6 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              — sin lines —
            </div>
          )}
          {(inv.billing_lines || []).map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center"
            >
              <div className="col-span-5 min-w-0">
                <div className="font-body text-sm text-text-primary truncate">
                  {l.description}
                </div>
                {l.work_order_id && (
                  <Link
                    to={`/srs/ops/${l.work_order_id}`}
                    className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light hover:text-primary"
                  >
                    {l.work_order_reference || "wo"} ↗
                  </Link>
                )}
              </div>
              <div className="col-span-2 font-mono text-2xs uppercase tracking-widest-srs text-text-secondary">
                {CATEGORY_LABEL[l.category] || l.category}
              </div>
              <div className="col-span-1 text-right font-mono text-sm text-text-primary">
                {l.quantity}
              </div>
              <div className="col-span-2 text-right font-mono text-sm text-text-primary">
                {l.unit_price.toFixed(2)}
              </div>
              <div className="col-span-2 text-right font-display text-base text-text-primary">
                {l.subtotal.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-surface-border px-4 py-3 grid grid-cols-12 gap-3">
          <div className="col-span-8 label-caps text-right">Total</div>
          <div className="col-span-4 text-right font-display text-xl text-primary-light">
            {inv.total.toFixed(2)} {inv.currency}
          </div>
        </div>
      </section>

      {inv.notes && (
        <section className="bg-surface-raised accent-bar rounded-sm p-4 mt-4">
          <div className="label-caps mb-1.5">Notas</div>
          <p className="font-body text-sm text-text-primary whitespace-pre-line">
            {inv.notes}
          </p>
        </section>
      )}

      <p className="mt-6 text-text-tertiary font-mono text-2xs uppercase tracking-widest-srs">
        Fase 3 Admin/Finance · X-b · PDF + email outbox delivery ·
        aterriza cuando cerremos SMTP/PDF workers
      </p>
    </div>
  );
}

// -------------------- Status actions --------------------

function SendAction({ inv, reload }) {
  const [open, setOpen] = useState(false);
  const [due, setDue] = useState(30);

  async function submit() {
    await api.post(`/invoices/${inv.id}/send`, { due_in_days: Number(due) || 30 });
    reload();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
      >
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
        <p className="font-body text-2xs text-text-tertiary">
          Cuando tengamos SMTP worker (Horizonte 3), este boton dispara email
          automatico al cliente. Hoy solo cambia status + audit log.
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
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-success text-text-inverse hover:bg-success/90 hover:shadow-glow-success transition-all duration-fast ease-out-expo"
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
          <DialogInput
            id="mp-date"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />
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
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-surface-overlay text-text-tertiary border border-surface-border hover:text-danger hover:border-danger transition-colors duration-fast"
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
          <DialogLabel htmlFor="va-reason">Razon</DialogLabel>
          <DialogTextarea
            id="va-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Emitida con error · cliente pide re-agrupar · currency equivocado …"
            required
          />
        </div>
      </ActionDialog>
    </>
  );
}

// -------------------- Blocks --------------------

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

function TimelineStat({ label, iso, tone = "neutral" }) {
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
          {formatAge(iso)} ago
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
