/**
 * theme-tech — Herramienta de cirujano de campo: todo a la mano, nada sobra, vida o muerte
 *
 * Identity Sprint result 2026-04-17 (see DESIGN.md section 2.3).
 * PWA mobile-first. Alto contraste dark. Saturated amber para luz solar directa.
 */

// WO status -> color for bottom status hairline signature (Step 5A)
export const techWoStatusColor = {
  intake: "#78716C",          // stone-500
  triage: "#78716C",
  pre_flight: "#A8A29E",      // stone-400
  dispatched: "#06B6D4",      // cyan-500
  en_route: "#F59E0B",        // amber-500 (saturated)
  on_site: "#A855F7",         // violet-500
  resolved: "#22C55E",        // success
  closed: "#44403C",          // stone-700
  cancelled: "#EF4444",       // danger
};

export const themeTech = {
  id: "tech",
  character: "Herramienta de cirujano de campo: todo a la mano, nada sobra, vida o muerte",

  // Color temperature: alto contraste dark + amber saturado (Step 2A)
  colors: {
    surface: {
      base: "#0C0A09",          // stone-950 (same as SRS for coherence)
      raised: "#1C1917",        // stone-900
      overlay: "#292524",       // stone-800
      border: "#44403C",        // stone-700
      borderSubtle: "#292524",
    },
    primary: {
      // Amber MAS saturado para visibilidad con luz solar directa
      DEFAULT: "#F59E0B",       // amber-500 (mas vivo que SRS amber-600)
      light: "#FBBF24",         // amber-400
      dark: "#D97706",          // amber-600
      muted: "rgba(245, 158, 11, 0.18)",
      glow: "rgba(245, 158, 11, 0.4)",  // mas saturated glow
    },
    // Semantic colors EXTRA saturated para readability campo
    semantic: {
      success: "#16A34A",
      warning: "#EAB308",
      danger: "#DC2626",        // saturated vs SRS #EF4444
      info: "#0891B2",
    },
    text: {
      primary: "#FAFAF9",
      secondary: "#D6D3D1",     // stone-300 (mas claro que SRS stone-400)
      tertiary: "#A8A29E",
      inverse: "#0C0A09",
    },
    status: techWoStatusColor,  // exposed for status hairline signature
  },

  // Typography — Step 3B: same Nucleus base, bold default body + mono prominent
  fonts: {
    display: "'Instrument Sans', sans-serif",
    body: "'DM Sans', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontScale: "large",           // scale grande para legibilidad campo
  fontWeightBody: 700,          // ← BOLD default (guantes / movimiento / sol)
  fontLineHeightBody: 1.5,
  // WO refs siempre en mono caps prominente
  monoForRefs: true,

  // Motion — Step 4A: spring + instant-on + micro-spring 100ms
  motion: {
    primaryEasing: "cubic-bezier(0.22, 1.2, 0.36, 1)",  // spring
    defaultDuration: "100ms",   // instant-ish
    microSpringOnPress: true,
    navTransitions: "none",     // direct state swap — no fades en navegacion
    listStaggerMs: 0,           // no stagger — all at once, no ceremony
  },

  // Signature — Step 5A: Bottom status hairline 4px persistente
  signature: {
    bottomStatusHairline: {
      height: "4px",
      position: "fixed bottom",
      widthPct: 100,
      // Color map desde techWoStatusColor, leido por el layout
      colorSource: "woStatusColor",
    },
    accentBar: {
      width: "3px",
      color: "var(--color-primary, #F59E0B)",  // saturated amber
    },
    labelCaps: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "0.75rem",      // mas grande que SRS (0.625rem) para campo
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "#A8A29E",
      fontWeight: 600,
    },
    ctaGlow: "0 0 24px rgba(245, 158, 11, 0.4)",
  },

  // PWA / mobile-first specifics
  pwa: {
    touchTargetMinPx: 44,       // WCAG AA
    safeAreaAware: true,
    offlineCapable: true,       // service worker target (Fase 1 implementation)
  },
};

export default themeTech;
