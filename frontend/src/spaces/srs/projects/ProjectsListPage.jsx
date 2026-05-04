/**
 * SRS Projects · list page (Iter 2.21 · paleta F NAVEGANTE).
 *
 * Migración del v1 amber legacy a v2 inline paleta F. Self-contained:
 * NO usa Badges/KpiCard/BackLink shared (esos siguen tokens v1) hasta
 * que el paquete shared se migre en otro sprint. Inline styles para
 * navy + Plus Jakarta + JetBrains Mono.
 *
 * Estructura preservada del v1:
 *   - Header con count h1 + chips type counters
 *   - Tabla 12-col grid: Code/Título · Type · Pattern · Status · Target sites
 *   - Filas clickeables a /srs/projects/{id}
 *
 * Endpoint: GET /api/projects → [{ id, code, title, type, delivery_pattern,
 *   status, total_sites_target, ... }]
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";

const JAKARTA = "'Plus Jakarta Sans', sans-serif";

const MONO_CAPS = {
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

// Project status → estilo inline paleta F
const STATUS_STYLES = {
  draft:     { bg: "#F0F2F7",  border: "#C8CDD8", color: "#3D4A66" },
  active:    { bg: "#D9F1E5",  border: "#16A34A", color: "#0A6131" },
  paused:    { bg: "#FCF1DC",  border: "#E8A33D", color: "#7E5212" },
  completed: { bg: "#DBEAFE",  border: "#2563EB", color: "#1E3A8A" },
  cancelled: { bg: "#FEE2E2",  border: "#DC2626", color: "#7F1D1D" },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
}

export default function ProjectsListPage() {
  const { data, loading } = useFetch("/projects");
  const projects = useMemo(() => data || [], [data]);

  const byType = useMemo(() => {
    const m = {};
    for (const p of projects) m[p.type] = (m[p.type] || 0) + 1;
    return m;
  }, [projects]);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      {/* Header */}
      <div
        style={{
          paddingLeft: 16,
          borderLeft: "3px solid #0A1628",
          marginBottom: 28,
        }}
      >
        <div style={{ ...MONO_CAPS, fontSize: 11, color: "#8B95A8", marginBottom: 6 }}>
          Projects
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
          {projects.length} <span style={{ color: "#3D4A66", fontWeight: 600 }}>proyectos</span>
        </h1>
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(byType).map(([t, n]) => (
            <span
              key={t}
              style={{
                padding: "4px 10px",
                background: "#FFFFFF",
                border: "1px solid #C8CDD8",
                borderRadius: 4,
                ...MONO_CAPS,
                fontSize: 10,
                color: "#0A1628",
                letterSpacing: "0.12em",
              }}
            >
              {t} · <span style={{ color: "#3D4A66", fontWeight: 800, marginLeft: 2 }}>{n}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E5EC",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(10, 22, 40, 0.05)",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "4fr 2fr 2fr 2fr 2fr",
            gap: 8,
            padding: "12px 18px",
            background: "#F4F6F8",
            borderBottom: "1px solid #E2E5EC",
            ...MONO_CAPS,
            fontSize: 10,
            color: "#3D4A66",
            letterSpacing: "0.14em",
          }}
        >
          <div>Code / Título</div>
          <div>Type</div>
          <div>Pattern</div>
          <div>Status</div>
          <div style={{ textAlign: "right" }}>Target sites</div>
        </div>

        {/* Rows */}
        {loading && <EmptyRow text="cargando…" />}
        {!loading && projects.length === 0 && <EmptyRow text="— sin proyectos —" />}
        {projects.map((p) => (
          <Link
            key={p.id}
            to={`/srs/projects/${p.id}`}
            style={{
              display: "grid",
              gridTemplateColumns: "4fr 2fr 2fr 2fr 2fr",
              gap: 8,
              padding: "14px 18px",
              borderBottom: "1px solid #E2E5EC",
              alignItems: "center",
              textDecoration: "none",
              transition: "background 160ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FA")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  ...MONO_CAPS,
                  fontSize: 9.5,
                  color: "#8B95A8",
                  letterSpacing: "0.12em",
                  marginBottom: 2,
                }}
              >
                {p.code}
              </div>
              <div
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0A1628",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {p.title}
              </div>
            </div>
            <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.12em" }}>
              {p.type}
            </div>
            <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.12em" }}>
              {p.delivery_pattern}
            </div>
            <div>
              <StatusPill status={p.status} />
            </div>
            <div
              style={{
                textAlign: "right",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                fontWeight: 600,
                color: "#0A1628",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {p.total_sites_target ?? "—"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EmptyRow({ text }) {
  return (
    <div
      style={{
        padding: "24px 18px",
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
