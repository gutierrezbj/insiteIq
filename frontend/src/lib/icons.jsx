/**
 * Icon wrapper — Iter 2.14 (DS switch · Lucide inline)
 *
 * Único icon set oficial: Lucide (https://lucide.dev) — paths SVG inline.
 *
 * Por qué Lucide inline (no npm, no CDN):
 *   - Cero deps en runtime (no `lucide-react` package)
 *   - Cero requests external (no Iconify CDN)
 *   - Bundle solo crece con los glyphs efectivamente usados
 *   - Patrón validado en otro proyecto SRS (Vodafone-style ops dashboard)
 *   - Coherencia cross-app SRS ecosystem
 *   - Custom-friendly: ajustar stroke-width o path requiere edit local, no cambio de lib
 *   - PWA-perfect: nada que cachear external
 *
 * Migración Solar → Lucide firmada por owner JuanCho 2026-05-03.
 * Razón: Solar bold tiende a "olor a marketing/Lovable/V0", Lucide outline
 * tiene presencia clean ops-tool sin peso visual gratuito (cumple regla #6
 * Anti-plantilla IA del cuaderno donde_la_cagamos.md mejor que Solar).
 *
 * Cómo añadir un glyph nuevo:
 *   1. Buscar en https://lucide.dev/icons
 *   2. Copiar el contenido del <svg> (paths, lines, circles, etc.)
 *   3. Añadirlo al objeto LUCIDE_PATHS abajo con key descriptive
 *   4. Si el componente lo va a referenciar por nombre estable, añadir
 *      también al catálogo ICONS al final
 *
 * Anti-Solar legacy:
 *   - Cero `<iconify-icon>` web component (eliminado del index.html)
 *   - Cero `@iconify/react`
 *   - Cero referencias a "solar:*" prefix
 *   - Si encuentras `<iconify-icon>` en código nuevo: bug de migración, fix it
 */

// SVG common attrs Lucide standard (https://lucide.dev/guide/design)
const LUCIDE_DEFAULTS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/**
 * Catálogo de paths Lucide inline.
 * Cada entry es el contenido del <svg> (sin el wrapper <svg> ni los attrs).
 * Copy-paste literal de lucide.dev.
 */
const LUCIDE_PATHS = {
  // Search / navigation
  "search":          '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  "chevron-down":    '<path d="m6 9 6 6 6-6"/>',
  "chevron-up":      '<path d="m18 15-6-6-6 6"/>',
  "chevron-right":   '<path d="m9 18 6-6-6-6"/>',
  "chevron-left":    '<path d="m15 18-6-6 6-6"/>',
  "arrow-right":     '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  "arrow-left":      '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  "more-horizontal": '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  "refresh-cw":      '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>',
  "x":               '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  "x-circle":        '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  "menu":            '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',

  // Stats / dashboards
  "bar-chart-2":     '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
  "calendar":        '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
  "gauge":           '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  "layout-dashboard":'<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  "kanban-square":   '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/>',

  // Status / warnings
  "alert-triangle":  '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>',
  "alert-circle":    '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  "check-circle":    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  "info":            '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/>',

  // Entities
  "shield":          '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  "shield-check":    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  "user":            '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  "user-circle":     '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>',
  "user-x":          '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/>',
  "users":           '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  "map-pin":         '<path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  "map":             '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/>',
  "navigation":      '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  "package":         '<path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/>',
  "camera":          '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  "message-circle":  '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  "clock":           '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  "moon":            '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  "cloud":           '<path d="M17.5 19a4.5 4.5 0 1 0-1.41-8.78A6 6 0 1 0 6 18.5"/>',
  "truck":           '<path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><path d="M15 18H9"/><circle cx="17" cy="18" r="2"/>',
  "bell":            '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  "bell-off":        '<path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="m2 2 20 20"/>',
  "inbox":           '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  "search-x":        '<path d="m13.5 8.5-5 5"/><path d="m8.5 8.5 5 5"/><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  "settings":        '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  "log-out":         '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  "plus-circle":     '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',
  "file-text":       '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>',
  "download":        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  "flag":            '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  "printer":         '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
  "bug":             '<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
};

/**
 * Wrapper Icon — devuelve <svg> inline con path Lucide.
 *
 * @param {object} props
 * @param {string} props.icon — Nombre del glyph. Acepta nombre corto del catálogo
 *   ICONS (ej. "search") o nombre Lucide directo (ej. "map-pin"). Para retro-compat
 *   con código v2 anterior, también acepta nombres con prefix solar (ej.
 *   "solar:flag-bold") y los mapea al equivalente Lucide.
 * @param {number|string} [props.size] — Tamaño en px. Default 16.
 * @param {string} [props.color] — Color CSS. Default: hereda del parent (currentColor).
 * @param {string} [props.className] — Clase CSS adicional.
 * @param {object} [props.style] — Estilos inline.
 */
