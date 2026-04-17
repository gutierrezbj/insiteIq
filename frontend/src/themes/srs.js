/**
 * theme-srs — War room de portaaviones con acabados de relojeria suiza
 *
 * Identity Sprint result 2026-04-17 (see DESIGN.md section 2.1).
 * Extends Foundation (tailwind.config.js). Do NOT override structural tokens.
 */

export const themeSRS = {
  id: "srs",
  character: "War room de portaaviones con acabados de relojeria suiza",

  // Color temperature: warm dark dominante
  colors: {
    surface: {
      base: "#0C0A09",        // stone-950 warm black (Nucleus)
      raised: "#1C1917",      // stone-900
      overlay: "#292524",     // stone-800
      border: "#44403C",      // stone-700
      borderSubtle: "#292524",
    },
    primary: {
      DEFAULT: "#D97706",     // amber-600 (Nucleus)
      light: "#F59E0B",
      dark: "#B45309",
      muted: "rgba(217, 119, 6, 0.12)",
      glow: "rgba(217, 119, 6, 0.25)",
    },
    // Cold accents reserved for data/metrics only (Identity Sprint Step 2A)
    dataAccent: {
      steel: "#38BDF8",       // sky-400 — metric deltas, trendlines
      teal: "#2DD4BF",        // teal-400 — positive ops metrics
    },
    semantic: {
      success: "#22C55E",
      warning: "#EAB308",
      danger: "#EF4444",
      info: "#06B6D4",
    },
    text: {
      primary: "#FAFAF9",
      secondary: "#A8A29E",
      tertiary: "#78716C",
      inverse: "#0C0A09",
    },
  },

  // Typography — Nucleus baseline (Step 3 option B: serif NOT here, stays Client-only)
  fonts: {
    display: "'Instrument Sans', sans-serif",
    body: "'DM Sans', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontScale: "compact",         // density high — tables, cockpit panels
  fontWeightBody: 500,          // medium default
  fontLineHeightBody: 1.5,

  // Motion — Step 4A: ease-out-expo + stagger-in 60ms
  motion: {
    primaryEasing: "cubic-bezier(0.16, 1, 0.3, 1)",  // out-expo
    defaultDuration: "180ms",   // fast
    listStaggerMs: 60,
    // Active feedback comes from Foundation (scale 0.97 universal)
  },

  // Signature — Step 5A: preserve Nucleus + etching refinement
  signature: {
    accentBar: {
      width: "3px",
      color: "var(--color-primary, #D97706)",
    },
    labelCaps: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "0.625rem",     // text-2xs
      letterSpacing: "0.12em",  // widest-srs
      textTransform: "uppercase",
      color: "#78716C",         // stone-500
    },
    ctaGlow: "0 0 20px rgba(217, 119, 6, 0.25)",
    scrollbar: {
      track: "#1C1917",
      thumb: "#44403C",
      thumbHover: "#57534E",
      width: "6px",
    },
    // Etching refinement (Step 5A refinement) — refs/serials feel like dial markings
    etchedText: {
      textShadow: "0 1px 0 rgba(0, 0, 0, 0.6)",
      applyTo: "mono.caps.refs",  // class hint
    },
  },
};

export default themeSRS;
