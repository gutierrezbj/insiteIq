/**
 * SRS Finance · v2 paleta F (Iter 2.26).
 *
 * Migración v1 amber legacy → v2 usando v2-shared. Pasito S + X-c + X-d.
 * 6 tabs:
 *   - Invoices (AR)
 *   - Vendor payables (AP) con aging buckets
 *   - Recurring (subscriptions con run/pause/resume/cancel)
 *   - Pre-invoice (closed WOs sin billing_line)
 *   - Channel partners (commission rules · Principio #3)
 *   - Collections ball (donde se duerme el dinero)
 *
 * Action components (Generate/Create/ActionDialog) preservados v1 — sprint
 * propio. Detail pages (InvoiceDetail / VendorInvoiceDetail) tambien v1.
 *
 * Endpoints:
 *   GET /api/invoices?status_filter=&limit=200
 *   GET /api/vendor-invoices?status_filter=&limit=200
 *   GET /api/vendor-invoices/aging/summary
 *   GET /api/subscriptions
 *   GET /api/work-orders?limit=500
 *   GET /api/organizations
 *   GET /api/service-agreements
 *   POST /api/subscriptions/{id}/{run-now|pause|resume|cancel}
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { useFetch } from "../../../lib/useFetch";
import { api } from "../../../lib/api";
import { formatAge } from "../../../components/ui/Badges";
import GenerateInvoiceAction from "../../../components/finance/GenerateInvoiceAction";
import CreateSubscriptionAction from "../../../components/finance/CreateSubscriptionAction";
import CreateVendorInvoiceAction from "../../../components/finance/CreateVendorInvoiceAction";
import ActionDialog, {
  DialogTextarea,
  DialogLabel,
} from "../../../components/ui/ActionDialog";
import { WoStatusPill, BallPill } from "../../../components/v2-shared/Pills";
import KpiTile from "../../../components/v2-shared/KpiTile";
import SectionCard, { SectionTitle } from "../../../components/v2-shared/SectionCard";
import { JAKARTA, MONO, MONO_CAPS } from "../../../components/v2-shared/typography";

const TABS = [
  { key: "invoices", label: "Invoices (AR)" },
  { key: "vendor_payables", label: "Vendor payables (AP)" },
  { key: "recurring", label: "Recurring" },
  { key: "preinvoice", label: "Pre-invoice" },
  { key: "channels", label: "Channel partners" },
  { key: "collections", label: "Collections ball" },
];

/* ─── Status pills inline ──────────────────────────────────────── */

const INVOICE_STATUS = {
  draft:   { dot: "#8B95A8", color: "#3D4A66" },
  sent:    { dot: "#E8A33D", color: "#7E5212" },
  paid:    { dot: "#16A34A", color: "#0A6131" },
  overdue: { dot: "#DC2626", color: "#991B1B" },
  void:    { dot: "#C8CDD8", color: "#8B95A8" },
};

const SUB_STATUS = {
  active:    { dot: "#16A34A", color: "#0A6131" },
  paused:    { dot: "#E8A33D", color: "#7E5212" },
  cancelled: { dot: "#C8CDD8", color: "#8B95A8" },
};

const VI_STATUS = {
  received: { dot: "#8B95A8", color: "#3D4A66" },
  matched:  { dot: "#1E3A8A", color: "#1E40AF" },
  approved: { dot: "#E8A33D", color: "#7E5212" },
  paid:     { dot: "#16A34A", color: "#0A6131" },
  disputed: { dot: "#DC2626", color: "#991B1B" },
  rejected: { dot: "#C8CDD8", color: "#8B95A8" },
};