export function Icon({ icon, size = 16, color, className, style, ...rest }) {
  // Normalize: aceptar nombres del catálogo ICONS o nombres Lucide directos
  let key = icon;
  if (typeof key === "string") {
    // Compat solar:* legacy → mapear al lucide equivalente via SOLAR_TO_LUCIDE abajo
    if (key.startsWith("solar:")) {
      key = SOLAR_TO_LUCIDE[key] || key;
    }
    // Si viene del catálogo ICONS (ej. "search"), está OK
    // Si viene como Lucide name directo (ej. "map-pin"), está OK
    // Si viene como Solar nombre legacy ("magnifer-linear"), traducir
    key = LUCIDE_NAME_ALIAS[key] || key;
  }

  const path = LUCIDE_PATHS[key];
  if (!path) {
    // Fallback: render un cuadrado con "?" para que el dev vea el missing
    if (typeof console !== "undefined") {
      console.warn(`[Icon] missing glyph: ${icon != null ? String(icon) : "null"}`);
    }
    return (
      <svg
        viewBox={LUCIDE_DEFAULTS.viewBox}
        width={size} height={size}
        fill="none" stroke={color || "currentColor"} strokeWidth="1.5"
        className={className} style={style}
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <text x="12" y="16" fontSize="12" fontFamily="monospace" fill={color || "currentColor"} textAnchor="middle" stroke="none">?</text>
      </svg>
    );
  }

  const mergedStyle = {
    color: color || "currentColor",
    display: "inline-flex",
    verticalAlign: "middle",
    flexShrink: 0,
    ...style,
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={LUCIDE_DEFAULTS.viewBox}
      width={size}
      height={size}
      fill="none"
      stroke={color || "currentColor"}
      strokeWidth={LUCIDE_DEFAULTS.strokeWidth}
      strokeLinecap={LUCIDE_DEFAULTS.strokeLinecap}
      strokeLinejoin={LUCIDE_DEFAULTS.strokeLinejoin}
      className={className}
      style={mergedStyle}
      dangerouslySetInnerHTML={{ __html: path }}
      {...rest}
    />
  );
}

/**
 * Aliases para nombres del catálogo ICONS antiguo (Solar) → Lucide names directos.
 * Mantiene retro-compat sin tener que tocar todos los componentes.
 */
const LUCIDE_NAME_ALIAS = {
  // Solar names → Lucide names (ICONS catalog antiguo)
  "magnifer-linear":           "search",
  "alt-arrow-down-linear":     "chevron-down",
  "alt-arrow-up-linear":       "chevron-up",
  "alt-arrow-right-linear":    "chevron-right",
  "alt-arrow-left-linear":     "chevron-left",
  "arrow-right-linear":        "arrow-right",
  "menu-dots-linear":          "more-horizontal",
  "refresh-linear":            "refresh-cw",
  "close-circle-linear":       "x-circle",
  "chart-2-linear":            "bar-chart-2",
  "calendar-linear":           "calendar",
  "speedometer-low-linear":    "gauge",
  "list-arrow-up-linear":      "kanban-square",
  "global-linear":             "map",
  "user-speak-linear":         "message-circle",
  "shield-check-linear":       "shield-check",
  "shield-linear":             "shield",
  "document-text-linear":      "file-text",
  "bell-linear":               "bell",
  "bell-off-linear":           "bell-off",
  "danger-triangle-linear":    "alert-triangle",
  "danger-circle-linear":      "alert-circle",
  "check-circle-linear":       "check-circle",
  "info-circle-linear":        "info",
  "user-linear":               "user",
  "user-circle-linear":        "user-circle",
  "user-cross-linear":         "user-x",
  "map-point-linear":          "map-pin",
  "map-arrow-right-linear":    "navigation",
  "box-linear":                "package",
  "camera-linear":             "camera",
  "chat-round-linear":         "message-circle",
  "clock-circle-linear":       "clock",
  "moon-linear":               "moon",
  "cloud-linear":              "cloud",
  "bus-linear":                "truck",
  "inbox-linear":              "inbox",
  "magnifer-bug-linear":       "search-x",
  "widget-5-linear":           "layout-dashboard",
  "settings-linear":           "settings",
  "logout-2-linear":           "log-out",
  "add-circle-linear":         "plus-circle",
  "download-square-linear":    "download",
  "flag-linear":               "flag",
  "flag-bold":                 "flag",
  "printer-linear":            "printer",
};

const SOLAR_TO_LUCIDE = Object.fromEntries(
  Object.entries(LUCIDE_NAME_ALIAS).map(([solar, lucide]) => [`solar:${solar}`, lucide])
);

/**
 * Catálogo público — referenciar vía ICONS.search en lugar de "search" string raw.
 * Mantiene la API del catálogo Solar antiguo (mismas keys), solo cambia value
 * a nombre Lucide. Cero refactor downstream.
 */
export const ICONS = {
  // Search / navigation
  search:         "search",
  chevronDown:    "chevron-down",
  chevronUp:      "chevron-up",
  arrowRight:     "arrow-right",
  menuDots:       "more-horizontal",
  refresh:        "refresh-cw",
  close:          "x-circle",

  // KPI card icons
  chart:          "bar-chart-2",
  calendar:       "calendar",
  userSpeak:      "message-circle",
  shieldCheck:    "shield-check",
  document:       "file-text",
  bell:           "bell",

  // Status / warnings
  dangerTriangle: "alert-triangle",
  dangerCircle:   "alert-circle",
  checkCircle:    "check-circle",
  infoCircle:     "info",

  // Entities
  shield:         "shield",
  user:           "user",
  userCircle:     "user-circle",
  userCross:      "user-x",
  mapPoint:       "map-pin",
  mapArrow:       "navigation",
  box:            "package",
  camera:         "camera",
  chat:           "message-circle",
  clock:          "clock",
  moon:           "moon",
  cloud:          "cloud",
  bus:            "truck",

  // Empty / misc
  inbox:          "inbox",
  bellOff:        "bell-off",
  magniferBug:    "search-x",

  // Admin / settings
  widget:         "layout-dashboard",
  settings:       "settings",
  logout:         "log-out",

  // Add / create
  addCircle:      "plus-circle",

  // Rollouts
  map:            "map",
  kanban:         "kanban-square",
  gauge:          "gauge",
  download:       "download",
  flag:           "flag",

  // Export Report
  printer:        "printer",
};
