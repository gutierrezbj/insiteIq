/**
 * RolloutsListPage — Lista de rollouts (Modo 2 v2)
 *
 * Filtra projects con type="rollout" y muestra cards con KPIs sumarios.
 * Click en card → /srs/rollouts/:project_id (RolloutDetailPage 4 tabs).
 *
 * Iter 2.5 polish: search libre + filter por status (activos/cerrados/todos)
 *                  + selector de orden (avance/activas/alfabético) + cliente
 *                  visible en card + delivery pattern + skeleton states +
 *                  border-left rojo si incidentes > 0.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";
import { Icon, ICONS } from "../../../lib/icons";
import EmptyState from "../../../components/v2-shared/EmptyState";

const STATUS_FILTER_KEYS = [
  { key: "active", i18n: "filter_active" },
  { key: "closed", i18n: "filter_closed" },
  { key: "all",    i18n: "filter_all" },
];

const SORT_OPTION_KEYS = [
  { key: "progress_desc",  i18n: "sort_progress_desc" },
  { key: "progress_asc",   i18n: "sort_progress_asc" },
  { key: "active_desc",    i18n: "sort_active_desc" },
  { key: "incidents_desc", i18n: "sort_incidents_desc" },
  { key: "alpha",          i18n: "sort_alpha" },
  { key: "recent",         i18n: "sort_recent" },
];

export default function RolloutsListPage() {
  const { t } = useTranslation("common");
  const STATUS_FILTERS = useMemo(
    () => STATUS_FILTER_KEYS.map((s) => ({ ...s, label: t(`page_rollouts_list.${s.i18n}`) })),
    [t]
  );
  const SORT_OPTIONS = useMemo(
    () => SORT_OPTION_KEYS.map((s) => ({ ...s, label: t(`page_rollouts_list.${s.i18n}`) })),
    [t]
  );
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [orgsMap, setOrgsMap] = useState({});
  const [dashboards, setDashboards] = useState({});  // {project_id: dashboard}
  const [loading, setLoading] = useState(true);

  // Filter / sort state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [sortKey, setSortKey] = useState("progress_desc");

  // Carga inicial: projects + orgs (paralelo)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [projData, orgsData] = await Promise.all([
          api.get("/projects?limit=200").catch(() => []),
          api.get("/organizations?limit=200").catch(() => []),
        ]);
        if (cancelled) return;
        const projItems = Array.isArray(projData) ? projData : projData?.items || [];
        const orgItems = Array.isArray(orgsData) ? orgsData : orgsData?.items || [];
        const onlyRollouts = projItems.filter((p) => p.type === "rollout" || p.type === "survey");
        const orgs = Object.fromEntries(orgItems.map((o) => [o.id, o]));
        setProjects(onlyRollouts);
        setOrgsMap(orgs);
        // Fetch dashboards in parallel (no bloquea render)
        Promise.all(onlyRollouts.map((p) =>
          api.get(`/projects/${p.id}/dashboard`).then((d) => [p.id, d]).catch(() => [p.id, null])
        )).then((entries) => {
          if (cancelled) return;
          setDashboards(Object.fromEntries(entries));
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Filtered + sorted projects
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = projects.filter((p) => {
      if (statusFilter === "active" && p.status !== "active") return false;
      if (statusFilter === "closed" && p.status === "active") return false;
      if (term) {
        const hay = `${p.code || ""} ${p.title || ""} ${p.po_number || ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });

    const progressOf = (p) => {
      const d = dashboards[p.id];
      const total = d?.total_sites_target || p.total_sites_target || 0;
      const done = d?.work_orders?.completed || 0;
      return total > 0 ? done / total : 0;
    };
    const activeOf = (p) => dashboards[p.id]?.work_orders?.active || 0;
    const incidentsOf = (p) => dashboards[p.id]?.kpis?.incidents_active || 0;

    result.sort((a, b) => {
      switch (sortKey) {
        case "progress_desc":  return progressOf(b) - progressOf(a);
        case "progress_asc":   return progressOf(a) - progressOf(b);
        case "active_desc":    return activeOf(b) - activeOf(a);
        case "incidents_desc": return incidentsOf(b) - incidentsOf(a);
        case "alpha":          return (a.title || "").localeCompare(b.title || "");
        case "recent":         return (b.updated_at || "").localeCompare(a.updated_at || "");
        default:               return 0;
      }
    });
    return result;
  }, [projects, dashboards, search, statusFilter, sortKey]);

  // Counts para badges en filter chips
  const statusCounts = useMemo(() => ({
    active: projects.filter((p) => p.status === "active").length,
    closed: projects.filter((p) => p.status !== "active").length,
    all:    projects.length,
  }), [projects]);

  return (
    <div className="px-6 py-6">
      {/* Header + filter bar */}
      <header className="mb-4">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
          <div>
            <p className="label-caps-v2" style={{ color: "#0A1628", fontWeight: 800 }}>{t("page_rollouts_list.title")}</p>
            <h1
              className="font-jakarta text-[22px] leading-tight"
              style={{ color: "#0A1628", fontWeight: 800, letterSpacing: "-0.015em" }}
            >
              {loading
                ? t("page_rollouts_list.loading")
                : projects.length === 1
                  ? t("page_rollouts_list.header_count_one", { count: visible.length, total: projects.length })
                  : t("page_rollouts_list.header_count_other", { count: visible.length, total: projects.length })}
            </h1>
            <p className="text-[12px] text-cl-text-mid mt-1" style={{ fontWeight: 500 }}>
              {t("page_rollouts_list.header_subtitle")}
            </p>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-cl-text-dim uppercase" style={{ letterSpacing: "0.1em" }}>{t("page_rollouts_list.sort_label")}</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="bg-cl-surface/40 border border-cl-border rounded-sm px-2 py-1 text-[11px] text-cl-text font-mono"
              style={{ minWidth: 150 }}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search input */}
          <div className="relative flex-1 min-w-[240px] max-w-[420px]">
            <Icon
              icon={ICONS.search}
              size={14}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#8B95A8" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("page_rollouts_list.search_placeholder")}
              className="w-full bg-cl-surface/40 border border-cl-border rounded-sm pl-8 pr-8 py-1.5 text-[12px] text-cl-text font-mono placeholder-cl-text-dim focus:outline-none focus:border-cl-amber/60"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-cl-text-dim hover:text-cl-text"
                title={t("page_rollouts_list.clear_search_tooltip")}
              >
                <Icon icon={ICONS.close} size={12} />
              </button>
            )}
          </div>

          {/* Status filter chips · activo navy bg + white text */}
          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map((f) => {
              const isActive = statusFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className="font-jakarta px-3 py-1.5 rounded-sm transition"
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? "#FFFFFF" : "#3D4A66",
                    border: isActive ? "1px solid #0A1628" : "1px solid #C8CDD8",
                    background: isActive ? "#0A1628" : "#FFFFFF",
                    letterSpacing: "0.04em",
                    boxShadow: isActive ? "0 1px 3px rgba(10, 22, 40, 0.18)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "#F4F6F8";
                      e.currentTarget.style.borderColor = "#0A1628";
                      e.currentTarget.style.color = "#0A1628";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "#FFFFFF";
                      e.currentTarget.style.borderColor = "#C8CDD8";
                      e.currentTarget.style.color = "#3D4A66";
                    }
                  }}
                >
                  {f.label} <span className="text-[9px] ml-0.5" style={{ opacity: 0.7 }}>({statusCounts[f.key]})</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Body: skeleton / cards / empty */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <RolloutCardSkeleton key={i} />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="px-6 py-12">
          <EmptyState
            icon="inbox"
            title={search || statusFilter !== "all" ? t("page_rollouts_list.empty_filter_title") : t("page_rollouts_list.empty_no_active_title")}
            sublabel={search
              ? t("page_rollouts_list.empty_search_sublabel", { search })
              : t("page_rollouts_list.empty_no_active_sublabel")}
            action={search ? { label: t("page_rollouts_list.clear_search_action"), onClick: () => setSearch("") } : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((p) => (
            <RolloutCard
              key={p.id}
              project={p}
              dashboard={dashboards[p.id]}
              orgsMap={orgsMap}
              onClick={() => navigate(`/srs/rollouts/${p.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RolloutCardSkeleton() {
  return (
    <article className="bg-cl-surface/30 border border-cl-border rounded-sm px-4 py-4 animate-pulse">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1">
          <div className="h-2.5 w-24 bg-cl-border rounded-sm mb-2" />
          <div className="h-3.5 w-3/4 bg-cl-border rounded-sm" />
        </div>
        <div className="h-3 w-12 bg-cl-border rounded-sm" />
      </div>
      <div className="space-y-2.5 mt-3">
        <div className="flex justify-between">
          <div className="h-2.5 w-12 bg-cl-border rounded-sm" />
          <div className="h-3 w-16 bg-cl-border rounded-sm" />
        </div>
        <div className="h-1.5 w-full bg-cl-border rounded-full" />
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="h-10 bg-cl-border/50 rounded-sm" />
          <div className="h-10 bg-cl-border/50 rounded-sm" />
        </div>
      </div>
    </article>
  );
}

function RolloutCard({ project, dashboard, orgsMap, onClick }) {
  const { t } = useTranslation("common");
  const totalSites = dashboard?.total_sites_target || project.total_sites_target || 0;
  const completed = dashboard?.work_orders?.completed || 0;
  const active = dashboard?.work_orders?.active || 0;
  const incidents = dashboard?.kpis?.incidents_active || 0;
  const progressPct = totalSites > 0 ? Math.round((completed / totalSites) * 100) : 0;

  const clientOrg = orgsMap[project.client_organization_id];
  const endClientOrg = orgsMap[project.end_client_organization_id];

  // Health visual: si hay incidentes > 0, border-left rojo
  const accentColor = incidents > 0
    ? "#DC2626"
    : project.status === "active"
      ? "#0A1628"
      : "#E2E5EC";

  return (
    <article
      onClick={onClick}
      className="rounded-sm px-4 py-4 cursor-pointer transition"
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        borderLeftWidth: 4,
        borderLeftColor: accentColor,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#C8CDD8";
        e.currentTarget.style.borderLeftColor = accentColor;
        e.currentTarget.style.boxShadow = "0 4px 12px -2px rgba(10, 22, 40, 0.10)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E2E5EC";
        e.currentTarget.style.borderLeftColor = accentColor;
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] text-cl-text-dim uppercase truncate" style={{ letterSpacing: "0.1em" }}>
            {project.code}
          </p>
          {/* Title navy strong (NO text-white) */}
          <h3
            className="font-jakarta text-[16px] leading-tight mt-0.5 truncate"
            title={project.title}
            style={{ color: "#0A1628", fontWeight: 700, letterSpacing: "-0.005em" }}
          >
            {project.title}
          </h3>
        </div>
        <span
          className="font-jakarta text-[10px] uppercase px-2 py-0.5 rounded-sm flex-shrink-0"
          style={{
            color: project.status === "active" ? "#0A6131" : "#3D4A66",
            background: project.status === "active" ? "#D9F1E5" : "#F4F6F8",
            border: project.status === "active" ? "1px solid #16A34A" : "1px solid #C8CDD8",
            fontWeight: 700,
            letterSpacing: "0.1em",
          }}
        >
          {project.status}
        </span>
      </div>

      {/* Cliente / end-client / PO */}
      {(clientOrg || endClientOrg || project.po_number) && (
        <div className="text-[10px] text-cl-text-mid space-y-0.5 mb-3 font-mono">
          {clientOrg && (
            <div className="truncate" title={(clientOrg.display_name || clientOrg.legal_name)}>
              <span className="text-cl-text-dim">{t("page_rollouts_list.client_label")}</span> <span className="text-cl-text">{(clientOrg.display_name || clientOrg.legal_name)}</span>
            </div>
          )}
          {endClientOrg && endClientOrg.id !== clientOrg?.id && (
            <div className="truncate" title={(endClientOrg.display_name || endClientOrg.legal_name)}>
              <span className="text-cl-text-dim">{t("page_rollouts_list.end_client_label")}</span> <span className="text-cl-text">{(endClientOrg.display_name || endClientOrg.legal_name)}</span>
            </div>
          )}
          {project.po_number && (
            <div className="truncate" title={project.po_number}>
              <span className="text-cl-text-dim">PO:</span> <span className="text-cl-text">{project.po_number}</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2.5 mt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-jakarta uppercase" style={{ color: "#3D4A66", fontWeight: 700, letterSpacing: "0.1em" }}>{t("page_rollouts_list.progress")}</span>
          {/* Avance navy strong + counter limpio */}
          <span className="font-jakarta" style={{ fontSize: 16, color: "#0A1628", fontWeight: 800, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>
            {completed}/{totalSites} <span className="text-[11px]" style={{ color: "#8B95A8", fontWeight: 600 }}>· {progressPct}%</span>
          </span>
        </div>

        <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: "#E8EDF5" }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              background: progressPct >= 80 ? "#16A34A" : progressPct >= 50 ? "#E8A33D" : "#0066B8",
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] mt-3">
          <div className="px-3 py-2 rounded-sm" style={{ background: "#F7F8FA", border: "1px solid #E2E5EC" }}>
            <p className="text-[9px] font-jakarta uppercase" style={{ color: "#8B95A8", fontWeight: 700, letterSpacing: "0.1em" }}>{t("page_rollouts_list.active")}</p>
            <p className="font-jakarta" style={{ fontSize: 18, color: "#0A1628", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{active}</p>
          </div>
          <div
            className="px-3 py-2 rounded-sm"
            style={{
              background: incidents > 0 ? "#FCE4E6" : "#F7F8FA",
              border: incidents > 0 ? "1px solid #D63944" : "1px solid #E2E5EC",
              borderLeftWidth: 3,
              borderLeftColor: incidents > 0 ? "#D63944" : "#16A34A",
            }}
          >
            <p className="text-[9px] font-jakarta uppercase" style={{ color: incidents > 0 ? "#8E1F2A" : "#8B95A8", fontWeight: 700, letterSpacing: "0.1em" }}>{t("page_rollouts_list.incidents")}</p>
            <p
              className="font-jakarta"
              style={{ fontSize: 18, color: incidents > 0 ? "#D63944" : "#16A34A", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
            >
              {incidents}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 flex items-center justify-between text-[11px]" style={{ borderTop: "1px solid #E2E5EC", color: "#0A1628" }}>
        <span className="font-jakarta uppercase" style={{ fontWeight: 700, letterSpacing: "0.08em" }}>{t("page_rollouts_list.open_rollout")}</span>
        <Icon icon={ICONS.arrowRight} size={12} />
      </div>
    </article>
  );
}
