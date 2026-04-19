/**
 * EquipmentSection — Plan vs Scan reconciliation por project (Modo 2 Decision #4).
 *
 * Resuelve el caos upstream (Excel cliente / email / portal / scan tech)
 * corriendolo contra la realidad scaneada on-site. 5 estatus de cierre:
 *
 *   match        planned serial scaneado en el site correcto
 *   substituted  planned no encontrado, pero equivalente make+model scaneado
 *   missing      planned pero nadie lo escaneo
 *   sin_plan     scaneado sin plan (bonus / equipamiento no declarado)
 *   conflicto    planned para site A, scaneado en site B
 */
import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import ActionDialog from "../ui/ActionDialog";
import { formatAge } from "../ui/Badges";

const STATUS_LOOK = {
  planned: {
    dot: "bg-text-tertiary",
    text: "text-text-tertiary",
    label: "planned",
  },
  match: {
    dot: "bg-success",
    text: "text-success",
    label: "match",
  },
  substituted: {
    dot: "bg-info",
    text: "text-info",
    label: "substituted",
  },
  missing: {
    dot: "bg-warning",
    text: "text-warning",
    label: "missing",
  },
  sin_plan: {
    dot: "bg-primary",
    text: "text-primary-light",
    label: "sin plan",
  },
  conflicto: {
    dot: "bg-danger",
    text: "text-danger",
    label: "conflicto",
  },
};

const COUNT_ORDER = ["match", "substituted", "missing", "conflicto", "sin_plan", "planned"];

