/**
 * useTechsOnDuty — fuente real para "Técnicos en pista"
 *
 * Cruza /api/work-orders + /api/users + /api/sites para devolver SOLO
 * los técnicos que tienen una WO activa con presencia de campo:
 *   status ∈ { dispatched, en_route, on_site }
 *   assigned_tech_user_id != null
 *
 * Reemplaza el array hardcoded TECHS_IN_STRIP que mostraba siempre los
 * mismos 5 nombres independientemente de si estaban realmente en pista.
 *
 * Returns:
 *   { loading, error, items, reload }
 *
 *   items: Array<{
 *     techId, techName, employmentType,
 *     woId, woCode, woTitle, woStatus, woReference,
 *     siteId, siteName,
 *     orgId,
 *   }>
 *
 * Si no hay ninguno: items === []  (empty state es decisión del consumer).
 *
 * Refresca cada 60s mientras esté montado, configurable.
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { formatWoCode } from "./woCode";

// Status que cuentan como "tech físicamente involucrado en intervención"
// dispatched = asignado y en marcha
// en_route   = en camino al sitio
// on_site    = ya en el sitio
export const ON_DUTY_STATUSES = new Set(["dispatched", "en_route", "on_site"]);

export function useTechsOnDuty({ pollMs = 60000 } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // 3 calls en paralelo. swallow individual failures: si users falla pero WOs ok,
      // todavía podemos pintar algo mínimo.
      const [wosRes, usersRes, sitesRes] = await Promise.allSettled([
        api.get("/work-orders?limit=200"),
        api.get("/users"),
        api.get("/sites"),
      ]);

      const wos = wosRes.status === "fulfilled" ? wosRes.value || [] : [];
      const users = usersRes.status === "fulfilled" ? usersRes.value || [] : [];
      const sites = sitesRes.status === "fulfilled" ? sitesRes.value || [] : [];

      const userById = new Map(users.map((u) => [u.id, u]));
      const siteById = new Map(sites.map((s) => [s.id, s]));

      const onDuty = wos
        .filter((w) => ON_DUTY_STATUSES.has(w.status) && w.assigned_tech_user_id)
        .map((w) => {
          const u = userById.get(w.assigned_tech_user_id);
          const s = siteById.get(w.site_id);
          // sin user resolvable → fallback name "Técnico" para no esconder el WO
          const techName = u?.full_name || (u?.email ? u.email.split("@")[0] : "Técnico");
          return {
            techId: w.assigned_tech_user_id,
            techName,
            employmentType: u?.employment_type || null,
            woId: w.id,
            woCode: formatWoCode(w),
            woTitle: w.title || "—",
            woStatus: w.status,
            woReference: w.reference || null,
            siteId: w.site_id,
            siteName: s?.name || "—",
            orgId: w.organization_id,
          };
        });

      // Si un mismo tech tiene >1 WO activa, dedup por techId (queda la primera,
      // que en backend viene ordenada por created_at desc → la más reciente).
      const seen = new Set();
      const deduped = [];
      for (const x of onDuty) {
        if (seen.has(x.techId)) continue;
        seen.add(x.techId);
        deduped.push(x);
      }

      setItems(deduped);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (!pollMs) return;
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  return { loading, error, items, reload: load };
}
