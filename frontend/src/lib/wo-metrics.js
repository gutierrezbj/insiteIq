/**
 * WO operational metrics helpers (Iter 2.63j · 2026-05-10).
 *
 * Derivados del feedback de Agustín (gerente operativo de campo):
 *   Q5 — desviación tiempo de llegada · "el tech llegó tarde?"
 *   Q6 — lapso del servicio · "cuántas horas consumió el tech onsite?"
 *   Q10 — horizonte de programación · "hasta qué fecha hay WOs programadas?"
 *
 * Backend Iter 2.63j agregó `status_timestamps` dict al modelo work_order
 * que se puebla automáticamente en advance() · esto permite calcular
 * deltas sin necesidad de ir a audit_log.
 *
 * Backward compat: WOs creadas antes de Iter 2.63j no tienen
 * status_timestamps. Helpers devuelven null y la UI usa fallback "—".
 */

/**
 * Drift de entrada en minutos · "cuánto tarde llegó el tech".
 *
 * @param {object} wo · WO doc del API
 * @returns {number|null} minutos · positivo = tarde · negativo = adelantado
 *   null si no hay scheduled_at o no hay timestamp de on_site
 */
export function driftMinutes(wo) {
  if (!wo) return null;
  const scheduled = wo.scheduled_at;
  const ts = wo.status_timestamps || {};
  const arrived = ts.on_site;
  if (!scheduled || !arrived) return null;
  const dMs = new Date(arrived).getTime() - new Date(scheduled).getTime();
  if (Number.isNaN(dMs)) return null;
  return Math.round(dMs / 60000);
}

/**
 * Tiempo on site del tech en minutos.
 * Prefiere `capture.time_on_site_minutes` (reportado por tech vía PWA).
 * Fallback: `status_timestamps.resolved - status_timestamps.on_site`.
 *
 * @param {object} wo
 * @param {object} [capture] · TechCapture doc del API si está disponible
 * @returns {number|null} minutos · null si no se puede calcular
 */
export function timeOnSiteMinutes(wo, capture) {
  if (capture && capture.time_on_site_minutes != null) {
    return capture.time_on_site_minutes;
  }
  if (!wo) return null;
  const ts = wo.status_timestamps || {};
  if (ts.on_site && ts.resolved) {
    const dMs = new Date(ts.resolved).getTime() - new Date(ts.on_site).getTime();
    if (!Number.isNaN(dMs)) return Math.round(dMs / 60000);
  }
  return null;
}

/**
 * Duración total del WO en minutos (creación → cierre).
 *
 * @param {object} wo
 * @returns {number|null}
 */
export function totalDurationMinutes(wo) {
  if (!wo) return null;
  const start = wo.created_at;
  const end = wo.closed_at;
  if (!start || !end) return null;
  const dMs = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(dMs)) return null;
  return Math.round(dMs / 60000);
}

/**
 * Formato humano de minutos · "12 min" / "1 h 34 min" / "2 d 5 h".
 *
 * @param {number|null} mins
 * @returns {string} formato humano, o "—" si null
 */
export function formatMinutes(mins) {
  if (mins == null || Number.isNaN(mins)) return "—";
  const abs = Math.abs(mins);
  if (abs < 60) return `${mins} min`;
  if (abs < 60 * 24) {
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    const sign = mins < 0 ? "-" : "";
    return m === 0 ? `${sign}${h} h` : `${sign}${h} h ${m} min`;
  }
  const d = Math.floor(abs / (60 * 24));
  const remMin = abs - d * 60 * 24;
  const h = Math.floor(remMin / 60);
  const sign = mins < 0 ? "-" : "";
  return h === 0 ? `${sign}${d} d` : `${sign}${d} d ${h} h`;
}

/**
 * Drift threshold severity (decision agente · valida owner si quiere ajustar).
 *
 * @param {number|null} mins
 * @returns {"ok" | "warn" | "danger" | "unknown"}
 *   <=15 ok · 16-45 warn (amber) · >45 danger (rojo) · null/early=unknown
 */
export function driftSeverity(mins) {
  if (mins == null) return "unknown";
  // Negativo = adelantado → ok (no es un problema)
  if (mins <= 15) return "ok";
  if (mins <= 45) return "warn";
  return "danger";
}

const DRIFT_COLORS = {
  ok:      { bg: "#D9F1E5", fg: "#0A6131" },
  warn:    { bg: "#FCF1DC", fg: "#7E5212" },
  danger:  { bg: "#FEF2F2", fg: "#991B1B" },
  unknown: { bg: "#F4F6F8", fg: "#8B95A8" },
};

export function driftColors(mins) {
  return DRIFT_COLORS[driftSeverity(mins)];
}

/**
 * Filtra WOs con scheduled_at dentro de los próximos N días.
 *
 * @param {Array} wos
 * @param {number} days
 * @returns {Array} WOs con scheduled_at en el rango (sort asc)
 */
export function scheduledNextDays(wos, days) {
  if (!Array.isArray(wos)) return [];
  const now = Date.now();
  const limit = now + days * 24 * 60 * 60 * 1000;
  return wos
    .filter((w) => {
      if (!w.scheduled_at) return false;
      const t = new Date(w.scheduled_at).getTime();
      return !Number.isNaN(t) && t >= now && t <= limit;
    })
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() -
        new Date(b.scheduled_at).getTime()
    );
}

/**
 * Última fecha programada (más lejana en el futuro).
 *
 * @param {Array} wos
 * @returns {Date|null}
 */
export function lastScheduledDate(wos) {
  if (!Array.isArray(wos)) return null;
  const future = wos
    .map((w) => w.scheduled_at && new Date(w.scheduled_at))
    .filter((d) => d && !Number.isNaN(d.getTime()) && d.getTime() > Date.now());
  if (future.length === 0) return null;
  return future.reduce((max, d) => (d > max ? d : max));
}