export default function EquipmentSection({ project, isSrs }) {
  const { data, loading, error, reload } = useFetch(
    `/projects/${project.id}/reconciliation`,
    { deps: [project.id] }
  );

  // Nothing to show for non-rollout projects without plan entries
  const planEntries = data?.plan_entries || [];
  const counts = data?.counts || {};
  const isRollout = project.type === "rollout";

  if (!isRollout && planEntries.length === 0) return null;

  const lastReconciledAt = useMemo(() => {
    if (!planEntries.length) return null;
    let max = null;
    for (const pe of planEntries) {
      if (pe.reconciled_at) {
        const t = new Date(pe.reconciled_at).getTime();
        if (!isNaN(t) && (max == null || t > max)) max = t;
      }
    }
    return max ? new Date(max).toISOString() : null;
  }, [planEntries]);

  return (
    <section className="bg-surface-raised accent-bar rounded-sm">
      <header className="px-4 py-3 border-b border-surface-border flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="label-caps">Equipment · plan vs scan</div>
          <h2 className="font-display text-base text-text-primary leading-tight">
            {planEntries.length} item{planEntries.length === 1 ? "" : "s"} planeado
            {planEntries.length === 1 ? "" : "s"}
            {lastReconciledAt && (
              <span className="ml-2 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                · reconciled {formatAge(lastReconciledAt)} ago
              </span>
            )}
          </h2>
        </div>
        {isSrs && <ReconcileAction project={project} reload={reload} />}
      </header>

      {/* Counts strip */}
      <div className="px-4 py-3 border-b border-surface-border flex flex-wrap gap-3">
        {COUNT_ORDER.filter((k) => (counts[k] || 0) > 0).map((k) => (
          <CountPill key={k} status={k} count={counts[k]} />
        ))}
        {Object.keys(counts).length === 0 && (
          <div className="font-body text-sm text-text-tertiary">
            — sin plan entries todavia —
          </div>
        )}
      </div>

      {/* Table */}
      {planEntries.length > 0 && (
        <div>
          <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-surface-border text-text-tertiary">
            <div className="col-span-2 label-caps">Status</div>
            <div className="col-span-3 label-caps">Serial</div>
            <div className="col-span-3 label-caps">Make / Model</div>
            <div className="col-span-2 label-caps">Site</div>
            <div className="col-span-2 label-caps text-right">Source</div>
          </div>
          <div className="divide-y divide-surface-border max-h-[60vh] overflow-y-auto">
            {planEntries.map((pe) => (
              <PlanRow key={pe.id} pe={pe} />
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="px-4 py-3 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          cargando…
        </div>
      )}
      {error && (
        <div className="px-4 py-3 font-body text-sm text-danger">
          error · {error.message}
        </div>
      )}
    </section>
  );
}

function CountPill({ status, count }) {
  const look = STATUS_LOOK[status] || STATUS_LOOK.planned;
  return (
    <div className="bg-surface-base rounded-sm px-3 py-2 flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${look.dot}`} />
      <div>
        <div className={`font-mono text-2xs uppercase tracking-widest-srs ${look.text}`}>
          {look.label}
        </div>
        <div className="font-display text-base text-text-primary leading-none">
          {count}
        </div>
      </div>
    </div>
  );
}

function PlanRow({ pe }) {
  const look = STATUS_LOOK[pe.status] || STATUS_LOOK.planned;
  const makeModel = [pe.make, pe.model].filter(Boolean).join(" · ") || "—";
  return (
    <div className="grid grid-cols-12 gap-3 px-4 py-2.5 items-start">
      <div className="col-span-2 flex items-center gap-1.5 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full ${look.dot}`} />
        <span className={`font-mono text-2xs uppercase tracking-widest-srs ${look.text} truncate`}>
          {look.label}
        </span>
      </div>
      <div className="col-span-3 min-w-0">
        <div className="font-mono text-sm text-text-primary truncate">
          {pe.serial_number || <span className="text-text-tertiary">—</span>}
        </div>
        {pe.asset_tag && (
          <div className="font-mono text-2xs text-text-tertiary truncate">
            tag {pe.asset_tag}
          </div>
        )}
      </div>
      <div className="col-span-3 min-w-0">
        <div className="font-body text-sm text-text-primary truncate">
          {makeModel}
        </div>
        {pe.category && (
          <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {pe.category}
          </div>
        )}
      </div>
      <div className="col-span-2 min-w-0">
        <div className="font-mono text-2xs text-text-secondary truncate">
          {pe.site_id ? shortId(pe.site_id) : <span className="text-text-tertiary">—</span>}
        </div>
        {pe.reconciled_at && (
          <div className="font-mono text-2xs text-text-tertiary">
            {formatAge(pe.reconciled_at)} ago
          </div>
        )}
      </div>
      <div className="col-span-2 text-right min-w-0">
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          {pe.source || "—"}
        </div>
        {pe.reconciliation_note && (
          <div className="font-body text-2xs text-text-tertiary mt-0.5">
            {pe.reconciliation_note}
          </div>
        )}
      </div>
    </div>
  );
}

function ReconcileAction({ project, reload }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);

  async function submit() {
    const r = await api.post(`/projects/${project.id}/reconcile`, {});
    setResult(r);
    reload();
  }

  function close() {
    setOpen(false);
    setResult(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
      >
        Run reconcile
      </button>
      <ActionDialog
        open={open}
        onClose={close}
        title="Run reconciliation"
        subtitle="Plan (Excel/email/portal) vs scans on-site. Produce match / substituted / missing / sin_plan / conflicto."
        submitLabel={result ? "Cerrar" : "Reconcile"}
        onSubmit={result ? close : submit}
      >
        {!result && (
          <p className="font-body text-sm text-text-secondary">
            Este calculo no es destructivo: actualiza status + reconciled_with
            en cada plan entry. Corre tantas veces como quieras conforme
            el tech va haciendo scans.
          </p>
        )}
        {result && (
          <div className="space-y-3">
            <div className="font-body text-sm text-text-primary">
              Reconciliation completada con {result.plan_count} planned ·{" "}
              {result.scan_count} scanned.
            </div>
            <div className="flex flex-wrap gap-2">
              {COUNT_ORDER.filter((k) => (result.counts?.[k] || 0) > 0).map((k) => (
                <CountPill key={k} status={k} count={result.counts[k]} />
              ))}
            </div>
            <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              {result.sin_plan_asset_ids?.length || 0} asset{(result.sin_plan_asset_ids?.length || 0) === 1 ? "" : "s"} sin_plan
              registrados
            </div>
          </div>
        )}
      </ActionDialog>
    </>
  );
}

function shortId(id) {
  if (!id) return "—";
  if (id.length > 14) return `${id.slice(0, 6)}…${id.slice(-4)}`;
  return id;
}
