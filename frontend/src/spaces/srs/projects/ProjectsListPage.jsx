/**
 * SRS Projects · list page (Iter 2.22 · refactor a v2-shared).
 *
 * Sin cambio visual respecto a Iter 2.21. Solo sustituye los inline
 * definitions por imports de v2-shared/. Patrón replicable para futuras
 * migraciones.
 *
 * Endpoint: GET /api/projects → [{ id, code, title, type, delivery_pattern,
 *   status, total_sites_target, ... }]
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFetch } from "../../../lib/useFetch";
import { ProjectStatusPill } from "../../../components/v2-shared/Pills";
import { JAKARTA, MONO_CAPS } from "../../../components/v2-shared/typography";

export default function ProjectsListPage() {
  const { t } = useTranslation("common");
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
          {t("page_projects.kicker")}
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
          {projects.length} <span style={{ color: "#3D4A66", fontWeight: 600 }}>{t("page_projects.title_count_suffix")}</span>
        </h1>
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(byType).map(([type, n]) => (
            <span
              key={type}
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
              {type} · <span style={{ color: "#3D4A66", fontWeight: 800, marginLeft: 2 }}>{n}</span>
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
          <div>{t("page_projects.col_code_title")}</div>
          <div>{t("page_projects.col_type")}</div>
          <div>{t("page_projects.col_pattern")}</div>
          <div>{t("page_projects.col_status")}</div>
          <div style={{ textAlign: "right" }}>{t("page_projects.col_target_sites")}</div>
        </div>

        {/* Rows */}
        {loading && <EmptyRow text={t("common.loading")} />}
        {!loading && projects.length === 0 && <EmptyRow text={t("page_projects.empty_no_projects")} />}
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
              <ProjectStatusPill status={p.status} />
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
