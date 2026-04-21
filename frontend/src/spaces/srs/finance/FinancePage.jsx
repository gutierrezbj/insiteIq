/**
 * SRS Finance — pre-invoice staging + channel partners + collections ball
 * (Pasito S / Fase 2 scaffold).
 *
 * Sin entidad invoice real (Fase 3), pero útil desde ya:
 *   - Pre-invoice: closed WOs agrupadas por client org sin billing_line_id
 *   - Channel partners: orgs con commission_rule o revenue_split_pct visibles
 *   - Collections ball-in-court: resolved-but-not-closed (cliente dilata sign-off)
 *
 * Precios reales + PDF factura + outbox AP aterrizan Fase 3 (Admin/Finance).
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { useFetch } from "../../../lib/useFetch";
import {
  BallBadge,
  StatusBadge,
  formatAge,
} from "../../../components/ui/Badges";
import GenerateInvoiceAction from "../../../components/finance/GenerateInvoiceAction";

const TABS = [
  { key: "invoices", label: "Invoices" },
  { key: "preinvoice", label: "Pre-invoice" },
  { key: "channels", label: "Channel partners" },
  { key: "collections", label: "Collections ball" },
];

const STATUS_LOOK = {
  draft: { bg: "bg-text-tertiary", text: "text-text-tertiary", label: "draft" },
  sent: { bg: "bg-warning", text: "text-warning", label: "sent" },
  paid: { bg: "bg-success", text: "text-success", label: "paid" },
  overdue: { bg: "bg-danger", text: "text-danger", label: "overdue" },
  void: { bg: "bg-text-tertiary", text: "text-text-tertiary", label: "void" },
};

export default function FinancePage() {
  const [tab, setTab] = useState("invoices");
  const { user } = useAuth();
  const srsMem = user?.memberships?.find(
    (m) => m.space === "srs_coordinators"
  );
  const isSrsAdmin =
    !!srsMem && ["owner", "director"].includes(srsMem.authority_level);

  const { data: wos } = useFetch("/work-orders?limit=500");
  const { data: orgs } = useFetch("/organizations");
  const { data: agreements } = useFetch("/service-agreements");

  const orgById = useMemo(() => {
    const m = new Map();
    for (const o of orgs || []) m.set(o.id, o);
    return m;
  }, [orgs]);

  const agreementById = useMemo(() => {
    const m = new Map();
    for (const a of agreements || []) m.set(a.id, a);
    return m;
  }, [agreements]);

  return (
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide">
      <div className="accent-bar pl-4 mb-6">
        <div className="label-caps">Finance</div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          Pre-invoice · channel splits · collections
        </h1>
        <p className="font-body text-text-secondary text-sm mt-1">
          Fase 2 scaffold · entidad invoice + rates + AP layer aterrizan Fase 3
          (Admin/Finance). Hoy expone lo cobrable y donde se duerme el dinero.
        </p>
      </div>

      <div className="flex gap-1 mb-4 bg-surface-raised accent-bar rounded-sm p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-sm font-mono text-2xs uppercase tracking-widest-srs transition-colors duration-fast ${
              tab === t.key
                ? "bg-surface-overlay text-text-primary"
                : "text-text-tertiary hover:text-text-secondary hover:bg-surface-overlay/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "invoices" && (
        <InvoicesTab orgById={orgById} isSrsAdmin={isSrsAdmin} />
      )}
      {tab === "preinvoice" && (
        <PreInvoiceTab
          wos={wos || []}
          orgById={orgById}
          agreementById={agreementById}
          isSrsAdmin={isSrsAdmin}
        />
      )}
      {tab === "channels" && (
        <ChannelsTab orgs={orgs || []} wos={wos || []} orgById={orgById} />
      )}
      {tab === "collections" && (
        <CollectionsTab wos={wos || []} orgById={orgById} />
      )}
    </div>
  );
}

// -------------------- Invoices tab --------------------

function InvoicesTab({ orgById, isSrsAdmin }) {
  const [statusFilter, setStatusFilter] = useState("");
  const path = statusFilter
    ? `/invoices?status_filter=${statusFilter}&limit=200`
    : "/invoices?limit=200";
  const { data: invoices, loading, reload } = useFetch(path, {
    deps: [statusFilter],
  });

  const list = invoices || [];
  const totals = useMemo(() => {
    const by = { draft: 0, sent: 0, paid: 0, overdue: 0, void: 0 };
    for (const i of list) by[i.status] = (by[i.status] || 0) + 1;
    return by;
  }, [list]);

  return (
    <div className="space-y-4">
      <section className="bg-surface-raised accent-bar rounded-sm p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="label-caps mb-1">Invoices generadas</div>
            <h2 className="font-display text-base text-text-primary">
              {list.length} · draft {totals.draft} · sent {totals.sent} · paid {totals.paid}
              {totals.overdue ? ` · overdue ${totals.overdue}` : ""}
            </h2>
          </div>
          {isSrsAdmin && <GenerateInvoiceAction onGenerated={() => reload()} />}
        </div>
      </section>

      <section className="bg-surface-raised accent-bar rounded-sm">
        <header className="px-4 py-3 border-b border-surface-border flex items-center gap-3 flex-wrap">
          <label htmlFor="inv-status" className="label-caps">
            Status
          </label>
          <select
            id="inv-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-overlay border border-surface-border rounded-sm px-3 py-1.5 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast"
          >
            <option value="">todos</option>
            <option value="draft">draft</option>
            <option value="sent">sent</option>
            <option value="paid">paid</option>
            <option value="overdue">overdue</option>
            <option value="void">void</option>
          </select>
          <div className="ml-auto font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {list.length}
          </div>
        </header>

        <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-surface-border text-text-tertiary">
          <div className="col-span-3 label-caps">Invoice #</div>
          <div className="col-span-3 label-caps">Cliente</div>
          <div className="col-span-2 label-caps">Periodo</div>
          <div className="col-span-1 label-caps text-right">WOs</div>
          <div className="col-span-2 label-caps text-right">Total</div>
          <div className="col-span-1 label-caps text-right">Status</div>
        </div>

        <div className="divide-y divide-surface-border max-h-[65vh] overflow-y-auto">
          {loading && <EmptyRow text="cargando…" />}
          {!loading && list.length === 0 && <EmptyRow text="— sin invoices —" />}
          {list.map((inv) => (
            <Link
              key={inv.id}
              to={`/srs/finance/invoices/${inv.id}`}
              className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center hover:bg-surface-overlay/60 transition-colors duration-fast"
            >
              <div className="col-span-3 min-w-0">
                <div className="font-mono text-sm text-text-primary truncate">
                  {inv.invoice_number}
                </div>
                {inv.client_ref && (
                  <div className="font-mono text-2xs text-text-tertiary truncate">
                    ref {inv.client_ref}
                  </div>
                )}
              </div>
              <div className="col-span-3 font-body text-sm text-text-secondary truncate">
                {orgById.get(inv.organization_id)?.legal_name || inv.organization_id.slice(-6)}
              </div>
              <div className="col-span-2 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                {new Date(inv.period_start).toISOString().slice(0, 7)}
              </div>
              <div className="col-span-1 text-right font-mono text-sm text-text-primary">
                {inv.generated_from_wo_count}
              </div>
              <div className="col-span-2 text-right">
                <div className="font-display text-base text-text-primary leading-none">
                  {inv.total.toFixed(2)}
                </div>
                <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                  {inv.currency}
                </div>
              </div>
              <div className="col-span-1 text-right">
                <StatusPill status={inv.status} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status }) {
  const look = STATUS_LOOK[status] || STATUS_LOOK.draft;
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-widest-srs ${look.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${look.bg}`} />
      {look.label}
    </span>
  );
}

function EmptyRow({ text }) {
  return (
    <div className="px-4 py-6 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}

// -------------------- Pre-invoice tab --------------------

function PreInvoiceTab({ wos, orgById, agreementById }) {
  // Group closed WOs without billing_line_id by org
  const billable = wos.filter(
    (w) => w.status === "closed" && !w.billing_line_id
  );

  const byOrg = useMemo(() => {
    const m = new Map();
    for (const w of billable) {
      const key = w.organization_id;
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(w);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [billable]);

  const byShield = useMemo(() => {
    const c = {};
    for (const w of billable) {
      c[w.shield_level] = (c[w.shield_level] || 0) + 1;
    }
    return c;
  }, [billable]);

  return (
    <div className="space-y-4">
      <section className="bg-surface-raised accent-bar rounded-sm p-4">
        <div className="label-caps mb-3">Resumen facturable</div>
        <div className="flex flex-wrap gap-5">
          <Stat
            label="WOs pendientes"
            value={billable.length}
            hint="closed sin billing_line"
          />
          <Stat label="Clientes" value={byOrg.length} />
          {Object.entries(byShield).map(([shield, count]) => (
            <Stat key={shield} label={`shield ${shield}`} value={count} />
          ))}
        </div>
      </section>

      <section className="bg-surface-raised accent-bar rounded-sm">
        <header className="px-4 py-3 border-b border-surface-border">
          <div className="label-caps">Por cliente</div>
          <h2 className="font-display text-base text-text-primary">
            {byOrg.length} orgs con WOs listas
          </h2>
        </header>
        <div className="divide-y divide-surface-border">
          {byOrg.length === 0 && (
            <Empty text="— nada listo para facturar —" />
          )}
          {byOrg.map(([orgId, wos]) => (
            <OrgBillableRow
              key={orgId}
              org={orgById.get(orgId)}
              orgId={orgId}
              wos={wos}
              agreementById={agreementById}
            />
          ))}
        </div>
      </section>

      <p className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
        Rates por shield + moneda + SR entity facturadora · Fase 3.
      </p>
    </div>
  );
}

function OrgBillableRow({ org, orgId, wos, agreementById }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="px-4 py-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="font-display text-base text-text-primary leading-tight">
            {org?.legal_name || orgId.slice(-6)}
          </div>
          <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {org?.country || "—"} · {(org?.active_roles || []).join(" · ") || "—"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-display text-xl text-text-primary leading-none">
              {wos.length}
            </div>
            <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              WOs
            </div>
          </div>
          <span className="font-mono text-2xs text-text-tertiary">
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </button>
      {expanded && (
        <div className="mt-3 space-y-1.5">
          {wos.map((w) => {
            const ag = agreementById.get(w.service_agreement_id);
            return (
              <Link
                key={w.id}
                to={`/srs/ops/${w.id}`}
                className="block bg-surface-base rounded-sm px-3 py-2 hover:bg-surface-overlay/80 transition-colors duration-fast"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                        {w.reference}
                      </span>
                      <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-secondary">
                        · shield {w.shield_level}
                      </span>
                      {ag && (
                        <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                          · {ag.currency}
                        </span>
                      )}
                    </div>
                    <div className="font-body text-sm text-text-primary truncate">
                      {w.title}
                    </div>
                  </div>
                  <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary flex-shrink-0">
                    closed {w.closed_at ? formatAge(w.closed_at) + " ago" : "—"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -------------------- Channels tab --------------------

function ChannelsTab({ orgs, wos, orgById }) {
  const partnerOrgs = useMemo(
    () =>
      orgs.filter((o) =>
        (o.partner_relationships || []).some(
          (r) =>
            r.status === "active" &&
            (r.type === "channel_partner" ||
              r.type === "joint_venture_partner" ||
              r.type === "prime_contractor")
        )
      ),
    [orgs]
  );

  return (
    <div className="space-y-4">
      <section className="bg-surface-raised accent-bar rounded-sm p-4">
        <div className="label-caps mb-2">
          Channel + JV + prime partners · {partnerOrgs.length} registrados
        </div>
        <p className="font-body text-sm text-text-secondary">
          Commission rules y revenue splits expuestos para que Finance sepa a
          quien le debe qué porcentaje. Monetización = Principio #3 Proxy
          Coordination (medida y monetizable).
        </p>
      </section>

      <section className="bg-surface-raised accent-bar rounded-sm">
        <div className="divide-y divide-surface-border">
          {partnerOrgs.length === 0 && (
            <Empty text="— sin channel partners registrados —" />
          )}
          {partnerOrgs.map((o) => (
            <ChannelRow key={o.id} org={o} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ChannelRow({ org }) {
  const partnerRels = (org.partner_relationships || []).filter(
    (r) =>
      r.status === "active" &&
      (r.type === "channel_partner" ||
        r.type === "joint_venture_partner" ||
        r.type === "prime_contractor")
  );

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="font-display text-base text-text-primary leading-tight">
            {org.legal_name}
          </div>
          <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {org.country || "—"} · {(org.active_roles || []).join(" · ")}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {partnerRels.map((r, i) => (
          <div
            key={i}
            className="bg-surface-base rounded-sm px-3 py-2 flex items-center justify-between gap-3"
          >
            <div>
              <div className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light">
                {r.type}
              </div>
              {r.contract_ref && (
                <div className="font-mono text-2xs text-text-tertiary mt-0.5">
                  {r.contract_ref}
                </div>
              )}
              {r.notes && (
                <div className="font-body text-sm text-text-primary mt-1">
                  {r.notes}
                </div>
              )}
            </div>
            <div className="text-right font-mono text-2xs uppercase tracking-widest-srs">
              {r.commission_rule && (
                <div className="text-success">
                  commission · {formatCommission(r.commission_rule)}
                </div>
              )}
              {r.revenue_split_pct != null && (
                <div className="text-info">
                  rev split {r.revenue_split_pct}%
                </div>
              )}
              {r.cost_split_pct != null && (
                <div className="text-warning">
                  cost split {r.cost_split_pct}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------- Collections tab --------------------

function CollectionsTab({ wos, orgById }) {
  // WOs where the ball is stuck on client for sign-off (resolved state)
  // OR WOs closed > 30 days ago without billing_line (money idle).
  const now = Date.now();
  const stuck = wos.filter((w) => {
    if (w.status === "resolved" && w.ball_in_court?.side === "client") return true;
    if (
      w.status === "closed" &&
      !w.billing_line_id &&
      w.closed_at &&
      now - new Date(w.closed_at).getTime() > 30 * 24 * 60 * 60 * 1000
    )
      return true;
    return false;
  });

  const byOrg = useMemo(() => {
    const m = new Map();
    for (const w of stuck) {
      const key = w.organization_id;
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(w);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [stuck]);

  return (
    <div className="space-y-4">
      <section className="bg-surface-raised accent-bar rounded-sm p-4">
        <div className="label-caps mb-2">Donde se duerme el dinero</div>
        <p className="font-body text-sm text-text-secondary">
          WOs <span className="font-mono text-warning">resolved</span> con ball
          en el cliente (esperando sign-off) + WOs{" "}
          <span className="font-mono text-text-tertiary">closed</span> sin
          billing_line hace mas de 30 dias. Este dashboard se alimentara en Fase
          3 con invoice_outbox + aging buckets reales.
        </p>
      </section>

      <section className="bg-surface-raised accent-bar rounded-sm">
        <header className="px-4 py-3 border-b border-surface-border">
          <div className="label-caps">Atascos actuales</div>
          <h2 className="font-display text-base text-text-primary">
            {stuck.length} WO{stuck.length === 1 ? "" : "s"} · {byOrg.length} org
            {byOrg.length === 1 ? "" : "s"}
          </h2>
        </header>
        <div className="divide-y divide-surface-border">
          {stuck.length === 0 && <Empty text="— sin atascos, todo fluye —" />}
          {byOrg.map(([orgId, list]) => (
            <div key={orgId} className="px-4 py-3">
              <div className="font-display text-sm text-text-primary mb-2">
                {orgById.get(orgId)?.legal_name || orgId.slice(-6)}
                <span className="ml-2 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                  · {list.length} WO{list.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-1.5">
                {list.map((w) => (
                  <Link
                    key={w.id}
                    to={`/srs/ops/${w.id}`}
                    className="block bg-surface-base rounded-sm px-3 py-2 hover:bg-surface-overlay/80 transition-colors duration-fast"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                            {w.reference}
                          </span>
                          <StatusBadge status={w.status} />
                        </div>
                        <div className="font-body text-sm text-text-primary truncate">
                          {w.title}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <BallBadge
                          side={w.ball_in_court?.side}
                          sinceIso={w.ball_in_court?.since}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// -------------------- Helpers --------------------

function Stat({ label, value, hint }) {
  return (
    <div>
      <div className="label-caps mb-0.5">{label}</div>
      <div className="font-display text-2xl text-text-primary leading-none">
        {value}
      </div>
      {hint && (
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-1">
          {hint}
        </div>
      )}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="px-4 py-6 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}

function formatCommission(rule) {
  if (!rule || typeof rule !== "object") return String(rule);
  const parts = [];
  if (rule.base_pct != null) parts.push(`${rule.base_pct}%`);
  if (rule.scope) parts.push(rule.scope);
  if (rule.floor_usd != null) parts.push(`floor $${rule.floor_usd}`);
  if (rule.cap_usd != null) parts.push(`cap $${rule.cap_usd}`);
  return parts.length ? parts.join(" · ") : JSON.stringify(rule);
}
