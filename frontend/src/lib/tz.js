/**
 * Timezone-aware helpers — Design System v1.7 §3.6a
 *
 * Regla obligatoria cross-vista: cualquier UI que muestre una persona
 * junto con un timestamp debe mostrar su hora local + estado laboral +
 * contraste con la hora del viewer. Implementación del Principio #8 del
 * Blueprint v1.1: "si el cliente regaña con razón Y el tech nos salva
 * de memoria, el sistema falló dos veces".
 *
 * Zero dependencies — usa Intl.DateTimeFormat nativo.
 */

export const VIEWER_TZ = "Europe/Madrid";
export const VIEWER_TZ_LABEL = "Madrid";

/**
 * Registry de técnicos con zona horaria y horario laboral.
 * TODO(fase Zeta): mover a backend y exponer via /api/users con campos
 * `tz` + `work_start` + `work_end`. Por ahora registro local en frontend.
 */
export const TECH_REGISTRY = {
  "Agustin Rivera": { tz: "America/New_York", tzLabel: "NY", workStart: 9, workEnd: 18 },
  "Agustín C.":      { tz: "Europe/Madrid",    tzLabel: "Madrid", workStart: 8, workEnd: 19 },
  "Hugo Q.":         { tz: "Europe/Madrid",    tzLabel: "Madrid", workStart: 8, workEnd: 19 },
  "Arlindo O.":      { tz: "Europe/Madrid",    tzLabel: "Madrid", workStart: 8, workEnd: 19 },
  "Luis S.":         { tz: "America/Lima",     tzLabel: "Lima",   workStart: 8, workEnd: 17 },
  "Yunus H.":        { tz: "Europe/London",    tzLabel: "London", workStart: 9, workEnd: 18 },
};

/**
 * @typedef {'onduty' | 'afterhours' | 'starting' | 'sleeping' | 'weekend'} LaborStatus
 */

const STATUS_COLOR = {
  onduty:     "#22C55E",
  afterhours: "#F59E0B",
  starting:   "#06B6D4",
  sleeping:   "#DC2626",
  weekend:    "#6B7280",
};

const STATUS_LABEL = {
  onduty:     "EN HORARIO",
  afterhours: "POST-HORARIO",
  starting:   "INICIANDO JORNADA",
  sleeping:   "NO MOLESTAR · DURMIENDO",
  weekend:    "FIN DE SEMANA · NO MOLESTAR",
};

/**
 * Calcula hora local + estado laboral + offset de un tech.
 * @param {string} techName — key del TECH_REGISTRY
 * @param {string} [viewerTz] — opcional, default VIEWER_TZ
 * @returns {null | {techTime, viewerTime, status, label, color, offsetText, diffHours, tzLabel, untilEndOfDay}}
 */
export function getTechTimeInfo(techName, viewerTz = VIEWER_TZ) {
  const meta = TECH_REGISTRY[techName];
  if (!meta) return null;

  const now = new Date();
  const fmt = (tz) =>
    new Intl.DateTimeFormat("es-ES", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(now);

  const hourOnly = (tz) =>
    parseInt(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hour: "2-digit", hour12: false,
      }).format(now),
      10
    );

  const weekdayOf = (tz) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, weekday: "short",
    }).format(now);

  const techTime = fmt(meta.tz);
  const viewerTime = fmt(viewerTz);
  const techHour = hourOnly(meta.tz);
  const techMinute = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: meta.tz, minute: "2-digit", hour12: false,
    }).format(now),
    10
  );
  const isWeekend = ["Sat", "Sun"].includes(weekdayOf(meta.tz));

  let status;
  if (isWeekend) status = "weekend";
  else if (techHour >= meta.workStart && techHour < meta.workEnd) status = "onduty";
  else if (techHour >= meta.workEnd && techHour < 22) status = "afterhours";
  else if (techHour >= 22 || techHour < 6) status = "sleeping";
  else status = "starting";

  // Offset vs viewer
  const techOffsetDate = new Date(now.toLocaleString("en-US", { timeZone: meta.tz }));
  const viewerOffsetDate = new Date(now.toLocaleString("en-US", { timeZone: viewerTz }));
  const diffHours = Math.round((techOffsetDate - viewerOffsetDate) / 3600000);
  const offsetText =
    diffHours === 0 ? "misma hora que tú"
      : diffHours > 0 ? `+${diffHours}h de ti`
      : `${diffHours}h de ti`;

  // Tiempo hasta fin de jornada (solo on-duty)
  let untilEndOfDay = null;
  if (status === "onduty") {
    const minutesToEnd = (meta.workEnd - techHour) * 60 - techMinute;
    const h = Math.floor(minutesToEnd / 60);
    const m = minutesToEnd % 60;
    untilEndOfDay = h > 0 ? `${h}h ${m}min` : `${m}min`;
  }

  return {
    techTime,
    viewerTime,
    status,
    label: STATUS_LABEL[status],
    color: STATUS_COLOR[status],
    offsetText,
    diffHours,
    tzLabel: meta.tzLabel,
    untilEndOfDay,
    shouldNotDisturb: status === "sleeping" || status === "weekend",
  };
}

/**
 * Helper para formatear la hora actual en una zona específica.
 * Útil para el BottomStrip con varios techs.
 */
export function getCurrentTimeIn(tz) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());
}
