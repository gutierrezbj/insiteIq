/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    /* ── SRS Foundation: fixed structural tokens ── */
    spacing: {
      0: "0", px: "1px", 0.5: "2px",
      1: "4px", 2: "8px", 3: "12px", 4: "16px",
      5: "24px", 6: "32px", 7: "40px", 8: "48px",
      9: "64px", 10: "80px", 11: "96px", 12: "128px",
    },
    borderRadius: {
      none: "0", sm: "4px", md: "8px", lg: "12px",
      xl: "16px", "2xl": "24px", full: "9999px",
    },
    transitionDuration: {
      0: "0ms", instant: "100ms", fast: "180ms", normal: "280ms",
      slow: "400ms", slower: "600ms",
    },
    transitionTimingFunction: {
      linear: "linear",
      "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      "out-back": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      "in-out-circ": "cubic-bezier(0.85, 0, 0.15, 1)",
      spring: "cubic-bezier(0.22, 1.2, 0.36, 1)",
    },
    zIndex: {
      base: "0", dropdown: "100", sticky: "200",
      overlay: "300", modal: "400", toast: "500", tooltip: "600",
    },
    screens: {
      sm: "640px", md: "1024px", lg: "1440px",
    },
    extend: {
      /* ── InsiteIQ Vertical Theme ── */
      colors: {
        /* Surface system — warm dark, NOT Tailwind gray */
        surface: {
          base: "#0C0A09",       /* stone-950 warm black */
          raised: "#1C1917",     /* stone-900 */
          overlay: "#292524",    /* stone-800 */
          border: "#44403C",     /* stone-700 */
          "border-subtle": "#292524",
        },
        /* Primary: amber/copper — mission control warmth */
        primary: {
          DEFAULT: "#D97706",    /* amber-600 */
          light: "#F59E0B",      /* amber-500 */
          dark: "#B45309",       /* amber-700 */
          muted: "rgba(217, 119, 6, 0.12)",
          glow: "rgba(217, 119, 6, 0.25)",
        },
        /* Semantic */
        success: { DEFAULT: "#22C55E", muted: "rgba(34, 197, 94, 0.12)" },
        warning: { DEFAULT: "#EAB308", muted: "rgba(234, 179, 8, 0.12)" },
        danger: { DEFAULT: "#EF4444", muted: "rgba(239, 68, 68, 0.12)" },
        info: { DEFAULT: "#06B6D4", muted: "rgba(6, 182, 212, 0.12)" },
        /* Text */
        text: {
          primary: "#FAFAF9",    /* stone-50 */
          secondary: "#A8A29E",  /* stone-400 */
          tertiary: "#78716C",   /* stone-500 */
          inverse: "#0C0A09",
        },
        /* Status colors for interventions (v1 — legacy, conservado) */
        status: {
          created: "#78716C",
          assigned: "#06B6D4",
          accepted: "#0891B2",
          en_route: "#EAB308",
          on_site: "#A855F7",
          in_progress: "#D97706",
          completed: "#22C55E",
          cancelled: "#6B7280",
          failed: "#EF4444",
        },

        /* ─────────────────────────────────────────────────────────────── */
        /* v2 · War Room SRS dark (Design System v1.7 · SKYPRO360 aligned) */
        /* Tokens prefijo `wr-*`. Coexisten con `surface.*` y `primary.*` */
        /* Aplican en componentes nuevos bajo `shell-v2/`, `warroom/` etc. */
        /* ─────────────────────────────────────────────────────────────── */
        wr: {
          bg: "#000000",
          surface: "#0A0A0A",
          "surface-2": "#141414",
          border: "#1F1F1F",
          "border-strong": "#2A2A2A",
          text: "#E5E5E5",
          "text-mid": "#9CA3AF",
          "text-dim": "#6B7280",
          amber: "#F59E0B",
          "amber-soft": "#D97706",
          red: "#DC2626",
          "red-soft": "#991B1B",
          green: "#22C55E",
          cyan: "#06B6D4",
          "cyan-bright": "#22D3EE",
          violet: "#8B5CF6",
        },

        /* Stage colors v2 · state machine 9 stages (DS v1.7 §3.2) */
        stage: {
          intake: "#3B82F6",
          triage: "#3B82F6",
          preflight: "#8B5CF6",
          dispatched: "#7C3AED",
          enroute: "#F59E0B",
          onsite: "#EA580C",
          resolved: "#22C55E",
          closed: "#16A34A",
          cancelled: "#6B7280",
        },

        /* Priority v2 (DS v1.7 §3.3) */
        prio: {
          urgent: "#DC2626",
          high: "#F59E0B",
          normal: "#475569",
          low: "#60A5FA",
        },

        /* Shield levels v2 (DS v1.7 §3.4) */
        shield: {
          bronze: "#B45309",
          "bronze-plus": "#D97706",
          silver: "#64748B",
          gold: "#CA8A04",
        },
      },
      fontFamily: {
        display: ["'Instrument Sans'", "sans-serif"],
        // Editorial serif — used in Client space for headlines.
        // Foundation-available; per-space theme decides whether to apply it.
        "display-serif": ["'Instrument Serif'", "serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      letterSpacing: {
        "widest-srs": "0.12em",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.3)",
        sm: "0 2px 4px 0 rgba(0,0,0,0.3)",
        md: "0 4px 8px -1px rgba(0,0,0,0.4)",
        lg: "0 8px 16px -2px rgba(0,0,0,0.5)",
        xl: "0 16px 32px -4px rgba(0,0,0,0.6)",
        "glow-primary": "0 0 20px rgba(217, 119, 6, 0.25)",
        "glow-success": "0 0 20px rgba(34, 197, 94, 0.2)",
        "glow-danger": "0 0 20px rgba(239, 68, 68, 0.2)",
      },
      maxWidth: {
        prose: "65ch",
        content: "1200px",
        wide: "1440px",
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "stagger-in": "stagger-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "stagger-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
