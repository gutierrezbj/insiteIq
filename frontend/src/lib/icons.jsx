/**
 * Icon wrapper — Design System v1.7 §3.5 & §3.6
 *
 * Único icon set oficial: Solar Icon Set estilo Linear.
 * Prefijo obligatorio: `solar:*-linear`.
 *
 * Blacklist permanente: Lucide, Heroicons, Material Icons, Font Awesome,
 * Phosphor, Feather, Tabler. No se usan en código nuevo v2.
 *
 * Solo usar glyphs del catálogo cerrado §3.6 o §3.6b. Si un dominio
 * nuevo requiere un glyph no listado, se documenta en el doc antes de
 * añadirlo.
 *
 * Implementación: Iconify Web Component (custom element `<iconify-icon>`)
 * cargado vía CDN en `index.html`. Zero npm deps.
 * Referencia: https://iconify.design/docs/iconify-icon/
 *
 * Alternativa futura (si tenemos problemas con web component): migrar a
 * `@iconify/react` cuando OneDrive permissions se resuelvan. La API de
 * este wrapper `<Icon />` se mantiene igual — solo cambia el render interno.
 */

/**
 * Wrapper sobre Iconify con prefijo Solar Linear por default.
 *
 * @param {object} props
 * @param {string} props.icon — Nombre del glyph. Acepta nombre corto (sin prefijo)
 *   o nombre completo con prefijo (ej "solar:shield-linear").
 *   Si se pasa nombre corto, se asume suffix "-linear" y prefijo "solar:".
 * @param {number|string} [props.size] — Tamaño en px. Default 16.
 * @param {string} [props.color] — Color CSS. Default: hereda del parent (currentColor).
 * @param {string} [props.className] — Clase CSS adicional.
 * @param {object} [props.style] — Estilos inline.
 */
export function Icon({ icon, size = 16, color, className, style, ...rest }) {
  // Normalizar nombre: si no tiene prefijo, asumimos solar:*-linear
  let fullName = icon;
  if (!fullName.includes(":")) {
    fullName = `solar:${fullName}-linear`;
  } else if (
    !fullName.endsWith("-linear") &&
    !fullName.endsWith("-bold") &&
    !fullName.endsWith("-broken") &&
    !fullName.endsWith("-outline") &&
    !fullName.endsWith("-duotone") &&
    !fullName.endsWith("-bold-duotone")
  ) {
    // Si tiene prefijo pero no suffix de estilo, añadimos -linear
    fullName = `${fullName}-linear`;
  }

  const mergedStyle = {
    color: color || "currentColor",
    display: "inline-flex",
    verticalAlign: "middle",
    flexShrink: 0,
    ...style,
  };

  return (
    <iconify-icon
      icon={fullName}
      width={size}
      height={size}
      class={className}
      style={mergedStyle}
      {...rest}
    />
  );
}

/**
 * Catálogo cerrado de iconos (DS v1.7 §3.6) — source of truth como código.
 * Referenciar vía ICONS.search en lugar de "solar:magnifer-linear" directamente.
 * Facilita el refactor si cambiamos de set (improbable, pero el catálogo vive aquí).
 */
export const ICONS = {
  // Search / navigation
  search:         "solar:magnifer-linear",
  chevronDown:    "solar:alt-arrow-down-linear",
  chevronUp:      "solar:alt-arrow-up-linear",
  arrowRight:     "solar:arrow-right-linear",
  menuDots:       "solar:menu-dots-linear",
  refresh:        "solar:refresh-linear",
  close:          "solar:close-circle-linear",

  // KPI card icons
  chart:          "solar:chart-2-linear",
  calendar:       "solar:calendar-linear",
  userSpeak:      "solar:user-speak-linear",
  shieldCheck:    "solar:shield-check-linear",
  document:       "solar:document-text-linear",
  bell:           "solar:bell-linear",

  // Status / warnings
  dangerTriangle: "solar:danger-triangle-linear",
  dangerCircle:   "solar:danger-circle-linear",
  checkCircle:    "solar:check-circle-linear",
  infoCircle:     "solar:info-circle-linear",

  // Entities
  shield:         "solar:shield-linear",
  user:           "solar:user-linear",
  userCircle:     "solar:user-circle-linear",
  userCross:      "solar:user-cross-linear",
  mapPoint:       "solar:map-point-linear",
  mapArrow:       "solar:map-arrow-right-linear",
  box:            "solar:box-linear",
  camera:         "solar:camera-linear",
  chat:           "solar:chat-round-linear",
  clock:          "solar:clock-circle-linear",
  moon:           "solar:moon-linear",
  cloud:          "solar:cloud-linear",
  bus:            "solar:bus-linear",

  // Empty / misc
  inbox:          "solar:inbox-linear",
  bellOff:        "solar:bell-off-linear",
  magniferBug:    "solar:magnifer-bug-linear",

  // Admin / settings
  widget:         "solar:widget-5-linear",
  settings:       "solar:settings-linear",
  logout:         "solar:logout-2-linear",

  // Add / create
  addCircle:      "solar:add-circle-linear",

  // Rollouts (added 2026-04-30 · dictado owner Hueco Andros Panamá)
  map:            "solar:global-linear",
  kanban:         "solar:list-arrow-up-linear",
  gauge:          "solar:speedometer-low-linear",
  download:       "solar:download-square-linear",
  flag:           "solar:flag-linear",
};
