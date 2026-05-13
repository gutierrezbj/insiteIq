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
 *
 * ─── Source of truth (Iter 2.63c) ─────────────────────────────────
 * Los campos tz / tz_label / role_title / display_name / work_start /
 * work_end ahora viven en `users` collection del backend. Las vistas
 * pasan el user object completo (ya viene de useFetch("/api/users"))
 * a getTechTimeInfo(user, viewerTz).
 *
 * TECH_REGISTRY local queda como **fallback** para call sites legacy
 * que solo tienen el `full_name` (e.g. cuando un WO viene serializado
 * con tech_name sin user_id). Cuando esos call sites se migren, se
 * elimina el registry.
 */

export const VIEWER_TZ = "Europe/Madrid";
export const VIEWER_TZ_LABEL = "Madrid";

/**
 * Fallback registry (legacy · usar user object del API cuando sea posible).
 *
 * Keys = `full_name` exacto del backend. Si un user del API trae sus
 * propios fields tz/tz_label/etc, esos ganan. Este const solo se consulta
 * cuando `getTechTimeInfo()` recibe un string (no un user object).
 */
export const TECH_REGISTRY = {
  "Agustin Rivera":   { displayName: "Agustin R",  tz: "America/New_York", tzLabel: "NY",         role: "Senior Consultant",    workStart: 9, workEnd: 18 },
  "Andros Briceño":   { displayName: "Andros B",   tz: "America/Montevideo", tzLabel: "Montevideo", role: "Project Manager",      workStart: 8, workEnd: 18 },
  "Adriana Bracho":   { displayName: "Adriana B",  tz: "Europe/Madrid",    tzLabel: "Madrid",     role: "Accountant",           workStart: 8, workEnd: 18 },
  "Hugo M Rodriguez": { displayName: "Hugo R",     tz: "Europe/Madrid",    tzLabel: "Madrid",     role: "Tech plantilla",       workStart: 8, workEnd: 19 },
  "Arlindo Ochoa":    { displayName: "Arlindo O",  tz: "America/New_York", tzLabel: "NY",         role: "Tech external sub",    workStart: 9, workEnd: 18 },
  "Luis Sánchez":     { displayName: "Luis S",     tz: "America/Lima",     tzLabel: "Lima",       role: "Field Consultant CET", workStart: 8, workEnd: 17 },
  "Yunus Hafesjee":   { displayName: "Yunus H",    tz: "Europe/London",    tzLabel: "London",     role: "Account Lead London",  workStart: 9, workEnd: 18 },
};

/**
 * Build a meta object from a user document from /api/users.
 * Normaliza snake_case (backend) → camelCase (lib/tz). Si el user
 * no trae fields tz, queda null y el caller decide qué hacer.
 *
 * @param {object} user — shape: { full_name, tz, tz_label, role_title, display_name, work_start, work_end }
 * @returns {object|null} meta normalizado o null si el user no tiene tz
 */
export function buildTechMetaFromUser(user) {
  if (!user || !user.tz) return null;
  return {
    tz: user.tz,
    tzLabel: user.tz_label || user.tz,
    role: user.role_title || null,
    displayName: user.display_name || user.full_name || null,
    workStart: user.work_start ?? 9,
    workEnd: user.work_end ?? 18,
  };
}

/**
 * Resolve meta: user object > TECH_REGISTRY fallback by name.
 *
 * @param {object|string} nameOrUser — user object (preferred) o full_name string (legacy)
 * @returns {object|null} meta o null si no se encuentra
 */
function resolveMeta(nameOrUser) {
  if (!nameOrUser) return null;
  if (typeof nameOrUser === "object") {
    const fromUser = buildTechMetaFromUser(nameOrUser);
    if (fromUser) return fromUser;
    // Si user object no trae tz, fallback al registry por nombre
    return TECH_REGISTRY[nameOrUser.full_name] || null;
  }
  // String — legacy lookup
  return TECH_REGISTRY[nameOrUser] || null;
}

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
 * Acepta tanto un user object del API (preferred · trae tz/tz_label/etc)
 * como un full_name string (legacy fallback que busca en TECH_REGISTRY).
 *
 * @param {object|string} nameOrUser — user object o full_name (legacy)
 * @param {string} [viewerTz] — opcional, default VIEWER_TZ
 * @returns {null | {techTime, viewerTime, status, label, color, offsetText, diffHours, tzLabel, role, displayName, untilEndOfDay, shouldNotDisturb}}
 */
export function getTechTimeInfo(nameOrUser, viewerTz = VIEWER_TZ) {
  const meta = resolveMeta(nameOrUser);
  if (!meta) return null;

  // Defensa runtime · si meta.tz es un IANA inválido (ej. "America/Miami"
  // tipeado a mano en el text input legacy), Intl.DateTimeFormat tira
  // RangeError y crashea TODO el render del map. Wrap completo en try/
  // catch: si algo falla, devolvemos null y la UI usa fallbacks "—".
  // Iter 2.63f · fix pantallazo negro en /srs/techs reportado por owner.
  try {
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
      role: meta.role || null,
      displayName: meta.displayName || null,
      untilEndOfDay,
      shouldNotDisturb: status === "sleeping" || status === "weekend",
    };
  } catch (err) {
    // Log para que el owner vea cuál user tiene tz inválido en mongo.
    // No re-throw · degradamos a "sin info" y dejamos que UI muestre fallbacks.
    if (typeof console !== "undefined") {
      const ident = typeof nameOrUser === "object"
        ? nameOrUser.full_name || nameOrUser.email || "(unknown)"
        : nameOrUser;
      console.warn(
        `[tz.js] getTechTimeInfo failed for "${ident}" · tz="${meta?.tz}" · ${err.message}`
      );
    }
    return null;
  }
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
