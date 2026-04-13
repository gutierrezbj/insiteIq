import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "../api/client";

const REFRESH_INTERVAL = 30_000; // 30 seconds

/**
 * Single source of truth for all operational data.
 * Used by both OpsCockpit and OpsMap views.
 * Auto-refreshes every 30s.
 */
export function useOpsData() {
  const [data, setData] = useState({
    today: null,
    stats: null,
    sla: null,
    workforce: null,
    compliance: null,
    interventions: [],
    sites: [],
    technicians: [],
    teamMembers: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [today, stats, sla, workforce, compliance, interventions, sites, technicians, teamMembers] =
        await Promise.allSettled([
          api.get("/dashboard/today"),
          api.get("/dashboard/stats"),
          api.get("/dashboard/sla"),
          api.get("/dashboard/workforce"),
          api.get("/dashboard/compliance"),
          api.get("/interventions"),
          api.get("/sites"),
          api.get("/technicians"),
          api.get("/team/active"),
        ]);

      setData({
        today: today.status === "fulfilled" ? today.value?.data : null,
        stats: stats.status === "fulfilled" ? stats.value?.data : null,
        sla: sla.status === "fulfilled" ? sla.value?.data : null,
        workforce: workforce.status === "fulfilled" ? workforce.value : null,
        compliance: compliance.status === "fulfilled" ? compliance.value?.data : null,
        interventions: interventions.status === "fulfilled" ? interventions.value?.data || [] : [],
        sites: sites.status === "fulfilled" ? sites.value?.data || [] : [],
        technicians: technicians.status === "fulfilled" ? technicians.value?.data || [] : [],
        teamMembers: teamMembers.status === "fulfilled" ? teamMembers.value?.data || [] : [],
      });
      setLastRefresh(Date.now());
    } catch (e) {
      console.error("[OpsData] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAll]);

  /* ── Derived data ───────────────────────────────────────────────── */
  const activeInterventions = useMemo(() => {
    const active = data.interventions.filter((i) =>
      ["assigned", "accepted", "en_route", "on_site", "in_progress"].includes(i.status)
    );
    const po = { emergency: 0, high: 1, normal: 2, low: 3 };
    const so = { in_progress: 0, on_site: 1, en_route: 2, accepted: 3, assigned: 4 };
    return active.sort(
      (a, b) => (po[a.priority] ?? 9) - (po[b.priority] ?? 9) || (so[a.status] ?? 9) - (so[b.status] ?? 9)
    );
  }, [data.interventions]);

  const completedInterventions = useMemo(
    () => data.interventions.filter((i) => i.status === "completed"),
    [data.interventions]
  );

  const escalation = useMemo(() => {
    let breach = 0, crit = 0, risk = 0;
    const now = Date.now();
    activeInterventions.forEach((i) => {
      if (!i.sla?.resolution_minutes || !i.sla?.started_at) return;
      const started = new Date(i.sla.started_at).getTime();
      const budget = i.sla.resolution_minutes * 60000;
      const pct = ((now - started) / budget) * 100;
      if (pct >= 100) breach++;
      else if (pct >= 90) crit++;
      else if (pct >= 75) risk++;
    });
    return { breach, crit, risk, total: breach + crit + risk };
  }, [activeInterventions]);

  return {
    ...data,
    loading,
    lastRefresh,
    refresh: fetchAll,
    activeInterventions,
    completedInterventions,
    escalation,
  };
}
