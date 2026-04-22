/**
 * SRS Insights · Pasito Y-b · AI Learning Engine Fase 1.
 * Panorama SRS-wide · 90d default · patterns + señales de anomalia.
 * Sin LLM, pure aggregations on-demand.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";

export default function InsightsPage() {
  const [windowDays, setWindowDays] = useState(90);
  const { data, loading, error } = useFetch(
    `/insights/dashboard?window_days=${windowDays}`,
    { deps: [windowDays] }
  );

  return (
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide">
      <div className="accent-bar pl-4 mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="label-caps">Insights · Y-b · AI learning engine</div>
          <h1 className="font-display text-2xl text-text-primary leading-tight">
            Panorama SRS-wide · últimos {windowDays}d
          </h1>
          <p className="font-body text-text-secondary text-sm mt-1">
            Sin LLM · agregaciones sobre data viva · señales de anomalia
            expuestas. El sistema aprende de si mismo.
          </p>
        </div>
        <div>
          <label htmlFor="iw" className="label-caps block mb-1">
            Window
          </label>
          <select
            id="iw"
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="bg-surface-overlay border border-surface-border rounded-sm px-3 py-1.5 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast"
          >
            <option value={30}>30d</option>
            <option value={60}>60d</option>
            <option value={90}>90d</option>
            <option value={180}>180d</option>
            <option value={365}>1 año</option>
          </select>
        </div>
      </div>

      {loading && <Empty text="computando…" />}
      {error && <Empty text={`error · ${error.message}`} />}

      {data && (
        <div className="space-y-4">
          <OverviewSection overview={data.overview} />
          <ClientsSection clients={data.clients_top} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RepeatSitesSection sites={data.repeat_sites_30d} />
            <TechDriftSection techs={data.tech_drift} />
          </div>
          <FinanceSnapshot snapshot={data.finance_snapshot} />
          <p className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary pt-2">
            Y-b · compute on-demand · Y-c LLM enrichment · Y-d Pain Log
            auto-detect
          </p>
        </div>
      )}
    </div>
  );
}

// -------------------- Overview --------------------

function OverviewSection({ overview: o }) {
  if (!o) return null;
  const warnSla = o.sla_compliance_pct != null && o.sla_compliance_pct < 80;
  return (
    <section className="bg-surface-raised accent-bar rounded-sm p-4">
      <div className="label-caps mb-3">Overview</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Kpi label="Total WOs" value={o.wo_total} />
        <Kpi
          label="SLA compliance"
          value={
            o.sla_compliance_pct != null ? `${o.sla_compliance_pct}%` : "—"
          }
          hint={`${o.sla_compliant}/${o.sla_applicable} closed on-time`}
          tone={warnSla ? "danger" : "success"}
        />
        <Kpi
          label="After-hours"
          value={`${o.after_hours_pct}%`}
          hint="nights/weekends"
          tone={o.after_hours_pct >= 30 ? "warning" : "default"}
        />
        <Kpi
          label="Avg resolve"
          value={o.avg_resolution_minutes != null ? formatMin(o.avg_resolution_minutes) : "—"}
          hint={
            o.median_resolution_minutes != null
              ? `median ${formatMin(o.median_resolution_minutes)}`
              : null
          }
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CountBreakdown label="Por status" data={o.wo_by_status} />
        <CountBreakdown label="Por severity" data={o.wo_by_severity} />
        <CountBreakdown label="Por shield" data={o.wo_by_shield} />
      </div>
    </section>
  );
}

function CountBreakdown({ label, data }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <div>
        <div className="label-caps mb-1.5">{label}</div>
        <div className="font-body text-sm text-text-tertiary">—</div>
      </div>
    );
  }
  const max = Math.max(...entries.map((e) => e[1]));
  return (
    <div>
      <div className="label-caps mb-1.5">{label}</div>
      <div className="space-y-1">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary w-24 truncate">
              {k}
            </span>
            <div className="flex-1 h-1.5 bg-surface-base rounded-sm overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${(v / max) * 100}%` }}
              />
            </div>
            <span className="font-mono text-sm text-text-primary w-8 text-right">
              {v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------- Clients top --------------------

function ClientsSection({ clients }) {
  if (!clients || clients.length === 0) return null;
  return (
    <section className="bg-surface-raised accent-bar rounded-sm">
      <header className="px-4 py-3 border-b border-surface-border">
        <div className="label-caps">Clientes · top por volumen</div>
        <h2 className="font-display text-base text-text-primary">
          {clients.length} clientes activos en el periodo
        </h2>
      </header>
      <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-surface-border text-text-tertiary">
        <div className="col-span-4 label-caps">Cliente</div>
        <div className="col-span-2 label-caps text-right">WOs</div>
        <div className="col-span-2 label-caps text-right">Avg resolve</div>
        <div className="col-span-2 label-caps text-right">SLA</div>
        <div className="col-span-2 label-caps text-right">After-hours</div>
      </div>
      <div className="divide-y divide-surface-border">
        {clients.map((c) => {
          const warnSla = c.sla_compliance_pct != null && c.sla_compliance_pct < 80;
          const warnAh = c.after_hours_pct >= 30;
          return (
            <div
              key={c.organization_id}
              className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center"
            >
              <div className="col-span-4 min-w-0">
                <div className="font-body text-sm text-text-primary truncate">
                  {c.organization_name}
                </div>
              </div>
              <div className="col-span-2 text-right">
                <div className="font-display text-base text-text-primary">
                  {c.wo_count}
                </div>
                <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                  {c.closed_count} closed
                </div>
              </div>
              <div className="col-span-2 text-right font-mono text-sm text-text-primary">
                {c.avg_resolution_minutes != null
                  ? formatMin(c.avg_resolution_minutes)
                  : "—"}
              </div>
              <div className={`col-span-2 text-right font-mono text-sm ${warnSla ? "text-danger" : "text-text-primary"}`}>
                {c.sla_compliance_pct != null ? `${c.sla_compliance_pct}%` : "—"}
              </div>
              <div className={`col-span-2 text-right font-mono text-sm ${warnAh ? "text-warning" : "text-text-primary"}`}>
                {c.after_hours_pct}%
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// -------------------- Repeat sites (root cause signal) --------------------

function RepeatSitesSection({ sites }) {
  if (!sites) return null;
  return (
    <section className="bg-surface-raised accent-bar rounded-sm">
      <header className="px-4 py-3 border-b border-surface-border">
        <div className="label-caps">Sites · repeat 30d</div>
        <h2 className="font-display text-base text-text-primary">
          Posible root-cause sin resolver
        </h2>
      </header>
      <div className="divide-y divide-surface-border">
        {sites.length === 0 && (
          <Empty text="— sin repeats significativos —" />
        )}
        {sites.map((s) => (
          <Link
            key={s.site_id}
            to={`/srs/sites/${s.site_id}`}
            className="block px-4 py-2.5 hover:bg-surface-overlay/60 transition-colors duration-fast"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-body text-sm text-text-primary truncate">
                  {s.site_name || s.site_id.slice(-6)}
                </div>
                <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                  {s.country || "—"}
                  {s.city && ` · ${s.city}`}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div
                  className={`font-display text-xl leading-none ${
                    s.anomaly ? "text-warning" : "text-text-primary"
                  }`}
                >
                  {s.wo_count_30d}
                </div>
                <div
                  className={`font-mono text-2xs uppercase tracking-widest-srs ${
                    s.anomaly ? "text-warning" : "text-text-tertiary"
                  }`}
                >
                  {s.anomaly ? "· anomaly" : "WOs/30d"}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// -------------------- Tech drift --------------------

function TechDriftSection({ techs }) {
  if (!techs) return null;
  return (
    <section className="bg-surface-raised accent-bar rounded-sm">
      <header className="px-4 py-3 border-b border-surface-border">
        <div className="label-caps">Tech rating · drift detection</div>
        <h2 className="font-display text-base text-text-primary">
          Últimos 3 ratings vs lifetime
        </h2>
      </header>
      <div className="divide-y divide-surface-border">
        {techs.length === 0 && <Empty text="— sin ratings —" />}
        {techs.map((t) => (
          <Link
            key={t.tech_user_id}
            to={`/srs/techs/${t.tech_user_id}`}
            className="block px-4 py-2.5 hover:bg-surface-overlay/60 transition-colors duration-fast"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-body text-sm text-text-primary truncate">
                  {t.full_name || t.tech_user_id.slice(-6)}
                </div>
                <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                  {t.employment_type || "—"} · {t.wo_count} WOs · {t.lifetime_rating_count} ratings
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-base text-text-primary">
                    {t.last3_avg ?? "—"}
                  </span>
                  {t.lifetime_avg != null && (
                    <span className="font-mono text-2xs text-text-tertiary">
                      / {t.lifetime_avg}
                    </span>
                  )}
                </div>
                {t.drift != null && (
                  <div
                    className={`font-mono text-2xs uppercase tracking-widest-srs ${
                      t.drift_warning
                        ? "text-danger"
                        : t.drift > 0
                        ? "text-success"
                        : "text-text-tertiary"
                    }`}
                  >
                    {t.drift >= 0 ? "+" : ""}
                    {t.drift}
                    {t.drift_warning && " ⚠"}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// -------------------- Finance snapshot --------------------

function FinanceSnapshot({ snapshot }) {
  if (!snapshot) return null;
  return (
    <section className="bg-surface-raised accent-bar rounded-sm p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="label-caps">Finance snapshot</div>
          <h2 className="font-display text-base text-text-primary">
            Estado actual AR + AP
          </h2>
        </div>
        <Link
          to="/srs/finance"
          className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light hover:text-primary self-end"
        >
          Finance tab →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <Kpi label="AR pending" value={snapshot.pending_ar_invoices} hint="draft+sent" />
        <Kpi
          label="AR overdue"
          value={snapshot.overdue_ar_invoices}
          hint="past due_date"
          tone={snapshot.overdue_ar_invoices > 0 ? "danger" : "default"}
        />
        <Kpi
          label="AP pending"
          value={snapshot.pending_ap_invoices}
          hint="unpaid vendor invoices"
          tone={snapshot.pending_ap_invoices > 0 ? "warning" : "default"}
        />
      </div>
    </section>
  );
}

// -------------------- Blocks --------------------

function Kpi({ label, value, hint, tone = "default" }) {
  const tint =
    tone === "danger"
      ? "text-danger"
      : tone === "warning"
      ? "text-warning"
      : tone === "success"
      ? "text-success"
      : "text-text-primary";
  return (
    <div className="bg-surface-base rounded-sm p-3">
      <div className="label-caps mb-0.5">{label}</div>
      <div className={`font-display text-2xl leading-none ${tint}`}>
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
    <div className="px-4 py-6 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary text-center">
      {text}
    </div>
  );
}

function formatMin(m) {
  if (m == null) return "—";
  if (m < 60) return `${Math.round(m)}m`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}
