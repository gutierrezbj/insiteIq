/**
 * Client Home — Fase 2 plumbing.
 * Hotel 5 estrellas personality: clean, professional, zero internal noise.
 * No audit_log, no internal threads, no coordinator details. Only output.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useFetch } from "../../lib/useFetch";
import {
  ProjectStatusBadge,
  StatusBadge,
} from "../../components/ui/Badges";

export default function ClientHome() {
  const { user } = useAuth();
  const { data: projects } = useFetch("/projects");
  const { data: workOrders } = useFetch("/work-orders?limit=100");

  const projs = projects || [];
  const wos = workOrders || [];

  const activeWOs = useMemo(
    () => wos.filter((w) => !["closed", "cancelled"].includes(w.status)),
    [wos]
  );

  return (
    <div>
      {/* Header */}
      <div className="accent-bar pl-4 mb-8">
        <div className="label-caps">Status</div>
        <h1 className="font-display text-3xl text-text-primary leading-tight">
          {user?.full_name?.split(" ")[0] || "Cliente"}
        </h1>
        <p className="font-body text-text-secondary mt-1">
          Tus engagements con SRS · updates en tiempo real
        </p>
      </div>

      {/* Active snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <SnapshotCard label="Proyectos activos" value={projs.length} />
        <SnapshotCard label="Intervenciones activas" value={activeWOs.length} />
        <SnapshotCard
          label="Acciones pendientes"
          value={
            wos.filter((w) => w.ball_in_court?.side === "client" && w.status === "resolved")
              .length
          }
          hint="esperando tu sign-off"
        />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <div className="label-caps mb-3">Proyectos</div>
          <div className="bg-surface-raised rounded-md divide-y divide-surface-border">
            {projs.length === 0 && (
              <div className="px-4 py-6 font-body text-sm text-text-tertiary">
                — sin proyectos activos —
              </div>
            )}
            {projs.map((p) => (
              <div key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                      {p.code}
                    </div>
                    <div className="font-body text-sm text-text-primary truncate">
                      {p.title}
                    </div>
                  </div>
                  <ProjectStatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="label-caps mb-3">Intervenciones recientes</div>
          <div className="bg-surface-raised rounded-md divide-y divide-surface-border">
            {wos.length === 0 && (
              <div className="px-4 py-6 font-body text-sm text-text-tertiary">
                — ninguna registrada —
              </div>
            )}
            {wos.slice(0, 10).map((w) => (
              <Link
                key={w.id}
                to={`/client/ops/${w.id}`}
                className="block px-4 py-3 hover:bg-surface-overlay/60 transition-colors duration-fast"
              >
                <div className="flex items-center justify-between gap-3">
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
              </Link>
            ))}
          </div>
        </section>
      </div>

      <p className="mt-8 text-text-tertiary font-mono text-2xs uppercase tracking-widest-srs">
        Vista cliente · detalles operativos internos no se exponen aqui
      </p>
    </div>
  );
}

function SnapshotCard({ label, value, hint }) {
  return (
    <div className="bg-surface-raised rounded-md px-4 py-3">
      <div className="label-caps mb-1">{label}</div>
      <div className="font-display text-3xl text-text-primary leading-none">
        {value}
      </div>
      {hint && (
        <div className="font-body text-2xs text-text-tertiary mt-1.5">{hint}</div>
      )}
    </div>
  );
}
