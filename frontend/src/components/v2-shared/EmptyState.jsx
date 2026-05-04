/**
 * EmptyState — placeholder cuando una lista/sección no tiene data.
 *
 * Design System v1.7 §3.6 (catálogo cerrado de glyphs):
 *   - solar:inbox-linear         — sin items (default)
 *   - solar:bell-off-linear      — sin alertas activas
 *   - solar:magnifer-bug-linear  — sin resultados de búsqueda/filtro
 *   - solar:check-circle-linear  — todo en regla
 *
 * Props:
 *   - icon: nombre corto del catálogo ICONS (ej "inbox", "bellOff", "magniferBug")
 *           o glyph completo "solar:*-linear". Default "inbox".
 *   - title: copy principal. Obligatorio.
 *   - sublabel: copy secundario opcional.
 *   - action: { label, onClick } — opcional, botón al pie.
 *   - tone: "neutral" | "success" | "warning" | "danger" (color del icon)
 *   - compact: bool · si true, usa padding y tamaño reducidos para sidebar widgets.
 */

import { Icon } from "../../lib/icons";

const TONE_COLOR = {
  neutral: "#6B7280",
  success: "#22C55E",
  warning: "#F59E0B",
  danger:  "#DC2626",
};

export default function EmptyState({
  icon = "inbox",
  title,
  sublabel,
  action,
  tone = "neutral",
  compact = false,
}) {
  const color = TONE_COLOR[tone] || TONE_COLOR.neutral;
  const iconSize = compact ? 18 : 28;
  const padding = compact ? "py-3" : "py-8";
  const titleSize = compact ? 11 : 12;
  const sublabelSize = compact ? 10 : 11;

  return (
    <div className={`text-center ${padding}`}>
      <Icon icon={icon} size={iconSize} color={color} />
      {title && (
        <p
          className="mt-2 leading-snug font-jakarta"
          style={{ fontSize: titleSize, color: "#3D4A66", fontWeight: 600 }}
        >
          {title}
        </p>
      )}
      {sublabel && (
        <p
          className="mt-1 leading-snug font-jakarta"
          style={{ fontSize: sublabelSize, color: "#8B95A8", fontWeight: 500 }}
        >
          {sublabel}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 px-4 py-1.5 rounded-sm cursor-pointer uppercase transition font-jakarta"
          style={{
            fontSize: 11,
            background: "#FFFFFF",
            color: "#0A1628",
            border: "1px solid #C8CDD8",
            letterSpacing: "0.08em",
            fontWeight: 700,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#0A1628";
            e.currentTarget.style.color = "#FFFFFF";
            e.currentTarget.style.borderColor = "#0A1628";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#FFFFFF";
            e.currentTarget.style.color = "#0A1628";
            e.currentTarget.style.borderColor = "#C8CDD8";
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
