/**
 * theme-client — Recepcion de hotel 5 estrellas donde todo funciona sin que veas el esfuerzo
 *
 * Identity Sprint result 2026-04-17 (see DESIGN.md section 2.2).
 * Solo espacio con Instrument Serif (editorial twist). Warm neutral LIGHT.
 */

export const themeClient = {
  id: "client",
  character: "Recepcion de hotel 5 estrellas donde todo funciona sin que veas el esfuerzo",

  // Color temperature: warm neutral LIGHT (Step 2A)
  colors: {
    surface: {
      base: "#FAFAF9",          // stone-50 — fondo cream
      raised: "#F5F5F4",        // stone-100 — panels
      overlay: "#E7E5E4",       // stone-200 — dividers backgrounds
      border: "#D6D3D1",        // stone-300 — hairline color (signature)
      borderSubtle: "#E7E5E4",  // stone-200
    },
    primary: {
      // Amber RESERVADO solo a CTA primario + status ok
      DEFAULT: "#D97706",       // amber-600 — mismo que SRS para brand coherence
      light: "#F59E0B",
      dark: "#B45309",
      muted: "rgba(217, 119, 6, 0.08)",
      glow: "rgba(217, 119, 6, 0.15)",  // muted vs SRS
    },
    // Semantic muted para no gritar
    semantic: {
      success: "#16A34A",       // green-600, algo mas contenido
      warning: "#CA8A04",       // yellow-600
      danger: "#DC2626",        // red-600
      info: "#0891B2",          // cyan-600
    },
    text: {
      primary: "#1C1917",       // stone-900 — alto contraste sobre light
      secondary: "#57534E",     // stone-600
      tertiary: "#78716C",      // stone-500
      inverse: "#FAFAF9",
    },
  },

  // Typography — Step 3B: Instrument Serif editorial twist solo aqui
  fonts: {
    display: "'Instrument Serif', serif",  // ← TWIST editorial
    body: "'DM Sans', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontScale: "respired",        // generous whitespace + line-height
  fontWeightBody: 400,          // light-medium
  fontLineHeightBody: 1.65,
  proseMaxWidth: "65ch",

  // Motion — Step 4A: in-out-circ + fade-up 400ms
  motion: {
    primaryEasing: "cubic-bezier(0.85, 0, 0.15, 1)",  // in-out-circ
    defaultDuration: "400ms",   // slow — nothing is rushed
    fadeUpLiftPx: 14,           // 12-16px range, 14 as center
    listStaggerMs: 0,           // no stagger — quieter
  },

  // Signature — Step 5A: Hairline serif dividers
  signature: {
    hairlineDivider: {
      color: "#D6D3D1",         // stone-300
      width: "1px",
      whitespaceAbove: "2rem",  // 2x standard
      whitespaceBelow: "2rem",
    },
    // Accent-bar NOT used in Client — hairline is the signature instead
    accentBar: null,
    labelCaps: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "0.625rem",
      letterSpacing: "0.14em",  // algo mas ancho, editorial-ish
      textTransform: "uppercase",
      color: "#78716C",         // stone-500
    },
    // No glow CTA — client no pide dramatismo; solo sutil shadow
    ctaShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
  },

  // Client does NOT have dark mode in v1 (Identity Sprint decision)
  darkMode: false,
};

export default themeClient;
