/**
 * Tech Home — Fase 2 plumbing.
 * Cirujano de campo personality: alto contraste, grandes touch targets,
 * todo a la mano, estado claro por WO.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useFetch } from "../../lib/useFetch";
import { StatusBadge, SeverityBadge } from "../../components/ui/Badges";

export default function TechHome() {
  const { user } = useAuth();
  const { data: wos, loading } = useFetch("/work-orders?limit=100");

  const myWos = useMemo(() => {
    if (!wos) return { active: [], done: [] };
    const mine = wos.filter((w) => w.assigned_tech_user_id === user?.id);
    const active = mine.filter(
      (w) => !["closed", "cancelled"].includes(w.status)
    );
    const done = mine.filter((w) =>
      ["closed", "cancelled"].includes(w.status)
    );
    return { active, done };
  }, [wos, user]);

  return (
    <div>
      {/* Header */}
      <div className="accent-bar pl-3 mb-5">
        <div className="label-caps text-text-secondary">Trabajos</div>
        <h1 className="font-display text-xl text-text-primary leading-tight">
          {myWos.active.length} activos
        </h1>
      </div>

      {/* Active jobs — prominent */}
      {myWos.active.length === 0 && !loading && (
        <div className="bg-surface-raised rounded-md p-5 font-body text-text-secondary">
          No tienes trabajos activos asignados ahora mismo.
        </div>
      )}

      <div className="space-y-3 mb-6">
        {myWos.active.map((w) => (
          <ActiveJobCard key={w.id} wo={w} />
        ))}
      </div>

      {/* Done recent */}
      {myWos.done.length > 0 && (
        <section>
          <div className="label-caps mb-2">Historico reciente</div>
          <div className="bg-surface-raised rounded-md divide-y divide-surface-border">
            {myWos.done.slice(0, 5).map((w) => (
              <div key={w.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                      {w.reference}
                    </div>
                    <div className="font-body text-sm text-text-primary truncate">
                      {w.title}
                    </div>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 text-text-tertiary font-mono text-2xs uppercase tracking-widest-srs">
        PWA mode · actions pendientes Fase 4
      </p>
    </div>
  );
}

function ActiveJobCard({ wo }) {
  return (
    <Link
      to={`/tech/ops/${wo.id}`}
      className="block bg-surface-raised accent-bar rounded-md p-4 active:bg-surface-overlay/70 hover:bg-surface-overlay/50 transition-colors duration-fast"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              {wo.reference}
            </span>
            <SeverityBadge severity={wo.severity} />
          </div>
          <div className="font-display text-base text-text-primary leading-tight">
            {wo.title}
          </div>
        </div>
        <span className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light flex-shrink-0">
          →
        </span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <StatusBadge status={wo.status} />
        {wo.deadline_resolve_at && (
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            resolve in {formatDeadline(wo.deadline_resolve_at)}
          </span>
        )}
      </div>
    </Link>
  );
}

function formatDeadline(iso) {
  if (!iso) return "—";
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
