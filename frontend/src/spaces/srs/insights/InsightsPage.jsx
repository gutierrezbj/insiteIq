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
import { useFetch } from "../../../lib/useFetch";
import KpiTile from "../../../components/v2-shared/KpiTile";
import SectionCard, { SectionTitle } from "../../../components/v2-shared/SectionCard";
import { JAKARTA, MONO_CAPS } from "../../../components/v2-shared/typography";

const MONO = "'JetBrains Mono', monospace";

export default function InsightsPage() {
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
            Insights · Y-b · AI learning engine
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
            Panorama SRS-wide · <span style={{ color: "#3D4A66", fontWeight: 600 }}>últimos {windowDays}d</span>
          </h1>
          <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", marginTop: 6, fontWeight: 500 }}>
            Sin LLM · agregaciones sobre data viva · señales de anomalía expuestas. El sistema aprende de sí mismo.
          </p>
        </div>
        <div>
          <label
            htmlFor="iw"
            style={{ ...MONO_CAPS, display: "block", fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}
          >
            Window
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
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <OverviewSection overview={data.overview} />
          <ClientsSection clients={data.clients_top} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
            <RepeatSitesSection sites={data.repeat_sites_30d} />
            <TechDriftSection techs={data.tech_drift} />
          </div>
          <FinanceSnapshot snapshot={data.finance_snapshot} />
          <p style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em", paddingTop: 4 }}>
            Y-b · compute on-demand · Y-c LLM enrichment · Y-d Pain Log auto-detect
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Overview ─────────────────────────────────────────────────── */

function OverviewSection({ overview: o }) {
  if (!o) return null;
  const warnSla = o.sla_compliance_pct != null && o.sla_compliance_pct < 80;
  return (
    <SectionCard>
      <SectionTitle>Overview</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <KpiTile label="Total WOs" value={o.wo_total} tone="primary" />
        <KpiTile
          label="SLA compliance"
          value={o.sla_compliance_pct != null ? `${o.sla_compliance_pct}%` : "—"}
          hint={`${o.sla_compliant}/${o.sla_applicable} closed on-time`}
          tone={warnSla ? "danger" : "success"}
        />
        <KpiTile
          label="After-hours"
          value={`${o.after_hours_pct}%`}
          hint="nights/weekends"
          tone={o.after_hours_pct >= 30 ? "warning" : "default"}
        />
        <KpiTile
          label="Avg resolve"
          value={o.avg_resolution_minutes != null ? formatMin(o.avg_resolution_minutes) : "—"}
          hint={
            o.median_resolution_minutes != null
              ? `median ${formatMin(o.median_resolution_minutes)}`
              : null
          }
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
        <CountBreakdown label="Por status" data={o.wo_by_status} />
        <CountBreakdown label="Por severity" data={o.wo_by_severity} />
        <CountBreakdown label="Por shield" data={o.wo_by_shield} />
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
  if (!clients || clients.length === 0) return null;
  return (
    <SectionCard padding={0}>
      <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
        <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 2 }}>
          Clientes · top por volumen
        </div>
        <div style={{ fontFamily: JAKARTA, fontSize: 16, fontWeight: 700, color: "#0A1628" }}>
          {clients.length} <span style={{ color: "#3D4A66", fontWeight: 500 }}>clientes activos en el período</span>
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
        <div>Cliente</div>
        <div style={{ textAlign: "right" }}>WOs</div>
        <div style={{ textAlign: "right" }}>Avg resolve</div>
        <div style={{ textAlign: "right" }}>SLA</div>
        <div style={{ textAlign: "right" }}>After-hours</div>
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
                  {c.closed_count} closed
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
  if (!sites) return null;
  return (
    <SectionCard padding={0}>
      <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
        <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 2 }}>
          Sites · repeat 30d
        </div>
        <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
          Posible root-cause sin resolver
        </div>
      </header>
      <div>
        {sites.length === 0 && <Empty text="— sin repeats significativos —" />}
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
                  {s.anomaly ? "· anomaly" : "WOs/30d"}
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
  if (!techs) return null;
  return (
    <SectionCard padding={0}>
      <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
        <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 2 }}>
          Tech rating · drift detection
        </div>
        <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
          Últimos 3 ratings vs lifetime
        </div>
      </header>
      <div>
        {techs.length === 0 && <Empty text="— sin ratings —" />}
        {techs.map((t) => (
          <Link
            key={t.tech_user_id}
            to={`/srs/techs/${t.tech_user_id}`}
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
                  {t.full_name || t.tech_user_id.slice(-6)}
                </div>
                <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 2 }}>
                  {t.employment_type || "—"} · {t.wo_count} WOs · {t.lifetime_rating_count} ratings
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
                    {t.last3_avg ?? "—"}
                  </span>
                  {t.lifetime_avg != null && (
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 10,
                        color: "#8B95A8",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      / {t.lifetime_avg}
                    </span>
                  )}
                </div>
                {t.drift != null && (
                  <div
                    style={{
                      ...MONO_CAPS,
                      fontSize: 9,
                      letterSpacing: "0.14em",
                      marginTop: 2,
                      color: t.drift_warning ? "#991B1B" : t.drift > 0 ? "#0A6131" : "#8B95A8",
                    }}
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
    </SectionCard>
  );
}

/* ─── Finance snapshot ─────────────────────────────────────────── */

function FinanceSnapshot({ snapshot }) {
  if (!snapshot) return null;
  return (
    <SectionCard>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
            Finance snapshot
          </div>
          <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
            Estado actual AR + AP
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
          Finance tab →
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
        <KpiTile label="AR pending" value={snapshot.pending_ar_invoices} hint="draft+sent" />
        <KpiTile
          label="AR overdue"
          value={snapshot.overdue_ar_invoices}
          hint="past due_date"
          tone={snapshot.overdue_ar_invoices > 0 ? "danger" : "default"}
        />
        <KpiTile
          label="AP pending"
          value={snapshot.pending_ap_invoices}
          hint="unpaid vendor invoices"
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
