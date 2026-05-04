/**
 * SRS Projects · detail page (Iter 2.21 · paleta F NAVEGANTE).
 *
 * Migración v1 amber legacy → v2 inline paleta F. Self-contained:
 * NO usa Badges/KpiCard/BackLink shared (siguen tokens v1) hasta que el
 * paquete shared se migre. EquipmentSection se preserva tal cual (es
 * complejo, sprint propio).
 *
 * Estructura preservada del v1:
 *   - BackLink + header (type/pattern/code/status + h1 + description)
 *   - BUMM KPI strip (4 tiles: Progress / SLA / Throughput / Incidencias)
 *   - Grid 2 cols: izq Metadata+Delivery chain+Clusters · der WO buckets+WO list
 *   - EquipmentSection (Modo 2 reconciliation, preservado v1)
 *
 * Endpoints:
 *   GET /api/projects/{id}              → detail
 *   GET /api/projects/{id}/dashboard    → BUMM KPIs + buckets
 *   GET /api/projects/{id}/clusters     → cluster list
 *   GET /api/projects/{id}/work-orders  → WOs in project
 */
import { Link, useParams } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import { useAuth } from "../../../contexts/AuthContext";
import EquipmentSection from "../../../components/project/EquipmentSection";

const JAKARTA = "'Plus Jakarta Sans', sans-serif";
const MONO = "'JetBrains Mono', monospace";