function StatusPillDot({ map, status }) {
  const s = map[status] || Object.values(map)[0];
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

/* ─── Page ─────────────────────────────────────────────────────── */

export default function FinancePage() {
  const [tab, setTab] = useState("invoices");
  const { user } = useAuth();
  const srsMem = user?.memberships?.find((m) => m.space === "srs_coordinators");
  const isSrsAdmin = !!srsMem && ["owner", "director"].includes(srsMem.authority_level);

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
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ paddingLeft: 16, borderLeft: "3px solid #0A1628", marginBottom: 22 }}>
        <div style={{ ...MONO_CAPS, fontSize: 11, color: "#8B95A8", marginBottom: 6 }}>
          Finance
        </div>
        <h1
          style={{
            fontFamily: JAKARTA,
            fontSize: 28,
            fontWeight: 800,
            color: "#0A1628",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          Pre-invoice · channel splits · collections
        </h1>
        <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", marginTop: 6, fontWeight: 500 }}>
          Fase 2 scaffold · entidad invoice + rates + AP layer aterrizan Fase 3 (Admin/Finance).
          Hoy expone lo cobrable y dónde se duerme el dinero.
        </p>
      </div>

      {/* Tabs nav */}
      <div
        style={{
          display: "inline-flex",
          gap: 4,
          padding: 4,
          background: "#FFFFFF",
          border: "1px solid #E2E5EC",
          borderRadius: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {TABS.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                padding: "8px 14px",
                ...MONO_CAPS,
                fontSize: 10,
                letterSpacing: "0.14em",
                background: isActive ? "#0A1628" : "transparent",
                color: isActive ? "#FFFFFF" : "#3D4A66",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                transition: "all 160ms",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "#F0F2F7";
                  e.currentTarget.style.color = "#0A1628";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#3D4A66";
                }
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "invoices" && <InvoicesTab orgById={orgById} isSrsAdmin={isSrsAdmin} />}
      {tab === "vendor_payables" && <VendorPayablesTab orgById={orgById} isSrsAdmin={isSrsAdmin} />}
      {tab === "recurring" && <RecurringTab orgById={orgById} isSrsAdmin={isSrsAdmin} />}
      {tab === "preinvoice" && (
        <PreInvoiceTab
          wos={wos || []}
          orgById={orgById}
          agreementById={agreementById}
        />
      )}
      {tab === "channels" && <ChannelsTab orgs={orgs || []} />}
      {tab === "collections" && <CollectionsTab wos={wos || []} orgById={orgById} />}
    </div>
  );
}

/* ─── Invoices tab (AR) ───────────────────────────────────────── */

function InvoicesTab({ orgById, isSrsAdmin }) {
  const [statusFilter, setStatusFilter] = useState("");
  const path = statusFilter
    ? `/invoices?status_filter=${statusFilter}&limit=200`
    : "/invoices?limit=200";
  const { data: invoices, loading, reload } = useFetch(path, { deps: [statusFilter] });

  const list = invoices || [];
  const totals = useMemo(() => {
    const by = { draft: 0, sent: 0, paid: 0, overdue: 0, void: 0 };
    for (const i of list) by[i.status] = (by[i.status] || 0) + 1;
    return by;
  }, [list]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionCard>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <SectionTitle marginBottom={4}>Invoices generadas</SectionTitle>
            <div style={{ fontFamily: JAKARTA, fontSize: 16, fontWeight: 700, color: "#0A1628" }}>
              {list.length}{" "}
              <span style={{ color: "#3D4A66", fontWeight: 500 }}>
                · draft {totals.draft} · sent {totals.sent} · paid {totals.paid}
                {totals.overdue ? ` · overdue ${totals.overdue}` : ""}
              </span>
            </div>
          </div>
          {isSrsAdmin && <GenerateInvoiceAction onGenerated={() => reload()} />}
        </div>
      </SectionCard>

      <SectionCard padding={0}>
        <header
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid #E2E5EC",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <label
            htmlFor="inv-status"
            style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em" }}
          >
            Status
          </label>
          <select
            id="inv-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="">todos</option>
            <option value="draft">draft</option>
            <option value="sent">sent</option>
            <option value="paid">paid</option>
            <option value="overdue">overdue</option>
            <option value="void">void</option>
          </select>
          <div
            style={{
              marginLeft: "auto",
              ...MONO_CAPS,
              fontSize: 11,
              color: "#0A1628",
              letterSpacing: "0.14em",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 800,
            }}
          >
            {list.length}
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 3fr 2fr 1fr 2fr 1fr",
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
          <div>Invoice #</div>
          <div>Cliente</div>
          <div>Periodo</div>
          <div style={{ textAlign: "right" }}>WOs</div>
          <div style={{ textAlign: "right" }}>Total</div>
          <div style={{ textAlign: "right" }}>Status</div>
        </div>

        <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
          {loading && <Empty text="cargando…" />}
          {!loading && list.length === 0 && <Empty text="— sin invoices —" />}
          {list.map((inv) => (
            <Link
              key={inv.id}
              to={`/srs/finance/invoices/${inv.id}`}
              style={tableRowStyle("3fr 3fr 2fr 1fr 2fr 1fr")}
              onMouseEnter={hoverRow}
              onMouseLeave={leaveRow}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 13,
                    color: "#0A1628",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {inv.invoice_number}
                </div>
                {inv.client_ref && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 10,
                      color: "#8B95A8",
                      marginTop: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    ref {inv.client_ref}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 13,
                  color: "#3D4A66",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {orgById.get(inv.organization_id)?.legal_name ||
                  inv.organization_id.slice(-6)}
              </div>
              <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em" }}>
                {new Date(inv.period_start).toISOString().slice(0, 7)}
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontFamily: MONO,
                  fontSize: 13,
                  color: "#0A1628",
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {inv.generated_from_wo_count}
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: JAKARTA,
                    fontSize: 14,
                    color: "#0A1628",
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.1,
                  }}
                >
                  {inv.total.toFixed(2)}
                </div>
                <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em" }}>
                  {inv.currency}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <StatusPillDot map={INVOICE_STATUS} status={inv.status} />
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── Pre-invoice tab ──────────────────────────────────────────── */

function PreInvoiceTab({ wos, orgById, agreementById }) {
  const billable = wos.filter((w) => w.status === "closed" && !w.billing_line_id);

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
    for (const w of billable) c[w.shield_level] = (c[w.shield_level] || 0) + 1;
    return c;
  }, [billable]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionCard>
        <SectionTitle>Resumen facturable</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          <KpiTile label="WOs pendientes" value={billable.length} hint="closed sin billing_line" tone="primary" />
          <KpiTile label="Clientes" value={byOrg.length} />
          {Object.entries(byShield).map(([shield, count]) => (
            <KpiTile key={shield} label={`shield ${shield}`} value={count} />
          ))}
        </div>
      </SectionCard>

      <SectionCard padding={0}>
        <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
          <SectionTitle marginBottom={2}>Por cliente</SectionTitle>
          <div style={{ fontFamily: JAKARTA, fontSize: 16, fontWeight: 700, color: "#0A1628" }}>
            {byOrg.length} <span style={{ color: "#3D4A66", fontWeight: 500 }}>orgs con WOs listas</span>
          </div>
        </header>
        <div>
          {byOrg.length === 0 && <Empty text="— nada listo para facturar —" />}
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
      </SectionCard>

      <p style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
        Rates por shield + moneda + SR entity facturadora · Fase 3.
      </p>
    </div>
  );
}

function OrgBillableRow({ org, orgId, wos, agreementById }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ padding: "14px 18px", borderBottom: "1px solid #F0F2F7" }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          textAlign: "left",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: JAKARTA, fontSize: 15, fontWeight: 700, color: "#0A1628", lineHeight: 1.2 }}>
            {org?.legal_name || orgId.slice(-6)}
          </div>
          <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 2 }}>
            {org?.country || "—"} · {(org?.active_roles || []).join(" · ") || "—"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: JAKARTA,
                fontSize: 22,
                fontWeight: 800,
                color: "#0A1628",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              {wos.length}
            </div>
            <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em" }}>WOs</div>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "#3D4A66", fontWeight: 700 }}>
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </button>
      {expanded && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {wos.map((w) => {
            const ag = agreementById.get(w.service_agreement_id);
            return (
              <Link
                key={w.id}
                to={`/srs/ops/${w.id}`}
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
                        {w.reference}
                      </span>
                      <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.12em" }}>
                        · shield {w.shield_level}
                      </span>
                      {ag && (
                        <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
                          · {ag.currency}
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
                        marginTop: 2,
                      }}
                    >
                      {w.title}
                    </div>
                  </div>
                  <div
                    style={{
                      ...MONO_CAPS,
                      fontSize: 9.5,
                      color: "#8B95A8",
                      letterSpacing: "0.12em",
                      flexShrink: 0,
                    }}
                  >
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

/* ─── Channels tab ─────────────────────────────────────────────── */

function ChannelsTab({ orgs }) {
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionCard>
        <SectionTitle>
          Channel + JV + prime partners · {partnerOrgs.length} registrados
        </SectionTitle>
        <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", lineHeight: 1.55, fontWeight: 500 }}>
          Commission rules y revenue splits expuestos para que Finance sepa a quién le debe qué porcentaje.
          Monetización = Principio #3 Proxy Coordination (medida y monetizable).
        </p>
      </SectionCard>

      <SectionCard padding={0}>
        <div>
          {partnerOrgs.length === 0 && <Empty text="— sin channel partners registrados —" />}
          {partnerOrgs.map((o) => <ChannelRow key={o.id} org={o} />)}
        </div>
      </SectionCard>
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
    <div style={{ padding: "14px 18px", borderBottom: "1px solid #F0F2F7" }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: JAKARTA, fontSize: 15, fontWeight: 700, color: "#0A1628", lineHeight: 1.2 }}>
          {org.legal_name}
        </div>
        <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 2 }}>
          {org.country || "—"} · {(org.active_roles || []).join(" · ")}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {partnerRels.map((r, i) => (
          <div
            key={i}
            style={{
              background: "#F4F6F8",
              border: "1px solid #E2E5EC",
              borderRadius: 4,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A1628", letterSpacing: "0.14em" }}>
                {r.type}
              </div>
              {r.contract_ref && (
                <div style={{ fontFamily: MONO, fontSize: 10, color: "#8B95A8", marginTop: 2, fontWeight: 500 }}>
                  {r.contract_ref}
                </div>
              )}
              {r.notes && (
                <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", marginTop: 4, fontWeight: 500 }}>
                  {r.notes}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
              {r.commission_rule && (
                <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A6131", letterSpacing: "0.12em" }}>
                  commission · {formatCommission(r.commission_rule)}
                </div>
              )}
              {r.revenue_split_pct != null && (
                <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#1E40AF", letterSpacing: "0.12em" }}>
                  rev split {r.revenue_split_pct}%
                </div>
              )}
              {r.cost_split_pct != null && (
                <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#7E5212", letterSpacing: "0.12em" }}>
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

function formatCommission(rule) {
  if (!rule || typeof rule !== "object") return String(rule);
  const parts = [];
  if (rule.base_pct != null) parts.push(`${rule.base_pct}%`);
  if (rule.scope) parts.push(rule.scope);
  if (rule.floor_usd != null) parts.push(`floor $${rule.floor_usd}`);
  if (rule.cap_usd != null) parts.push(`cap $${rule.cap_usd}`);
  return parts.length ? parts.join(" · ") : JSON.stringify(rule);
}

/* ─── Collections tab ──────────────────────────────────────────── */

function CollectionsTab({ wos, orgById }) {
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionCard>
        <SectionTitle>Donde se duerme el dinero</SectionTitle>
        <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", lineHeight: 1.55, fontWeight: 500 }}>
          WOs <span style={{ color: "#7E5212", fontWeight: 700 }}>resolved</span> con ball
          en el cliente (esperando sign-off) +{" "}
          <span style={{ color: "#3D4A66", fontWeight: 700 }}>closed</span> sin billing_line hace más de 30 días.
          Se alimentará en Fase 3 con invoice_outbox + aging buckets reales.
        </p>
      </SectionCard>

      <SectionCard padding={0}>
        <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
          <SectionTitle marginBottom={2}>Atascos actuales</SectionTitle>
          <div style={{ fontFamily: JAKARTA, fontSize: 16, fontWeight: 700, color: "#0A1628" }}>
            {stuck.length} <span style={{ color: "#3D4A66", fontWeight: 500 }}>WO{stuck.length === 1 ? "" : "s"} · {byOrg.length} org{byOrg.length === 1 ? "" : "s"}</span>
          </div>
        </header>
        <div>
          {stuck.length === 0 && <Empty text="— sin atascos, todo fluye —" />}
          {byOrg.map(([orgId, list]) => (
            <div key={orgId} style={{ padding: "14px 18px", borderBottom: "1px solid #F0F2F7" }}>
              <div
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0A1628",
                  marginBottom: 8,
                }}
              >
                {orgById.get(orgId)?.legal_name || orgId.slice(-6)}
                <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em", marginLeft: 10, fontWeight: 700 }}>
                  · {list.length} WO{list.length === 1 ? "" : "s"}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {list.map((w) => (
                  <Link
                    key={w.id}
                    to={`/srs/ops/${w.id}`}
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
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
                            {w.reference}
                          </span>
                          <WoStatusPill status={w.status} />
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
                          {w.title}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <BallPill side={w.ball_in_court?.side} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── Recurring tab (X-c) ──────────────────────────────────────── */

function RecurringTab({ orgById, isSrsAdmin }) {
  const { data: subs, loading, reload } = useFetch("/subscriptions");

  const list = subs || [];
  const monthlyRunRate = useMemo(() => {
    let total = 0;
    for (const s of list) {
      if (s.status !== "active") continue;
      if (s.cadence === "monthly") total += s.amount;
      else if (s.cadence === "quarterly") total += s.amount / 3;
      else if (s.cadence === "annual") total += s.amount / 12;
    }
    return total;
  }, [list]);

  const currencyMix = useMemo(() => {
    const c = new Set(list.filter((s) => s.status === "active").map((s) => s.currency));
    return [...c];
  }, [list]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionCard>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <SectionTitle marginBottom={4}>Recurring streams</SectionTitle>
            <div style={{ fontFamily: JAKARTA, fontSize: 16, fontWeight: 700, color: "#0A1628" }}>
              {list.filter((s) => s.status === "active").length}{" "}
              <span style={{ color: "#3D4A66", fontWeight: 500 }}>
                activos · {list.filter((s) => s.status === "paused").length} paused ·{" "}
                {list.filter((s) => s.status === "cancelled").length} cancelled
              </span>
            </div>
            {monthlyRunRate > 0 && (
              <div style={{ ...MONO_CAPS, fontSize: 10, color: "#0A1628", letterSpacing: "0.14em", marginTop: 6, fontWeight: 700 }}>
                run-rate ≈ {monthlyRunRate.toFixed(0)} /mo{" "}
                {currencyMix.length === 1 ? currencyMix[0] : `(mix: ${currencyMix.join(", ")})`}
              </div>
            )}
          </div>
          {isSrsAdmin && <CreateSubscriptionAction onCreated={() => reload()} />}
        </div>
      </SectionCard>

      <SectionCard padding={0}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 2fr 2fr 1fr 2fr 1fr 1fr",
            gap: 10,
            padding: "10px 18px",
            background: "#F4F6F8",
            borderBottom: "1px solid #E2E5EC",
            ...MONO_CAPS,
            fontSize: 9.5,
            color: "#3D4A66",
            letterSpacing: "0.14em",
          }}
        >
          <div>Título</div>
          <div>Cliente</div>
          <div style={{ textAlign: "right" }}>Amount</div>
          <div>Cadence</div>
          <div>Next run</div>
          <div style={{ textAlign: "right" }}>Status</div>
          <div style={{ textAlign: "right" }}>Acciones</div>
        </div>

        <div>
          {loading && <Empty text="cargando…" />}
          {!loading && list.length === 0 && <Empty text="— sin subscriptions · crea la primera —" />}
          {list.map((s) => (
            <SubscriptionRow
              key={s.id}
              sub={s}
              orgById={orgById}
              isSrsAdmin={isSrsAdmin}
              reload={reload}
            />
          ))}
        </div>
      </SectionCard>

      <p style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
        X-c · run-now manual hoy · cron worker aterriza Horizonte 3
      </p>
    </div>
  );
}

function SubscriptionRow({ sub, orgById, isSrsAdmin, reload }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "3fr 2fr 2fr 1fr 2fr 1fr 1fr",
        gap: 10,
        padding: "12px 18px",
        borderBottom: "1px solid #F0F2F7",
        alignItems: "center",
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
          {sub.title}
        </div>
        <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 2 }}>
          runs {sub.runs_count}
          {sub.last_invoice_id && (
            <>
              {" · "}
              <Link
                to={`/srs/finance/invoices/${sub.last_invoice_id}`}
                style={{ color: "#0A1628", textDecoration: "underline", textDecorationStyle: "dotted", fontWeight: 800 }}
              >
                last invoice ↗
              </Link>
            </>
          )}
        </div>
      </div>
      <div
        style={{
          fontFamily: JAKARTA,
          fontSize: 13,
          color: "#3D4A66",
          fontWeight: 500,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {orgById.get(sub.organization_id)?.legal_name || sub.organization_id.slice(-6)}
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: JAKARTA,
            fontSize: 14,
            color: "#0A1628",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.1,
          }}
        >
          {sub.amount.toFixed(2)}
        </div>
        <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em" }}>
          {sub.currency}
          {sub.tax_rate_pct > 0 && ` +${sub.tax_rate_pct}%`}
        </div>
      </div>
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em" }}>
        {sub.cadence}
      </div>
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em" }}>
        {new Date(sub.next_run).toISOString().slice(0, 10)}
      </div>
      <div style={{ textAlign: "right" }}>
        <StatusPillDot map={SUB_STATUS} status={sub.status} />
      </div>
      <div style={{ textAlign: "right" }}>
        {isSrsAdmin && <SubActions sub={sub} reload={reload} />}
      </div>
    </div>
  );
}

function SubActions({ sub, reload }) {
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  async function run(path) {
    setBusy(true);
    try {
      await api.post(path, {});
      reload();
    } catch (e) {
      alert(e.message || "error");
    } finally {
      setBusy(false);
    }
  }

  if (sub.status === "cancelled") {
    return <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em" }}>—</span>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
      {sub.status === "active" && (
        <>
          <IconBtn label="run" title="Run now" onClick={() => run(`/subscriptions/${sub.id}/run-now`)} disabled={busy} tone="primary" />
          <IconBtn label="||" title="Pausar" onClick={() => run(`/subscriptions/${sub.id}/pause`)} disabled={busy} />
        </>
      )}
      {sub.status === "paused" && (
        <IconBtn label="▶" title="Resume" onClick={() => run(`/subscriptions/${sub.id}/resume`)} disabled={busy} tone="success" />
      )}
      <IconBtn label="×" title="Cancel" onClick={() => setCancelOpen(true)} disabled={busy} tone="danger" />
      <ActionDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Cancelar subscription · ${sub.title}`}
        subtitle="Terminal. Para re-crear hay que hacer una nueva."
        submitLabel="Cancel subscription"
        destructive
        submitDisabled={!cancelReason.trim()}
        onSubmit={async () => {
          await api.post(`/subscriptions/${sub.id}/cancel`, { reason: cancelReason.trim() });
          setCancelOpen(false);
          setCancelReason("");
          reload();
        }}
      >
        <div>
          <DialogLabel htmlFor="sc-reason">Razón</DialogLabel>
          <DialogTextarea
            id="sc-reason"
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Cliente cambió plan · scope reducido · fin contrato…"
            required
          />
        </div>
      </ActionDialog>
    </div>
  );
}

function IconBtn({ label, title, onClick, disabled, tone = "default" }) {
  const colors = {
    default: { color: "#3D4A66", border: "#C8CDD8", hoverBg: "#0A1628", hoverColor: "#FFFFFF", hoverBorder: "#0A1628" },
    primary: { color: "#0A1628", border: "#0A1628", hoverBg: "#0A1628", hoverColor: "#FFFFFF", hoverBorder: "#0A1628" },
    success: { color: "#0A6131", border: "#16A34A", hoverBg: "#16A34A", hoverColor: "#FFFFFF", hoverBorder: "#16A34A" },
    danger:  { color: "#991B1B", border: "#FCA5A5", hoverBg: "#DC2626", hoverColor: "#FFFFFF", hoverBorder: "#DC2626" },
  };
  const c = colors[tone] || colors.default;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...MONO_CAPS,
        fontSize: 9.5,
        letterSpacing: "0.14em",
        padding: "4px 8px",
        background: "#FFFFFF",
        color: c.color,
        border: `1px solid ${c.border}`,
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 160ms",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = c.hoverBg;
        e.currentTarget.style.color = c.hoverColor;
        e.currentTarget.style.borderColor = c.hoverBorder;
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = "#FFFFFF";
        e.currentTarget.style.color = c.color;
        e.currentTarget.style.borderColor = c.border;
      }}
    >
      {label}
    </button>
  );
}

/* ─── Vendor payables tab (X-d AP) ─────────────────────────────── */

function VendorPayablesTab({ orgById, isSrsAdmin }) {
  const [statusFilter, setStatusFilter] = useState("");
  const path = statusFilter
    ? `/vendor-invoices?status_filter=${statusFilter}&limit=200`
    : "/vendor-invoices?limit=200";
  const { data: vendorInvoices, loading, reload } = useFetch(path, { deps: [statusFilter] });
  const { data: aging } = useFetch("/vendor-invoices/aging/summary");

  const list = vendorInvoices || [];
  const counts = useMemo(() => {
    const c = { received: 0, matched: 0, approved: 0, paid: 0, disputed: 0, rejected: 0 };
    for (const v of list) c[v.status] = (c[v.status] || 0) + 1;
    return c;
  }, [list]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionCard>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <SectionTitle marginBottom={4}>Deudas con proveedores · AP</SectionTitle>
            <div style={{ fontFamily: JAKARTA, fontSize: 16, fontWeight: 700, color: "#0A1628" }}>
              {list.length}{" "}
              <span style={{ color: "#3D4A66", fontWeight: 500 }}>
                facturas · recibidas {counts.received} · approved {counts.approved}
                {counts.disputed ? ` · disputed ${counts.disputed}` : ""}
              </span>
            </div>
          </div>
          {isSrsAdmin && <CreateVendorInvoiceAction onCreated={() => reload()} />}
        </div>
        {aging && aging.buckets && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 10,
              marginTop: 8,
            }}
          >
            <KpiTile label="Current (0-30d)" value={aging.buckets.current.total.toFixed(2)} hint={`${aging.buckets.current.count} factura${aging.buckets.current.count === 1 ? "" : "s"}`} />
            <KpiTile label="30-60d" value={aging.buckets["30_60"].total.toFixed(2)} hint={`${aging.buckets["30_60"].count} factura${aging.buckets["30_60"].count === 1 ? "" : "s"}`} tone="warning" />
            <KpiTile label="60-90d" value={aging.buckets["60_90"].total.toFixed(2)} hint={`${aging.buckets["60_90"].count} factura${aging.buckets["60_90"].count === 1 ? "" : "s"}`} tone="warning" />
            <KpiTile label="90d+" value={aging.buckets.over_90.total.toFixed(2)} hint={`${aging.buckets.over_90.count} factura${aging.buckets.over_90.count === 1 ? "" : "s"}`} tone="danger" />
          </div>
        )}
      </SectionCard>

      <SectionCard padding={0}>
        <header
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid #E2E5EC",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <label htmlFor="vi-status" style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em" }}>
            Status
          </label>
          <select
            id="vi-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="">todos</option>
            <option value="received">received</option>
            <option value="matched">matched</option>
            <option value="approved">approved</option>
            <option value="paid">paid</option>
            <option value="disputed">disputed</option>
            <option value="rejected">rejected</option>
          </select>
          <div
            style={{
              marginLeft: "auto",
              ...MONO_CAPS,
              fontSize: 11,
              color: "#0A1628",
              letterSpacing: "0.14em",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 800,
            }}
          >
            {list.length}
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 3fr 2fr 2fr 1fr 1fr",
            gap: 10,
            padding: "10px 18px",
            background: "#F4F6F8",
            borderBottom: "1px solid #E2E5EC",
            ...MONO_CAPS,
            fontSize: 9.5,
            color: "#3D4A66",
            letterSpacing: "0.14em",
          }}
        >
          <div>Vendor invoice #</div>
          <div>Vendor</div>
          <div>Received</div>
          <div style={{ textAlign: "right" }}>Total</div>
          <div style={{ textAlign: "right" }}>Match</div>
          <div style={{ textAlign: "right" }}>Status</div>
        </div>

        <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
          {loading && <Empty text="cargando…" />}
          {!loading && list.length === 0 && (
            <Empty text="— sin vendor invoices · registra la primera —" />
          )}
          {list.map((v) => <VendorInvoiceRow key={v.id} vi={v} orgById={orgById} />)}
        </div>
      </SectionCard>

      <p style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
        X-d · AP con three-way match · paid tracking · aging
      </p>
    </div>
  );
}

function VendorInvoiceRow({ vi, orgById }) {
  const match = vi.match_report;
  const matchLabel = match
    ? match.result === "match"
      ? { color: "#0A6131", l: "MATCH" }
      : match.result === "partial_match"
      ? { color: "#7E5212", l: "PARTIAL" }
      : match.result === "mismatch"
      ? { color: "#991B1B", l: "MISMATCH" }
      : { color: "#8B95A8", l: "NO PO" }
    : null;

  return (
    <Link
      to={`/srs/finance/vendor-invoices/${vi.id}`}
      style={tableRowStyle("3fr 3fr 2fr 2fr 1fr 1fr")}
      onMouseEnter={hoverRow}
      onMouseLeave={leaveRow}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 13,
            fontWeight: 600,
            color: "#0A1628",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {vi.vendor_invoice_number}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: "#8B95A8", marginTop: 1, fontWeight: 500 }}>
          {(vi.linked_work_order_ids || []).length} WOs ·{" "}
          {(vi.linked_budget_approval_ids || []).length} POs
        </div>
      </div>
      <div
        style={{
          fontFamily: JAKARTA,
          fontSize: 13,
          color: "#3D4A66",
          fontWeight: 500,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {orgById.get(vi.vendor_organization_id)?.legal_name || vi.vendor_organization_id.slice(-6)}
      </div>
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em" }}>
        {vi.received_at ? formatAge(vi.received_at) + " ago" : "—"}
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: JAKARTA,
            fontSize: 14,
            color: "#7E5212",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.1,
          }}
        >
          {vi.total.toFixed(2)}
        </div>
        <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em" }}>
          {vi.currency}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        {matchLabel ? (
          <span style={{ ...MONO_CAPS, fontSize: 9.5, color: matchLabel.color, letterSpacing: "0.12em", fontWeight: 800 }}>
            {matchLabel.l}
          </span>
        ) : (
          <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em" }}>—</span>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <StatusPillDot map={VI_STATUS} status={vi.status} />
      </div>
    </Link>
  );
}

/* ─── Helpers + shared styles ─────────────────────────────────── */

const selectStyle = {
  height: 30,
  border: "1px solid #C8CDD8",
  borderRadius: 6,
  padding: "0 10px",
  fontFamily: JAKARTA,
  fontSize: 12.5,
  fontWeight: 500,
  color: "#0A1628",
  background: "#FFFFFF",
  outline: "none",
  cursor: "pointer",
};

function tableRowStyle(cols) {
  return {
    display: "grid",
    gridTemplateColumns: cols,
    gap: 12,
    padding: "12px 18px",
    borderBottom: "1px solid #F0F2F7",
    alignItems: "center",
    textDecoration: "none",
    transition: "background 160ms",
  };
}

function hoverRow(e) {
  e.currentTarget.style.background = "#F7F8FA";
}

function leaveRow(e) {
  e.currentTarget.style.background = "transparent";
}

function Empty({ text }) {
  return (
    <div style={{ padding: "24px 18px", ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
      {text}
    </div>
  );
}
