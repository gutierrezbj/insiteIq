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
import { api } from "../../../lib/api";
import { Icon, ICONS } from "../../../lib/icons";
import EmptyState from "../../../components/v2-shared/EmptyState";

const STATUS_FILTERS = [
  { key: "active", label: "Activos" },
  { key: "closed", label: "Cerrados" },
  { key: "all",    label: "Todos" },
];

const SORT_OPTIONS = [
  { key: "progress_desc", label: "Más avance" },
  { key: "progress_asc",  label: "Menos avance" },
  { key: "active_desc",   label: "Más activas" },
  { key: "incidents_desc", label: "Más incidentes" },
  { key: "alpha",         label: "Alfabético" },
  { key: "recent",        label: "Más reciente" },
];

export default function RolloutsListPage() {
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
        const onlyRollouts = projItems.filter((p) => p.type === "rollout");
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
            <p className="label-caps-v2">Rollouts</p>
            <h1
              className="font-display text-[20px] font-semibold text-white leading-tight"
              style={{ letterSpacing: "0.01em" }}
            >
              {loading ? "Cargando…" : `${visible.length} de ${projects.length} ${projects.length === 1 ? "rollout" : "rollouts"}`}
            </h1>
            <p className="text-[11px] text-wr-text-mid mt-1 font-mono">
              Click en una tarjeta para ver mapa · kanban · cuadro de mando · timeline
            </p>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-wr-text-dim uppercase" style={{ letterSpacing: "0.1em" }}>Ordenar:</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="bg-wr-surface/40 border border-wr-border rounded-sm px-2 py-1 text-[11px] text-wr-text font-mono"
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
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6B7280" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, título, PO…"
              className="w-full bg-wr-surface/40 border border-wr-border rounded-sm pl-8 pr-8 py-1.5 text-[12px] text-wr-text font-mono placeholder-wr-text-dim focus:outline-none focus:border-wr-amber/60"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-wr-text-dim hover:text-wr-text"
                title="Limpiar búsqueda"
              >
                <Icon icon={ICONS.close} size={12} />
              </button>
            )}
          </div>

          {/* Status filter chips */}
          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className="text-[11px] px-2.5 py-1 rounded-sm border transition"
                style={{
                  color: statusFilter === f.key ? "#F59E0B" : "#9CA3AF",
                  borderColor: statusFilter === f.key ? "#F59E0B" : "#1F1F1F",
                  background: statusFilter === f.key ? "rgba(245, 158, 11, 0.08)" : "transparent",
                  letterSpacing: "0.04em",
                }}
              >
                {f.label} <span className="text-[9px] opacity-70 ml-0.5">({statusCounts[f.key]})</span>
              </button>
            ))}
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
            title={search || statusFilter !== "all" ? "Sin rollouts en este filtro" : "Sin rollouts activos"}
            sublabel={search ? `Probá quitar la búsqueda "${search}"` : "Cambiá el filtro o creá uno desde Proyectos / API"}
            action={search ? { label: "Limpiar búsqueda", onClick: () => setSearch("") } : undefined}
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
    <article className="bg-wr-surface/30 border border-wr-border rounded-sm px-4 py-4 animate-pulse">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1">
          <div className="h-2.5 w-24 bg-wr-border rounded-sm mb-2" />
          <div className="h-3.5 w-3/4 bg-wr-border rounded-sm" />
        </div>
        <div className="h-3 w-12 bg-wr-border rounded-sm" />
      </div>
      <div className="space-y-2.5 mt-3">
        <div className="flex justify-between">
          <div className="h-2.5 w-12 bg-wr-border rounded-sm" />
          <div className="h-3 w-16 bg-wr-border rounded-sm" />
        </div>
        <div className="h-1.5 w-full bg-wr-border rounded-full" />
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="h-10 bg-wr-border/50 rounded-sm" />
          <div className="h-10 bg-wr-border/50 rounded-sm" />
        </div>
      </div>
    </article>
  );
}

function RolloutCard({ project, dashboard, orgsMap, onClick }) {
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
      ? "#F59E0B"
      : "#1F1F1F";

  return (
    <article
      onClick={onClick}
      className="bg-wr-surface/40 border border-wr-border rounded-sm px-4 py-4 cursor-pointer hover:border-wr-amber/50 transition"
      style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] text-wr-text-dim uppercase truncate" style={{ letterSpacing: "0.1em" }}>
            {project.code}
          </p>
          <h3 className="font-display text-[15px] text-white font-semibold leading-tight mt-0.5 truncate" title={project.title}>
            {project.title}
          </h3>
        </div>
        <span
          className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded-sm flex-shrink-0"
          style={{
            color: project.status === "active" ? "#22C55E" : "#9CA3AF",
            background: project.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.1)",
            letterSpacing: "0.1em",
          }}
        >
          {project.status}
        </span>
      </div>

      {/* Cliente / end-client / PO */}
      {(clientOrg || endClientOrg || project.po_number) && (
        <div className="text-[10px] text-wr-text-mid space-y-0.5 mb-3 font-mono">
          {clientOrg && (
            <div className="truncate" title={(clientOrg.display_name || clientOrg.legal_name)}>
              <span className="text-wr-text-dim">Cliente:</span> <span className="text-wr-text">{(clientOrg.display_name || clientOrg.legal_name)}</span>
            </div>
          )}
          {endClientOrg && endClientOrg.id !== clientOrg?.id && (
            <div className="truncate" title={(endClientOrg.display_name || endClientOrg.legal_name)}>
              <span className="text-wr-text-dim">End-client:</span> <span className="text-wr-text">{(endClientOrg.display_name || endClientOrg.legal_name)}</span>
            </div>
          )}
          {project.po_number && (
            <div className="truncate" title={project.po_number}>
              <span className="text-wr-text-dim">PO:</span> <span className="text-wr-text">{project.po_number}</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2.5 mt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-wr-text-mid">Avance</span>
          <span className="font-mono text-[14px] font-semibold text-white">
            {completed}/{totalSites} <span className="text-[11px] text-wr-text-dim">· {progressPct}%</span>
          </span>
        </div>

        <div className="w-full bg-wr-bg rounded-full h-1.5 overflow-hidden">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              background: progressPct >= 80 ? "#22C55E" : progressPct >= 50 ? "#F59E0B" : "#3B82F6",
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] mt-3">
          <div className="bg-wr-bg/40 px-2 py-1.5 rounded-sm">
            <p className="text-[9px] text-wr-text-dim uppercase" style={{ letterSpacing: "0.1em" }}>Activas</p>
            <p className="font-mono text-[14px] text-wr-text font-semibold">{active}</p>
          </div>
          <div className="bg-wr-bg/40 px-2 py-1.5 rounded-sm" style={{ borderLeft: incidents > 0 ? "2px solid #DC2626" : "2px solid #1F1F1F" }}>
            <p className="text-[9px] text-wr-text-dim uppercase" style={{ letterSpacing: "0.1em" }}>Incidentes</p>
            <p
              className="font-mono text-[14px] font-semibold"
              style={{ color: incidents > 0 ? "#DC2626" : "#22C55E" }}
            >
              {incidents}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-wr-border flex items-center justify-between text-[10px] text-wr-amber">
        <span className="uppercase font-medium" style={{ letterSpacing: "0.08em" }}>Abrir rollout</span>
        <Icon icon={ICONS.arrowRight} size={12} />
      </div>
    </article>
  );
}
