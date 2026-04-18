/**
 * SRS Projects — list of all projects (reactive / rollout / engagement / survey / dc_migration).
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import { ProjectStatusBadge } from "../../../components/ui/Badges";

export default function ProjectsListPage() {
  const { data, loading } = useFetch("/projects");
  const projects = useMemo(() => data || [], [data]);

  const byType = useMemo(() => {
    const m = {};
    for (const p of projects) {
      m[p.type] = (m[p.type] || 0) + 1;
    }
    return m;
  }, [projects]);

  return (
    <div className="px-8 py-7 max-w-wide">
      <div className="accent-bar pl-4 mb-6">
        <div className="label-caps">Projects</div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          {projects.length} proyectos
        </h1>
        <div className="mt-2 flex flex-wrap gap-2 font-mono text-2xs uppercase tracking-widest-srs">
          {Object.entries(byType).map(([t, n]) => (
            <span
              key={t}
              className="bg-surface-raised rounded-sm px-2 py-0.5 text-text-secondary"
            >
              {t} · {n}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-surface-raised accent-bar rounded-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-surface-border bg-surface-overlay label-caps">
          <div className="col-span-4">Code / Título</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Pattern</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Target sites</div>
        </div>
        <div className="divide-y divide-surface-border">
          {loading && <EmptyRow text="cargando…" />}
          {!loading && projects.length === 0 && <EmptyRow text="— sin proyectos —" />}
          {projects.map((p, i) => (
            <Link
              key={p.id}
              to={`/srs/projects/${p.id}`}
              className="stagger-item grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-surface-overlay/60 transition-colors duration-fast items-center"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="col-span-4 min-w-0">
                <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                  {p.code}
                </div>
                <div className="font-body text-sm text-text-primary truncate">
                  {p.title}
                </div>
              </div>
              <div className="col-span-2 font-mono text-2xs uppercase tracking-widest-srs text-text-secondary">
                {p.type}
              </div>
              <div className="col-span-2 font-mono text-2xs uppercase tracking-widest-srs text-text-secondary">
                {p.delivery_pattern}
              </div>
              <div className="col-span-2">
                <ProjectStatusBadge status={p.status} />
              </div>
              <div className="col-span-2 text-right font-mono text-sm text-text-primary">
                {p.total_sites_target ?? "—"}
              </div>
            </Link>
          ))}
        </div>
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
