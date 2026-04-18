/**
 * SRS Overview — war-room cockpit (Fase 2 UI plumbing).
 *
 * Real data from /api/projects + /api/work-orders + /api/auth/me. Rendered
 * with Nucleus v2.0 tokens already locked in Identity Sprint. NOT Fase 4
 * Visual Design polish — that comes when Track B delivers mocks. Here we
 * wire the structure so data is alive + character lands correctly.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useFetch } from "../../lib/useFetch";
import KpiCard from "../../components/ui/KpiCard";
import {
  BallBadge,
  ProjectStatusBadge,
  SeverityBadge,
  ShieldBadge,
  StatusBadge,
  formatAge,
} from "../../components/ui/Badges";

export default function SrsHome() {
  const { user } = useAuth();

  const { data: workOrders, loading: woLoading } = useFetch("/work-orders?limit=50");
  const { data: projects, loading: projLoading } = useFetch("/projects");

  const wos = workOrders || [];
  const projs = projects || [];

  // Compute KPIs locally from list data (no extra endpoint needed)
  const kpis = useMemo(() => {
    const active = wos.filter(
      (w) => !["closed", "cancelled"].includes(w.status)
    ).length;
    const incidents = wos.filter(
      (w) =>
        ["high", "critical"].includes(w.severity) &&
        !["closed", "cancelled"].includes(w.status)
    ).length;
    const ballMine = wos.filter(
      (w) =>
        w.ball_in_court?.actor_user_id === user?.id &&
        !["closed", "cancelled"].includes(w.status)
    ).length;
    const projActive = projs.filter((p) => p.status === "active").length;
    return { active, incidents, ballMine, projActive };
  }, [wos, projs, user]);

  // Recent WOs — sort by created desc, take 8
  const recentWos = useMemo(() => {
    return [...wos]
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
      .slice(0, 8);
  }, [wos]);

  return (
    <div className="px-8 py-7 max-w-wide">
      {/* Header */}
      <div className="accent-bar pl-4 mb-7">
        <div className="label-caps">Overview</div>
        <h1 className="font-display text-3xl text-text-primary leading-tight">
          {greet()} {user?.full_name?.split(" ")[0] || "operator"}
        </h1>
        <p className="font-body text-text-secondary text-sm mt-1">
          Sistema operativo SRS — cockpit en vivo
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="stagger-item" style={{ animationDelay: "0ms" }}>
          <KpiCard
            label="WOs activas"
            value={kpis.active}
            hint={`${wos.length} totales`}
            tone="primary"
            loading={woLoading}
          />
        </div>
        <div className="stagger-item" style={{ animationDelay: "60ms" }}>
          <KpiCard
            label="Proyectos activos"
            value={kpis.projActive}
            hint={`${projs.length} totales`}
            tone="default"
            loading={projLoading}
          />
        </div>
        <div className="stagger-item" style={{ animationDelay: "120ms" }}>
          <KpiCard
            label="Incidencias"
            value={kpis.incidents}
            hint="severity high/critical abiertas"
            tone={kpis.incidents > 0 ? "danger" : "default"}
            loading={woLoading}
          />
        </div>
        <div className="stagger-item" style={{ animationDelay: "180ms" }}>
          <KpiCard
            label="Balón en ti"
            value={kpis.ballMine}
            hint="WOs esperando tu acción"
            tone={kpis.ballMine > 0 ? "warning" : "success"}
            loading={woLoading}
          />
        </div>
      </div>

      {/* Main grid: projects + recent WOs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Projects (2/5) */}
        <section className="lg:col-span-2 bg-surface-raised accent-bar rounded-sm">
          <header className="px-4 py-3 border-b border-surface-border">
            <div className="label-caps">Proyectos</div>
            <h2 className="font-display text-base text-text-primary">
              {projs.length} activos o en curso
            </h2>
          </header>
          <div className="divide-y divide-surface-border">
            {projLoading && <EmptyRow text="cargando…" />}
            {!projLoading && projs.length === 0 && <EmptyRow text="— sin proyectos —" />}
            {projs.slice(0, 10).map((p, i) => (
              <ProjectRow key={p.id} p={p} delayMs={i * 40} />
            ))}
          </div>
        </section>

        {/* Recent WOs (3/5) */}
        <section className="lg:col-span-3 bg-surface-raised accent-bar rounded-sm">
          <header className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
            <div>
              <div className="label-caps">Work orders recientes</div>
              <h2 className="font-display text-base text-text-primary">
                {Math.min(wos.length, 8)} de {wos.length}
              </h2>
            </div>
            <Link
              to="/srs/ops"
              className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light hover:text-primary-light/80"
            >
              Ver todas →
            </Link>
          </header>
          <div className="divide-y divide-surface-border">
            {woLoading && <EmptyRow text="cargando…" />}
            {!woLoading && recentWos.length === 0 && <EmptyRow text="— sin WOs —" />}
            {recentWos.map((w, i) => (
              <WorkOrderRow key={w.id} wo={w} delayMs={i * 40} />
            ))}
          </div>
        </section>
      </div>

      {/* Footer note: Fase 2 plumbing */}
      <p className="mt-8 text-text-tertiary font-mono text-2xs uppercase tracking-widest-srs">
        Fase 2 UI plumbing · pulido visual pendiente Track B Fase 4
      </p>
    </div>
  );
}

// -------------------- Row components --------------------

function ProjectRow({ p, delayMs }) {
  const progress = p.total_sites_target
    ? 0  // no data on closed count here; leave 0 without extra call
    : null;
  return (
    <div
      className="stagger-item px-4 py-3 hover:bg-surface-overlay/60 transition-colors duration-fast"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {p.code}
          </div>
          <div className="font-body text-sm text-text-primary truncate">
            {p.title}
          </div>
        </div>
        <ProjectStatusBadge status={p.status} />
      </div>
      <div className="mt-1 flex items-center gap-3 text-2xs font-mono uppercase tracking-widest-srs text-text-tertiary">
        <span>{p.type}</span>
        {p.total_sites_target && (
          <span>target {p.total_sites_target} sites</span>
        )}
        {p.po_number && <span>PO {p.po_number}</span>}
      </div>
    </div>
  );
}

function WorkOrderRow({ wo, delayMs }) {
  return (
    <div
      className="stagger-item px-4 py-3 hover:bg-surface-overlay/60 transition-colors duration-fast"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              {wo.reference}
            </span>
            <SeverityBadge severity={wo.severity} />
          </div>
          <div className="font-body text-sm text-text-primary truncate">
            {wo.title}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <StatusBadge status={wo.status} />
          <BallBadge
            side={wo.ball_in_court?.side}
            sinceIso={wo.ball_in_court?.since}
          />
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-2xs">
        <ShieldBadge level={wo.shield_level} />
        {wo.deadline_resolve_at && (
          <span className="font-mono uppercase tracking-widest-srs text-text-tertiary">
            resolve in {formatDeadline(wo.deadline_resolve_at)}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyRow({ text }) {
  return (
    <div className="px-4 py-6 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}

// -------------------- Helpers --------------------

function greet() {
  const h = new Date().getHours();
  if (h < 6) return "Aún operando,";
  if (h < 12) return "Buenos días,";
  if (h < 20) return "Buenas tardes,";
  return "Buenas noches,";
}

function formatDeadline(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const delta = t - Date.now();
  const past = delta < 0;
  const abs = Math.abs(delta);
  const hours = Math.floor(abs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (past) return days > 0 ? `OVERDUE ${days}d` : "OVERDUE";
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}
