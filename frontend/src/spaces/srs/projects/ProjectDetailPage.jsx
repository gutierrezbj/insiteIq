/**
 * SRS Projects — Rollout Command Center view (Modo 2).
 * Shows BUMM KPIs + clusters + linked work orders.
 */
import { Link, useParams } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import KpiCard from "../../../components/ui/KpiCard";
import {
  BallBadge,
  ProjectStatusBadge,
  SeverityBadge,
  ShieldBadge,
  StatusBadge,
} from "../../../components/ui/Badges";

export default function ProjectDetailPage() {
  const { project_id } = useParams();

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
    <div className="px-8 py-7 max-w-wide">
      <Link
        to="/srs/projects"
        className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary hover:text-primary-light inline-block mb-3"
      >
        ← Projects
      </Link>

      {/* Header */}
      <div className="accent-bar pl-4 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="label-caps">
            {project.type} · {project.delivery_pattern}
          </span>
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {project.code}
          </span>
          <ProjectStatusBadge status={project.status} />
        </div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          {project.title}
        </h1>
        {project.description && (
          <p className="font-body text-text-secondary text-sm mt-2 max-w-prose">
            {project.description}
          </p>
        )}
      </div>

      {/* BUMM KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Progress"
          value={`${kpis.progress_pct ?? 0}%`}
          hint={`${buckets.completed ?? 0} de ${project.total_sites_target ?? "—"}`}
          tone="primary"
        />
        <KpiCard
          label="SLA compliance"
          value={
            kpis.sla_compliance_pct != null ? `${kpis.sla_compliance_pct}%` : "—"
          }
          hint="closed within deadline"
          tone={kpis.sla_compliance_pct >= 90 ? "success" : "warning"}
        />
        <KpiCard
          label="Throughput 7d"
          value={kpis.throughput_week ?? 0}
          hint="WOs closed last week"
          tone="default"
        />
        <KpiCard
          label="Incidencias activas"
          value={kpis.incidents_active ?? 0}
          hint="high/critical abiertas"
          tone={(kpis.incidents_active ?? 0) > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Metadata + clusters left */}
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-surface-raised accent-bar rounded-sm p-4">
            <div className="label-caps mb-3">Metadata</div>
            <dl className="font-body text-sm divide-y divide-surface-border">
              <MetaRow label="Client org" value={shortId(project.client_organization_id)} />
              <MetaRow
                label="End client"
                value={shortId(project.end_client_organization_id) || "—"}
              />
              <MetaRow
                label="Service agreement"
                value={shortId(project.service_agreement_id)}
              />
              <MetaRow label="PO number" value={project.po_number || "—"} />
              <MetaRow
                label="Playbook"
                value={project.playbook_template || "—"}
              />
              <MetaRow
                label="Cluster lead"
                value={shortId(project.cluster_lead_user_id) || "—"}
              />
              <MetaRow
                label="Field senior"
                value={shortId(project.field_senior_user_id) || "—"}
              />
              <MetaRow
                label="SRS coordinator"
                value={shortId(project.srs_coordinator_user_id) || "—"}
              />
              <MetaRow
                label="Target end"
                value={
                  project.target_end_date
                    ? new Date(project.target_end_date).toLocaleDateString()
                    : "—"
                }
              />
              <MetaRow
                label="Actual end"
                value={
                  project.actual_end_date
                    ? new Date(project.actual_end_date).toLocaleDateString()
                    : "—"
                }
              />
              <MetaRow
                label="Total sites target"
                value={project.total_sites_target ?? "—"}
              />
            </dl>
          </section>

          {/* Delivery chain (Modo 3 stackable) */}
          {project.delivery_chain?.length > 0 && (
            <section className="bg-surface-raised accent-bar rounded-sm p-4">
              <div className="label-caps mb-3">Delivery chain</div>
              <ol className="space-y-1.5">
                {project.delivery_chain.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 font-body text-sm"
                  >
                    <span className="w-5 text-center font-mono text-2xs text-text-tertiary">
                      {t.tier_index}
                    </span>
                    <span className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light">
                      {t.role}
                    </span>
                    <span className="text-text-secondary truncate">
                      {shortId(t.organization_id)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Clusters */}
          <section className="bg-surface-raised accent-bar rounded-sm p-4">
            <div className="label-caps mb-3">
              Cluster groups ({clusters?.length ?? 0})
            </div>
            {(!clusters || clusters.length === 0) && (
              <div className="font-body text-sm text-text-tertiary">— sin clusters aún —</div>
            )}
            <div className="space-y-2">
              {clusters?.map((c) => (
                <ClusterRow key={c.id} c={c} />
              ))}
            </div>
          </section>
        </div>

        {/* WO buckets + list right */}
        <div className="lg:col-span-3 space-y-4">
          {/* Status buckets */}
          <section className="bg-surface-raised accent-bar rounded-sm p-4">
            <div className="label-caps mb-3">WO buckets por status</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {Object.entries(buckets.by_status || {}).map(([k, v]) => (
                <div
                  key={k}
                  className="bg-surface-base rounded-sm px-3 py-2"
                >
                  <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                    {k}
                  </div>
                  <div className="font-mono text-xl text-text-primary">{v}</div>
                </div>
              ))}
              {Object.keys(buckets.by_status || {}).length === 0 && (
                <div className="col-span-5 font-body text-sm text-text-tertiary">
                  — sin work orders aún —
                </div>
              )}
            </div>
          </section>

          {/* WOs list */}
          <section className="bg-surface-raised accent-bar rounded-sm">
            <header className="px-4 py-3 border-b border-surface-border">
              <div className="label-caps">Work orders ({projectWos?.length ?? 0})</div>
            </header>
            <div className="divide-y divide-surface-border max-h-[70vh] overflow-y-auto">
              {(!projectWos || projectWos.length === 0) && (
                <EmptyRow text="— sin WOs aún —" />
              )}
              {projectWos?.map((w, i) => (
                <WoRow key={w.id} wo={w} delayMs={Math.min(i * 20, 500)} />
              ))}
            </div>
          </section>
        </div>
      </div>

      <p className="mt-6 text-text-tertiary font-mono text-2xs uppercase tracking-widest-srs">
        Fase 2 plumbing · Rollout Command Center · mapa + burndown visual
        pendiente Track B Fase 4
      </p>
    </div>
  );
}

// -------------------- Sub-components --------------------

function MetaRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary flex-shrink-0">
        {label}
      </span>
      <span className="font-body text-sm text-text-primary truncate max-w-[60%] text-right">
        {value}
      </span>
    </div>
  );
}