const MONO_CAPS = {
  fontFamily: MONO,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

/* ─── Pills inline ─────────────────────────────────────────────── */

const PROJECT_STATUS_STYLES = {
  draft:     { bg: "#F0F2F7", border: "#C8CDD8", color: "#3D4A66" },
  active:    { bg: "#D9F1E5", border: "#16A34A", color: "#0A6131" },
  paused:    { bg: "#FCF1DC", border: "#E8A33D", color: "#7E5212" },
  completed: { bg: "#DBEAFE", border: "#2563EB", color: "#1E3A8A" },
  cancelled: { bg: "#FEE2E2", border: "#DC2626", color: "#7F1D1D" },
};

function ProjectStatusPill({ status }) {
  const s = PROJECT_STATUS_STYLES[status] || PROJECT_STATUS_STYLES.draft;
  return (
    <span
      style={{
        ...MONO_CAPS,
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        fontSize: 10,
        letterSpacing: "0.12em",
      }}
    >
      {status}
    </span>
  );
}

const WO_STATUS_STYLES = {
  intake:     { bg: "#F0F2F7", color: "#3D4A66" },
  triage:     { bg: "#DBEAFE", color: "#1E3A8A" },
  pre_flight: { bg: "#DBEAFE", color: "#1E3A8A" },
  dispatched: { bg: "#DBEAFE", color: "#1E40AF" },
  en_route:   { bg: "#E0E7FF", color: "#0A1628" },
  on_site:    { bg: "#E0E7FF", color: "#0A1628" },
  resolved:   { bg: "#D9F1E5", color: "#0A6131" },
  closed:     { bg: "#F0F2F7", color: "#8B95A8" },
  cancelled:  { bg: "#FEE2E2", color: "#7F1D1D" },
};

function WoStatusPill({ status }) {
  const s = WO_STATUS_STYLES[status] || WO_STATUS_STYLES.intake;
  return (
    <span
      style={{
        ...MONO_CAPS,
        display: "inline-block",
        padding: "2px 7px",
        borderRadius: 3,
        background: s.bg,
        color: s.color,
        fontSize: 9.5,
        letterSpacing: "0.12em",
      }}
    >
      {(status || "").replace("_", " ")}
    </span>
  );
}

const SEVERITY_STYLES = {
  low:      { color: "#3D4A66" },
  normal:   { color: "#3D4A66" },
  high:     { color: "#B45309" },
  critical: { color: "#DC2626" },
};

function SeverityPill({ severity }) {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.normal;
  return (
    <span
      style={{
        ...MONO_CAPS,
        fontSize: 9.5,
        color: s.color,
        letterSpacing: "0.12em",
      }}
    >
      {severity || "normal"}
    </span>
  );
}

const SHIELD_STYLES = {
  bronze:      { dot: "#A16207", label: "BRONZE" },
  bronze_plus: { dot: "#D97706", label: "BRONZE+" },
  silver:      { dot: "#94A3B8", label: "SILVER" },
  gold:        { dot: "#CA8A04", label: "GOLD" },
};

function ShieldPill({ level }) {
  const s = SHIELD_STYLES[level] || SHIELD_STYLES.bronze;
  return (
    <span style={{ ...MONO_CAPS, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 9.5, color: "#3D4A66" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  );
}

const BALL_STYLES = {
  srs:    { bg: "#E0E7FF", color: "#0A1628", label: "SRS" },
  tech:   { bg: "#DBEAFE", color: "#1E3A8A", label: "TECH" },
  client: { bg: "#FCF1DC", color: "#7E5212", label: "CLIENT" },
};

function BallPill({ side }) {
  const s = BALL_STYLES[side] || BALL_STYLES.srs;
  return (
    <span
      style={{
        ...MONO_CAPS,
        display: "inline-block",
        padding: "2px 7px",
        borderRadius: 3,
        background: s.bg,
        color: s.color,
        fontSize: 9.5,
        letterSpacing: "0.12em",
      }}
    >
      {s.label}
    </span>
  );
}

/* ─── KPI tile inline ──────────────────────────────────────────── */

const KPI_TONE_STYLES = {
  default: { bar: "#C8CDD8", value: "#0A1628" },
  primary: { bar: "#0A1628", value: "#0A1628" },
  success: { bar: "#16A34A", value: "#0A6131" },
  warning: { bar: "#E8A33D", value: "#7E5212" },
  danger:  { bar: "#DC2626", value: "#991B1B" },
};

function KpiTile({ label, value, hint, tone = "default" }) {
  const s = KPI_TONE_STYLES[tone] || KPI_TONE_STYLES.default;
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        borderLeft: `3px solid ${s.bar}`,
        borderRadius: 6,
        padding: "12px 16px",
      }}
    >
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em", marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 22,
          fontWeight: 700,
          color: s.value,
          letterSpacing: "-0.01em",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontFamily: JAKARTA, fontSize: 11, color: "#8B95A8", marginTop: 6, fontWeight: 500 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

/* ─── BackLink inline ──────────────────────────────────────────── */

function BackLink({ to, label }) {
  return (
    <Link
      to={to}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        background: "#FFFFFF",
        border: "1px solid #C8CDD8",
        borderRadius: 6,
        ...MONO_CAPS,
        fontSize: 10,
        color: "#3D4A66",
        textDecoration: "none",
        marginBottom: 18,
        transition: "all 160ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#0A1628";
        e.currentTarget.style.color = "#0A1628";
        e.currentTarget.style.background = "#F4F6F8";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#C8CDD8";
        e.currentTarget.style.color = "#3D4A66";
        e.currentTarget.style.background = "#FFFFFF";
      }}
    >
      <span style={{ color: "#0A1628", fontWeight: 800 }}>←</span>
      {label}
    </Link>
  );
}

/* ─── Section card wrapper ─────────────────────────────────────── */

const SECTION_STYLE = {
  background: "#FFFFFF",
  border: "1px solid #E2E5EC",
  borderLeft: "3px solid #0A1628",
  borderRadius: 6,
  padding: 18,
};

function SectionTitle({ children }) {
  return (
    <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 14 }}>
      {children}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */

