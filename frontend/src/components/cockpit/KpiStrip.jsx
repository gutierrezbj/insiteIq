/**
 * KpiStrip · los 5 KPIs que un gerente de operaciones de campo mira
 * al abrir la app a las 8am.
 *
 * Recibe data pre-cargada desde CockpitPage · no fetch propio
 * para evitar duplicar requests con OperationsMap / cards.
 */
import { useMemo } from "react";

function KpiTile({ label, value, sub, tone = "neutral", onClick }) {
  const borderCls =
    tone === "danger"
      ? "border-l-[3px] border-l-danger"
      : tone === "warn"
      ? "border-l-[3px] border-l-primary"
      : "border-l-[3px] border-l-surface-border";
  const valueCls =
    tone === "danger" ? "text-danger"
    : tone === "warn" ? "text-primary-light"
    : "text-text-primary";
  const Base = onClick ? "button" : "div";
  return (
    <Base
      onClick={onClick}
      className={`${borderCls} bg-surface-raised hover:bg-surface-overlay/60 rounded-sm px-4 py-3 text-left transition-colors duration-fast w-full`}
    >
      <div className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary leading-tight">
        {label}
      </div>
      <div className={`font-display text-3xl leading-none mt-1 tabular-nums ${valueCls}`}>
        {value}
      </div>
      {sub && (
        <div className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary mt-1.5 leading-tight">
          {sub}
        </div>
      )}
    </Base>
  );
}

function isActiveStatus(status) {
  return ["assigned", "dispatched", "in_progress", "in_closeout", "en_route", "on_site"].includes(status);
}

export default function KpiStrip({ workOrders = [], alerts = [] }) {
  const stats = useMemo(() => {
    const now = Date.now();
    const h = (ms) => (now - new Date(ms).getTime()) / 36e5;
    const active = workOrders.filter((w) => isActiveStatus(w.status));

    const criticals = active.filter((w) => w.severity === "critical").length;

    // SLA @ riesgo próximas 2h. Heurística: activas con ball stuck > 4h
    // (SLA breach inminente). Cuando exista sla_deadline real, mejoramos.
    const slaRisk = active.filter((w) => {
      const since = w?.ball_in_court?.since;
      if (!since) return false;
      const age = h(since);
      return age > 4 && age < 10;
    }).length;

    const ballSrs6h = active.filter((w) => {
      if (w?.ball_in_court?.side !== "srs") return false;
      const since = w?.ball_in_court?.since;
      if (!since) return false;
      return h(since) > 6;
    }).length;

    const unassigned = active.filter(
      (w) => !w.assigned_tech_user_id && !w.assignment?.tech_user_id
    ).length;

    // After-hours hoy: activas con after_hours=true y created_at hoy UTC
    const todayUTC = new Date().toISOString().slice(0, 10);
    const afterHours = active.filter(
      (w) => w.after_hours && (w.created_at || "").slice(0, 10) === todayUTC
    ).length;

    return { criticals, slaRisk, ballSrs6h, unassigned, afterHours };
  }, [workOrders]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      <KpiTile
        label="Criticos abiertos"
        value={stats.criticals}
        tone={stats.criticals > 0 ? "danger" : "neutral"}
        sub="severity critical · activos"
      />
      <KpiTile
        label="SLA @ riesgo"
        value={stats.slaRisk}
        tone={stats.slaRisk > 0 ? "warn" : "neutral"}
        sub="ball stuck 4-10h"
      />
      <KpiTile
        label="Ball SRS >6h"
        value={stats.ballSrs6h}
        tone={stats.ballSrs6h > 0 ? "warn" : "neutral"}
        sub="pendiente accion nuestra"
      />
      <KpiTile
        label="Sin asignar"
        value={stats.unassigned}
        tone={stats.unassigned > 0 ? "warn" : "neutral"}
        sub="activa sin tech"
      />
      <KpiTile
        label="After-hours hoy"
        value={stats.afterHours}
        tone="neutral"
        sub="nocturnas / fin-semana"
      />
    </div>
  );
}
