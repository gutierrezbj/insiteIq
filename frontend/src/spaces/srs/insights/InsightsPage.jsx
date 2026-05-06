/**
 * SRS Insights · v2 paleta F (Iter 2.23).
 *
 * Migración v1 amber legacy → v2 usando v2-shared. Pasito Y-b · AI Learning
 * Engine Fase 1. Panorama SRS-wide · 90d default · agregaciones on-demand,
 * sin LLM.
 *
 * Endpoint: GET /api/insights/dashboard?window_days={n}
 *   → { window_days, as_of, overview, clients_top, repeat_sites_30d,
 *       tech_drift, finance_snapshot }
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFetch } from "../../../lib/useFetch";
import KpiTile from "../../../components/v2-shared/KpiTile";
import SectionCard, { SectionTitle } from "../../../components/v2-shared/SectionCard";
import { JAKARTA, MONO_CAPS } from "../../../components/v2-shared/typography";

const MONO = "'JetBrains Mono', monospace";

export default function InsightsPage() {
  const { t } = useTranslation("common");
  const [windowDays, setWindowDays] = useState(90);
  const { data, loading, error } = useFetch(
    `/insights/dashboard?window_days=${windowDays}`,
    { deps: [windowDays] }
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      {/* Header */}
      <div
        style={{
          paddingLeft: 16,
          borderLeft: "3px solid #0A1628",
          marginBottom: 22,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ ...MONO_CAPS, fontSize: 11, color: "#8B95A8", marginBottom: 6 }}>
            {t("page_insights.kicker")}
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
            {t("page_insights.title_prefix")} <span style={{ color: "#3D4A66", fontWeight: 600 }}>{t("page_insights.title_window_label", { days: windowDays })}</span>
          </h1>
          <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", marginTop: 6, fontWeight: 500 }}>
            {t("page_insights.subtitle")}
          </p>
        </div>
        <div>
          <label
            htmlFor="iw"
            style={{ ...MONO_CAPS, display: "block", fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}
          >
            {t("page_insights.label_window")}
          </label>
          <select
            id="iw"
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            style={{
              height: 32,
              border: "1px solid #C8CDD8",
              borderRadius: 6,
              padding: "0 10px",
              fontFamily: JAKARTA,
              fontSize: 13,
              fontWeight: 500,
              color: "#0A1628",
              background: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value={30}>{t("page_insights.window_30d")}</option>
            <option value={60}>{t("page_insights.window_60d")}</option>
            <option value={90}>{t("page_insights.window_90d")}</option>
            <option value={180}>{t("page_insights.window_180d")}</option>
            <option value={365}>{t("page_insights.window_1y")}</option>
          </select>
        </div>
      </div>

      {loading && <Empty text={t("page_insights.computing")} />}
      {error && <Empty text={`error · ${error.message}`} />}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <OverviewSection overview={data.overview} />
          <ClientsSection clients={data.clients_top} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
            <RepeatSitesSection sites={data.repeat_sites_30d} />
            <TechDriftSection techs={data.tech_drift} />
          </div>
          <FinanceSnapshot snapshot={data.finance_snapshot} />
          <p style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em", paddingTop: 4 }}>
            {t("page_insights.footer_iter")}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Overview ─────────────────────────────────────────────────── */

function OverviewSection({ overview: o }) {
  const { t } = useTranslation("common");
  if (!o) return null;
  const warnSla = o.sla_compliance_pct != null && o.sla_compliance_pct < 80;
  return (
    <SectionCard>
      <SectionTitle>{t("page_insights.section_overview")}</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <KpiTile label={t("page_insights.kpi_total_wos")} value={o.wo_total} tone="primary" />
        <KpiTile
          label={t("page_insights.kpi_sla_compliance")}
          value={o.sla_compliance_pct != null ? `${o.sla_compliance_pct}%` : "—"}
          hint={t("page_insights.kpi_sla_hint", { compliant: o.sla_compliant, applicable: o.sla_applicable })}
          tone={warnSla ? "danger" : "success"}
        />
        <KpiTile
          label={t("page_insights.kpi_after_hours")}
          value={`${o.after_hours_pct}%`}
          hint={t("page_insights.kpi_after_hours_hint")}
          tone={o.after_hours_pct >= 30 ? "warning" : "default"}
        />
        <KpiTile
          label={t("page_insights.kpi_avg_resolve")}
          value={o.avg_resolution_minutes != null ? formatMin(o.avg_resolution_minutes) : "—"}
          hint={
            o.median_resolution_minutes != null
              ? t("page_insights.kpi_avg_resolve_hint", { value: formatMin(o.median_resolution_minutes) })
              : null
          }
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
        <CountBreakdown label={t("page_insights.breakdown_status")} data={o.wo_by_status} />
        <CountBreakdown label={t("page_insights.breakdown_severity")} data={o.wo_by_severity} />
        <CountBreakdown label={t("page_insights.breakdown_shield")} data={o.wo_by_shield} />
      </div>
    </SectionCard>
  );
}

function CountBreakdown({ label, data }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <div>
        <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>—</div>
      </div>
    );
  }
  const max = Math.max(...entries.map((e) => e[1]));
  return (
    <div>
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                ...MONO_CAPS,
                fontSize: 9.5,
                color: "#8B95A8",
                letterSpacing: "0.12em",
                width: 92,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {(k || "").replace("_", " ")}
            </span>
            <div style={{ flex: 1, height: 6, background: "#F0F2F7", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#0A1628", width: `${(v / max) * 100}%` }} />
            </div>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 13,
                fontWeight: 700,
                color: "#0A1628",
                fontVariantNumeric: "tabular-nums",
                width: 36,
                textAlign: "right",
              }}
            >
              {v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Clients top ──────────────────────────────────────────────── */

function ClientsSection({ clients }) {
  const { t } = useTranslation("common");
  if (!clients || clients.length === 0) return null;
  return (
    <SectionCard padding={0}>
      <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
        <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 2 }}>
          {t("page_insights.section_clients_kicker")}
        </div>
        <div style={{ fontFamily: JAKARTA, fontSize: 16, fontWeight: 700, color: "#0A1628" }}>
          {clients.length} <span style={{ color: "#3D4A66", fontWeight: 500 }}>{t("page_insights.section_clients_count_suffix")}</span>
        </div>
      </header>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "4fr 2fr 2fr 2fr 2fr",
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
        <div>{t("page_insights.col_client")}</div>
        <div style={{ textAlign: "right" }}>{t("page_insights.col_wos")}</div>
        <div style={{ textAlign: "right" }}>{t("page_insights.col_avg_resolve")}</div>
        <div style={{ textAlign: "right" }}>{t("page_insights.col_sla")}</div>
        <div style={{ textAlign: "right" }}>{t("page_insights.col_after_hours")}</div>
      </div>
      <div>
        {clients.map((c) => {
          const warnSla = c.sla_compliance_pct != null && c.sla_compliance_pct < 80;
          const warnAh = c.after_hours_pct >= 30;
          return (
            <div
              key={c.organization_id}
              style={{
                display: "grid",
                gridTemplateColumns: "4fr 2fr 2fr 2fr 2fr",
                gap: 12,
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
                  {c.organization_name}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: JAKARTA,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#0A1628",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.1,
                  }}
                >
                  {c.wo_count}
                </div>
                <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em" }}>
                  {t("page_insights.client_closed_count", { count: c.closed_count })}
                </div>
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
                {c.avg_resolution_minutes != null ? formatMin(c.avg_resolution_minutes) : "—"}
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontFamily: MONO,
                  fontSize: 13,
                  fontWeight: 700,
                  color: warnSla ? "#991B1B" : "#0A1628",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {c.sla_compliance_pct != null ? `${c.sla_compliance_pct}%` : "—"}
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontFamily: MONO,
                  fontSize: 13,
                  fontWeight: 700,
                  color: warnAh ? "#7E5212" : "#0A1628",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {c.after_hours_pct}%
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ─── Repeat sites (root cause signal) ─────────────────────────── */

function RepeatSitesSection({ sites }) {
  const { t } = useTranslation("common");
  if (!sites) return null;
  return (
    <SectionCard padding={0}>
      <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
        <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 2 }}>
          {t("page_insights.section_repeat_sites_kicker")}
        </div>
        <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
          {t("page_insights.section_repeat_sites_title")}
        </div>
      </header>
      <div>
        {sites.length === 0 && <Empty text={t("page_insights.empty_no_repeats")} />}
        {sites.map((s) => (
          <Link
            key={s.site_id}
            to={`/srs/sites/${s.site_id}`}
            style={{
              display: "block",
              padding: "12px 18px",
              borderBottom: "1px solid #F0F2F7",
              textDecoration: "none",
              transition: "background 160ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FA")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
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
                  {s.site_name || s.site_id.slice(-6)}
                </div>
                <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 2 }}>
                  {s.country || "—"}
                  {s.city && ` · ${s.city}`}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                  style={{
                    fontFamily: JAKARTA,
                    fontSize: 20,
                    fontWeight: 800,
                    color: s.anomaly ? "#7E5212" : "#0A1628",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {s.wo_count_30d}
                </div>
                <div
                  style={{
                    ...MONO_CAPS,
                    fontSize: 9,
                    color: s.anomaly ? "#7E5212" : "#8B95A8",
                    letterSpacing: "0.12em",
                    marginTop: 2,
                  }}
                >
                  {s.anomaly ? t("page_insights.anomaly_label") : t("page_insights.wos_per_30d")}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

/* ─── Tech drift ───────────────────────────────────────────────── */

function TechDriftSection({ techs }) {
  const { t } = useTranslation("common");
  if (!techs) return null;
  return (
    <SectionCard padding={0}>
      <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
        <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 2 }}>
          {t("page_insights.section_tech_drift_kicker")}
        </div>
        <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
          {t("page_insights.section_tech_drift_title")}
        </div>
      </header>
      <div>
        {techs.length === 0 && <Empty text={t("page_insights.empty_no_ratings")} />}
        {techs.map((tech) => (
          <Link
            key={tech.tech_user_id}
            to={`/srs/techs/${tech.tech_user_id}`}
            style={{
              display: "block",
              padding: "12px 18px",
              borderBottom: "1px solid #F0F2F7",
              textDecoration: "none",
              transition: "background 160ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FA")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
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
                  {tech.full_name || tech.tech_user_id.slice(-6)}
                </div>
                <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 2 }}>
                  {t("page_insights.tech_meta", { employment: tech.employment_type || "—", wos: tech.wo_count, ratings: tech.lifetime_rating_count })}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "flex-end" }}>
                  <span
                    style={{
                      fontFamily: JAKARTA,
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#0A1628",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {tech.last3_avg ?? "—"}
                  </span>
                  {tech.lifetime_avg != null && (
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 10,
                        color: "#8B95A8",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      / {tech.lifetime_avg}
                    </span>
                  )}
                </div>
                {tech.drift != null && (
                  <div
                    style={{
                      ...MONO_CAPS,
                      fontSize: 9,
                      letterSpacing: "0.14em",
                      marginTop: 2,
                      color: tech.drift_warning ? "#991B1B" : tech.drift > 0 ? "#0A6131" : "#8B95A8",
                    }}
                  >
                    {tech.drift >= 0 ? "+" : ""}
                    {tech.drift}
                    {tech.drift_warning && " ⚠"}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

/* ─── Finance snapshot ─────────────────────────────────────────── */

function FinanceSnapshot({ snapshot }) {
  const { t } = useTranslation("common");
  if (!snapshot) return null;
  return (
    <SectionCard>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
            {t("page_insights.section_finance_kicker")}
          </div>
          <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
            {t("page_insights.section_finance_title")}
          </div>
        </div>
        <Link
          to="/srs/finance"
          style={{
            ...MONO_CAPS,
            fontSize: 10,
            color: "#0A1628",
            letterSpacing: "0.14em",
            textDecoration: "underline",
            textDecorationStyle: "dotted",
            alignSelf: "flex-end",
            fontWeight: 800,
          }}
        >
          {t("page_insights.finance_link")}
        </Link>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginTop: 14,
        }}
      >
        <KpiTile label={t("page_insights.kpi_ar_pending")} value={snapshot.pending_ar_invoices} hint={t("page_insights.kpi_ar_pending_hint")} />
        <KpiTile
          label={t("page_insights.kpi_ar_overdue")}
          value={snapshot.overdue_ar_invoices}
          hint={t("page_insights.kpi_ar_overdue_hint")}
          tone={snapshot.overdue_ar_invoices > 0 ? "danger" : "default"}
        />
        <KpiTile
          label={t("page_insights.kpi_ap_pending")}
          value={snapshot.pending_ap_invoices}
          hint={t("page_insights.kpi_ap_pending_hint")}
          tone={snapshot.pending_ap_invoices > 0 ? "warning" : "default"}
        />
      </div>
    </SectionCard>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────── */

function Empty({ text }) {
  return (
    <div
      style={{
        padding: "20px 18px",
        ...MONO_CAPS,
        fontSize: 10,
        color: "#8B95A8",
        letterSpacing: "0.14em",
        textAlign: "center",
      }}
    >
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