export default function ProjectDetailPage() {
  const { project_id } = useParams();
  const { user } = useAuth();
  const isSrs = !!user?.memberships?.some((m) => m.space === "srs_coordinators");

  const { data: project, loading: pLoading } = useFetch(`/projects/${project_id}`, {
    deps: [project_id],
  });
  const { data: dashboard } = useFetch(`/projects/${project_id}/dashboard`, {
    deps: [project_id],
  });
  const { data: clusters } = useFetch(`/projects/${project_id}/clusters`, {
    deps: [project_id],
  });
  const { data: projectWos } = useFetch(
    `/projects/${project_id}/work-orders?limit=200`,
    { deps: [project_id] }
  );

  if (pLoading) return <CenteredMessage text="cargando…" />;
  if (!project) return <CenteredMessage text="— proyecto no encontrado —" />;

  const kpis = dashboard?.kpis || {};
  const buckets = dashboard?.work_orders || {};

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      <BackLink to="/srs/projects" label="Projects" />

      {/* Header */}
      <div
        style={{
          paddingLeft: 16,
          borderLeft: "3px solid #0A1628",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#0A1628", letterSpacing: "0.16em" }}>
            {project.type} · {project.delivery_pattern}
          </span>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.12em" }}>
            {project.code}
          </span>
          <ProjectStatusPill status={project.status} />
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
          {project.title}
        </h1>
        {project.description && (
          <p
            style={{
              fontFamily: JAKARTA,
              fontSize: 13.5,
              color: "#3D4A66",
              marginTop: 10,
              maxWidth: 920,
              lineHeight: 1.55,
              fontWeight: 500,
            }}
          >
            {project.description}
          </p>
        )}
      </div>

      {/* BUMM KPI strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <KpiTile
          label="Progress"
          value={`${kpis.progress_pct ?? 0}%`}
          hint={`${buckets.completed ?? 0} de ${project.total_sites_target ?? "—"}`}
          tone="primary"
        />
        <KpiTile
          label="SLA compliance"
          value={kpis.sla_compliance_pct != null ? `${kpis.sla_compliance_pct}%` : "—"}
          hint="closed within deadline"
          tone={kpis.sla_compliance_pct >= 90 ? "success" : "warning"}
        />
        <KpiTile
          label="Throughput 7d"
          value={kpis.throughput_week ?? 0}
          hint="WOs closed last week"
          tone="default"
        />
        <KpiTile
          label="Incidencias activas"
          value={kpis.incidents_active ?? 0}
          hint="high/critical abiertas"
          tone={(kpis.incidents_active ?? 0) > 0 ? "danger" : "default"}
        />
      </div>

      {/* Body grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)",
          gap: 16,
        }}
      >
        {/* Left col · Metadata + Delivery + Clusters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <section style={SECTION_STYLE}>
            <SectionTitle>Metadata</SectionTitle>
            <dl style={{ display: "flex", flexDirection: "column" }}>
              <MetaRow label="Client org" value={shortId(project.client_organization_id)} />
              <MetaRow label="End client" value={shortId(project.end_client_organization_id) || "—"} />
              <MetaRow label="Service agreement" value={shortId(project.service_agreement_id)} />
              <MetaRow label="PO number" value={project.po_number || "—"} />
              <MetaRow label="Playbook" value={project.playbook_template || "—"} />
              <MetaRow label="Cluster lead" value={shortId(project.cluster_lead_user_id) || "—"} />
              <MetaRow label="Field senior" value={shortId(project.field_senior_user_id) || "—"} />
              <MetaRow label="SRS coordinator" value={shortId(project.srs_coordinator_user_id) || "—"} />
              <MetaRow
                label="Target end"
                value={project.target_end_date ? new Date(project.target_end_date).toLocaleDateString() : "—"}
              />
              <MetaRow
                label="Actual end"
                value={project.actual_end_date ? new Date(project.actual_end_date).toLocaleDateString() : "—"}
              />
              <MetaRow label="Total sites target" value={project.total_sites_target ?? "—"} />
            </dl>
          </section>

          {project.delivery_chain?.length > 0 && (
            <section style={SECTION_STYLE}>
              <SectionTitle>Delivery chain</SectionTitle>
              <ol style={{ display: "flex", flexDirection: "column", gap: 6, listStyle: "none", padding: 0 }}>
                {project.delivery_chain.map((t, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontFamily: JAKARTA,
                      fontSize: 13,
                      color: "#0A1628",
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        textAlign: "center",
                        fontFamily: MONO,
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#8B95A8",
                      }}
                    >
                      {t.tier_index}
                    </span>
                    <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A1628", letterSpacing: "0.14em" }}>
                      {t.role}
                    </span>
                    <span
                      style={{
                        color: "#3D4A66",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontWeight: 500,
                      }}
                    >
                      {shortId(t.organization_id)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section style={SECTION_STYLE}>
            <SectionTitle>Cluster groups ({clusters?.length ?? 0})</SectionTitle>
            {(!clusters || clusters.length === 0) && (
              <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
                — sin clusters aún —
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {clusters?.map((c) => <ClusterRow key={c.id} c={c} />)}
            </div>
          </section>
        </div>

        {/* Right col · WO buckets + WOs list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <section style={SECTION_STYLE}>
            <SectionTitle>WO buckets por status</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
              {Object.entries(buckets.by_status || {}).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    background: "#F4F6F8",
                    border: "1px solid #E2E5EC",
                    borderRadius: 4,
                    padding: "8px 12px",
                  }}
                >
                  <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em" }}>
                    {(k || "").replace("_", " ")}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#0A1628",
                      fontVariantNumeric: "tabular-nums",
                      marginTop: 2,
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
              {Object.keys(buckets.by_status || {}).length === 0 && (
                <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em", gridColumn: "1 / -1" }}>
                  — sin work orders aún —
                </div>
              )}
            </div>
          </section>

          <section style={{ ...SECTION_STYLE, padding: 0 }}>
            <header
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid #E2E5EC",
              }}
            >
              <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em" }}>
                Work orders ({projectWos?.length ?? 0})
              </div>
            </header>
            <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {(!projectWos || projectWos.length === 0) && <EmptyRow text="— sin WOs aún —" />}
              {projectWos?.map((w) => <WoRow key={w.id} wo={w} />)}
            </div>
          </section>
        </div>
      </div>

      {/* Equipment reconciliation · Modo 2 (preservado v1, sprint propio para migrar) */}
      <div style={{ marginTop: 16 }}>
        <EquipmentSection project={project} isSrs={isSrs} />
      </div>

      <p
        style={{
          marginTop: 24,
          ...MONO_CAPS,
          fontSize: 10,
          color: "#8B95A8",
          letterSpacing: "0.14em",
        }}
      >
        Iter 2.21 · Rollout Command Center · paleta F NAVEGANTE
      </p>
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────────────────── */

function MetaRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0",
        borderBottom: "1px solid #F0F2F7",
      }}
    >
      <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em", flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: JAKARTA,
          fontSize: 13,
          color: "#0A1628",
          fontWeight: 600,
          maxWidth: "60%",
          textAlign: "right",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const CLUSTER_STATUS_COLOR = {
  proposed:    "#8B95A8",
  activated:   "#0A1628",
  in_progress: "#7E5212",
  completed:   "#0A6131",
  cancelled:   "#7F1D1D",
};

function ClusterRow({ c }) {
  const color = CLUSTER_STATUS_COLOR[c.status] || CLUSTER_STATUS_COLOR.proposed;
  return (
    <div
      style={{
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em", marginBottom: 2 }}>
            {c.code}
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
            {c.title}
          </div>
        </div>
        <span style={{ ...MONO_CAPS, fontSize: 9.5, color, letterSpacing: "0.12em", flexShrink: 0 }}>
          {(c.status || "").replace("_", " ")}
        </span>
      </div>
      <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 4 }}>
        {c.site_ids?.length ?? 0} sites
      </div>
    </div>
  );
}

function WoRow({ wo }) {
  return (
    <Link
      to={`/srs/ops/${wo.id}`}
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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
              {wo.reference}
            </span>
            <SeverityPill severity={wo.severity} />
          </div>
          <div
            style={{
              fontFamily: JAKARTA,
              fontSize: 13.5,
              fontWeight: 600,
              color: "#0A1628",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {wo.title}
          </div>
          <div style={{ marginTop: 6 }}>
            <ShieldPill level={wo.shield_level} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <WoStatusPill status={wo.status} />
          <BallPill side={wo.ball_in_court?.side} />
        </div>
      </div>
    </Link>
  );
}

function EmptyRow({ text }) {
  return (
    <div style={{ padding: "20px 18px", ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
      {text}
    </div>
  );
}

function CenteredMessage({ text }) {
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

function shortId(id) {
  if (!id) return null;
  if (id.length > 14) return `${id.slice(0, 6)}…${id.slice(-4)}`;
  return id;
}
