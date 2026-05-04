/**
 * v2-shared · KpiTile (Iter 2.22).
 *
 * Tile compacto para BUMM dashboards y KPI strips. Border-left tonal
 * (default/primary/success/warning/danger) + label mono caps + value
 * mono grande con tabular-nums + hint Plus Jakarta.
 *
 * Reemplaza al KpiCard v1 (tokens amber). Inline paleta F.
 */

import { JAKARTA, MONO, MONO_CAPS } from "./typography";

const TONE_STYLES = {
  default: { bar: "#C8CDD8", value: "#0A1628" },
  primary: { bar: "#0A1628", value: "#0A1628" },
  success: { bar: "#16A34A", value: "#0A6131" },
  warning: { bar: "#E8A33D", value: "#7E5212" },
  danger:  { bar: "#DC2626", value: "#991B1B" },
};

export default function KpiTile({ label, value, hint, tone = "default" }) {
  const s = TONE_STYLES[tone] || TONE_STYLES.default;
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        borderLeft: `3px solid ${s.bar}`,
        borderRadius: 6,
        padding: "12px 16px",
      }}
    >
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em", marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 22,
          fontWeight: 700,
          color: s.value,
          letterSpacing: "-0.01em",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontFamily: JAKARTA, fontSize: 11, color: "#8B95A8", marginTop: 6, fontWeight: 500 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
