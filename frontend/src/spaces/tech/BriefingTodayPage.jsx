/**
 * Tech Briefings today — vista consolidada de briefings de mis WOs activos.
 * Muestra estado por WO: no hay briefing / assembled (ack pendiente) /
 * acknowledged. Desde aqui el tech tapea y va al WO detail a leer + ack.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { SeverityBadge, StatusBadge, formatAge } from "../../components/ui/Badges";

export default function BriefingTodayPage() {
  const { user } = useAuth();
  const { data: wos, loading } = useFetch("/work-orders?limit=200");
  const [briefings, setBriefings] = useState({});
  const [loadingBriefings, setLoadingBriefings] = useState(false);

  const myActive = useMemo(() => {
    if (!wos) return [];
    return wos.filter(
      (w) =>
        w.assigned_tech_user_id === user?.id &&
        !["closed", "cancelled"].includes(w.status)
    );
  }, [wos, user]);

  useEffect(() => {
    if (!myActive.length) return;
    let alive = true;
    setLoadingBriefings(true);
    Promise.all(
      myActive.map((w) =>
        api
          .get(`/work-orders/${w.id}/briefing`)
          .then((b) => [w.id, b])
          .catch(() => [w.id, null])
      )
    ).then((entries) => {
      if (!alive) return;
      const m = {};
      for (const [k, v] of entries) m[k] = v;
      setBriefings(m);
      setLoadingBriefings(false);
    });
    return () => {
      alive = false;
    };
  }, [myActive]);

  return (
    <div>
      <div className="accent-bar pl-3 mb-5">
        <div className="label-caps text-text-secondary">Briefings</div>
        <h1 className="font-display text-xl text-text-primary leading-tight">
          Hoy · {myActive.length} activa{myActive.length === 1 ? "" : "s"}
        </h1>
        <p className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-1">
          Leer antes de en_route · Decision #8
        </p>
      </div>

      {loading && <Empty text="cargando…" />}
      {!loading && myActive.length === 0 && (
        <Empty text="— sin trabajos activos —" />
      )}

      <div className="space-y-3">
        {myActive.map((w) => (
          <BriefingCard
            key={w.id}
            wo={w}
            briefing={briefings[w.id]}
            loading={loadingBriefings}
          />
        ))}
      </div>
    </div>
  );
}

function BriefingCard({ wo, briefing, loading }) {
  const exists = briefing?.exists;
  const acked = exists && briefing.status === "acknowledged";
  const assembled = exists && briefing.status === "assembled";

  const statusPill = loading
    ? { tint: "text-text-tertiary", bg: "bg-text-tertiary", label: "..." }
    : !exists
    ? {
        tint: "text-text-tertiary",
        bg: "bg-text-tertiary",
        label: "sin briefing",
      }
    : acked
    ? { tint: "text-success", bg: "bg-success", label: "acknowledged" }
    : {
        tint: "text-warning",
        bg: "bg-warning",
        label: "read + ack pendiente",
      };

  return (
    <Link
      to={`/tech/ops/${wo.id}`}
      className="block bg-surface-raised accent-bar rounded-md p-4 hover:bg-surface-overlay/50 active:bg-surface-overlay/70 transition-colors duration-fast"
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

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <StatusBadge status={wo.status} />
        <span
          className={`flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest-srs ${statusPill.tint}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusPill.bg}`} />
          {statusPill.label}
        </span>
        {assembled && briefing.assembled_at && (
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            · assembled {formatAge(briefing.assembled_at)} ago
          </span>
        )}
        {acked && briefing.acknowledged_at && (
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            · acked {formatAge(briefing.acknowledged_at)} ago
          </span>
        )}
      </div>

      {assembled && briefing.coordinator_notes && (
        <div className="mt-2 bg-surface-base rounded-sm px-3 py-2">
          <div className="label-caps mb-0.5">Nota del coord</div>
          <div className="font-body text-sm text-text-primary line-clamp-2">
            {briefing.coordinator_notes}
          </div>
        </div>
      )}
    </Link>
  );
}

function Empty({ text }) {
  return (
    <div className="bg-surface-raised rounded-md p-5 font-body text-text-secondary text-center">
      {text}
    </div>
  );
}
