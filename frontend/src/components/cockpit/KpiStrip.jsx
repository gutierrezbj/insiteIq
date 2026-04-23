/**
 * KpiStrip · row of 4-5 KPI tiles for the cockpit header.
 * Computes from /insights/dashboard (SRS-wide) + /alerts/active/summary.
 * For client scope: computes over WOs visible to the user + alerts scoped.
 */
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

function KpiTile({ label, value, sub, tone = "neutral" }) {
  const toneCls =
    tone === "danger"
      ? "border-danger/50 bg-danger/5"
      : tone === "warn"
      ? "border-primary/50 bg-primary/5"
      : tone === "success"
      ? "border-success/40 bg-success/5"
      : "border-surface-border bg-surface-overlay/40";
  return (
    <div className={`rounded-md border px-4 py-3 ${toneCls}`}>
      <div className="label-caps mb-1">{label}</div>
      <div className="font-display text-2xl text-text-primary leading-none tracking-tight">
        {value}
      </div>
      {sub && (
        <div className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary mt-1">
          {sub}
        </div>
      )}
    </div>
  );
}

export default function KpiStrip({ isSrs = false }) {
  const [data, setData] = useState({
    active: "—",
    at_risk: "—",
    after_hours: "—",
    alerts_crit: "—",
    alerts_warn: "—",
  });

  async function load() {
    try {
      const [woList, alertSummary] = await Promise.all([
        api.get("/work-orders?limit=500"),
        api.get("/alerts/active/summary"),
      ]);
      const items = Array.isArray(woList) ? woList : woList?.items || [];
      const active = items.filter((w) =>
        ["assigned", "dispatched", "in_progress", "in_closeout"].includes(w.status)
      ).length;
      const atRisk = items.filter((w) => {
        // heuristic: ball_in_court "since" > 6h or explicit at_risk flag
        if (w.at_risk) return true;
        const since = w?.ball_in_court?.since;
        if (!since) return false;
        const ageH = (Date.now() - new Date(since).getTime()) / 36e5;
        return ageH > 6;
      }).length;
      const afterHours = items.filter((w) => w.after_hours).length;
      setData({
        active,
        at_risk: atRisk,
        after_hours: afterHours,
        alerts_crit: alertSummary.counts.critical,
        alerts_warn: alertSummary.counts.warning,
      });
    } catch (e) {
      // keep previous
    }
  }

  useEffect(() => {
    load();
    const int = setInterval(load, 45000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <KpiTile
        label="Intervenciones activas"
        value={data.active}
        sub="assigned · dispatched · in_progress"
      />
      <KpiTile
        label="En riesgo"
        value={data.at_risk}
        sub="ball stuck > 6h"
        tone={typeof data.at_risk === "number" && data.at_risk > 0 ? "warn" : "neutral"}
      />
      <KpiTile
        label="After-hours"
        value={data.after_hours}
        sub="nocturnas / fin-semana"
      />
      <KpiTile
        label="Alertas criticas"
        value={data.alerts_crit}
        tone={
          typeof data.alerts_crit === "number" && data.alerts_crit > 0
            ? "danger"
            : "neutral"
        }
        sub={isSrs ? "tenant-wide" : "en tu operacion"}
      />
      <KpiTile
        label="Alertas warning"
        value={data.alerts_warn}
        tone={
          typeof data.alerts_warn === "number" && data.alerts_warn > 0
            ? "warn"
            : "neutral"
        }
      />
    </div>
  );
}