const CLUSTER_STATUS_TEXT = {
  proposed: { text: "text-text-tertiary", label: "proposed" },
  activated: { text: "text-primary-light", label: "activated" },
  in_progress: { text: "text-warning", label: "in progress" },
  completed: { text: "text-success", label: "completed" },
  cancelled: { text: "text-danger", label: "cancelled" },
};

function ClusterRow({ c }) {
  const st = CLUSTER_STATUS_TEXT[c.status] || CLUSTER_STATUS_TEXT.proposed;
  return (
    <div className="bg-surface-base rounded-sm px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {c.code}
          </div>
          <div className="font-body text-sm text-text-primary truncate">
            {c.title}
          </div>
        </div>
        <span
          className={`font-mono text-2xs uppercase tracking-widest-srs ${st.text} flex-shrink-0`}
        >
          {st.label}
        </span>
      </div>
      <div className="mt-0.5 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
        {c.site_ids?.length ?? 0} sites
      </div>
    </div>
  );
}

function WoRow({ wo, delayMs }) {
  return (
    <Link
      to={`/srs/ops/${wo.id}`}
      className="stagger-item block px-4 py-2.5 hover:bg-surface-overlay/60 transition-colors duration-fast"
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
      <div className="mt-1.5">
        <ShieldBadge level={wo.shield_level} />
      </div>
    </Link>
  );
}

function EmptyRow({ text }) {
  return (
    <div className="px-4 py-6 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}

function CenteredMessage({ text }) {
  return (
    <div className="px-8 py-16 text-center font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}

function shortId(id) {
  if (!id) return null;
  if (id.length > 14) return `${id.slice(0, 6)}…${id.slice(-4)}`;
  return id;
}
