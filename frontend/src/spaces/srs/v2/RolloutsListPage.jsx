/**
 * RolloutsListPage — Lista de rollouts (Modo 2 v2)
 *
 * Filtra projects con type="rollout" y muestra cards con KPIs sumarios.
 * Click en card → /srs/rollouts/:project_id (RolloutDetailPage 4 tabs).
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";
import { Icon, ICONS } from "../../../lib/icons";
import EmptyState from "../../../components/v2-shared/EmptyState";

export default function RolloutsListPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/projects?limit=200")
      .then((data) => {
        const items = Array.isArray(data) ? data : data?.items || [];
        setProjects(items.filter((p) => p.type === "rollout"));
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-6 py-8 text-wr-text-mid font-mono text-[12px]">
        Cargando rollouts…
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="px-6 py-12">
        <EmptyState
          icon="inbox"
          title="Sin rollouts activos"
          sublabel="Crea uno desde Proyectos o vía API."
        />
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <header className="mb-4">
        <p className="label-caps-v2">Rollouts</p>
        <h1
          className="font-display text-[20px] font-semibold text-white leading-tight"
          style={{ letterSpacing: "0.01em" }}
        >
          {projects.length} {projects.length === 1 ? "rollout" : "rollouts"} activos
        </h1>
        <p className="text-[11px] text-wr-text-mid mt-1 font-mono">
          Click en una tarjeta para ver mapa · kanban · cuadro de mando · timeline
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {projects.map((p) => (
          <RolloutCard
            key={p.id}
            project={p}
            onClick={() => navigate(`/srs/rollouts/${p.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function RolloutCard({ project, onClick }) {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    api.get(`/projects/${project.id}/dashboard`)
      .then(setDashboard)
      .catch(() => setDashboard(null));
  }, [project.id]);

  const totalSites = dashboard?.total_sites_target || project.total_sites_target || 0;
  const completed = dashboard?.work_orders?.completed || 0;
  const active = dashboard?.work_orders?.active || 0;
  const incidents = dashboard?.kpis?.incidents_active || 0;
  const progressPct = totalSites > 0 ? Math.round((completed / totalSites) * 100) : 0;

  return (
    <article
      onClick={onClick}
      className="bg-wr-surface/40 border border-wr-border rounded-sm px-4 py-4 cursor-pointer hover:border-wr-amber/50 transition"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] text-wr-text-dim uppercase" style={{ letterSpacing: "0.1em" }}>
            {project.code}
          </p>
          <h3 className="font-display text-[15px] text-white font-semibold leading-tight mt-0.5 truncate">
            {project.title}
          </h3>
        </div>
        <span
          className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded-sm"
          style={{
            color: project.status === "active" ? "#22C55E" : "#9CA3AF",
            background: project.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.1)",
            letterSpacing: "0.1em",
          }}
        >
          {project.status}
        </span>
      </div>

      <div className="space-y-2.5 mt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-wr-text-mid">Avance</span>
          <span className="font-mono text-[14px] font-semibold text-white">
            {completed}/{totalSites} <span className="text-[11px] text-wr-text-dim">· {progressPct}%</span>
          </span>
        </div>

        <div className="w-full bg-wr-bg rounded-full h-1.5 overflow-hidden">
          <div
            className="h-1.5 rounded-full"
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
