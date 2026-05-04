/**
 * KpiStripV2 — 5 KPI buttons accionables (KPI-as-filter pattern)
 *
 * Extraído 1:1 de mocks/insiteiq_cockpit_srs_dark_v2_static.html (líneas 173-223)
 * + behavior de filtrado del mocks/insiteiq_map_srs_dark_v2_static.html.
 *
 * Design System v1.7 §3.6a (timezone-aware no aplica aquí) + KPI-filter pattern.
 *
 * Cada card es un button con:
 *  - Border-left 2px color semántico (rojo/amber/cyan/verde)
 *  - Label-caps arriba en color match
 *  - Número 44px con color match
 *  - Sub-label 9px gris
 *  - Click toggle filter (uno solo activo a la vez)
 *  - Disabled si count === 0
 *
 * Props:
 *  - stats: { critical, slaRisk, ballSrs, unassigned, afterHours } números
 *  - activeFilter: key | null
 *  - onFilterChange: (key | null) => void
 */

import { Icon, ICONS } from "../../lib/icons";

/**
 * Color semántico por KPI:
 *   - critical: #D63944 coral (paleta F custom)
 *   - slaRisk: navy strong (autoridad serena · paleta F)
 *   - ballSrs: navy strong
 *   - unassigned: deep blue info
 *   - activeToday: brand verde
 *
 * Número siempre navy strong para legibilidad ABSOLUTA — el color del KPI
 * vive en la barra izquierda + label + icono.
 */
const KPI_DEFS = [
  {
    key: "critical",
    label: "Críticos abiertos",
    sublabel: "Severity critical · activos",
    color: "#D63944",
    icon: ICONS.dangerTriangle,
  },
  {
    key: "slaRisk",
    label: "SLA en riesgo",
    sublabel: "Breach o próximo breach",
    color: "#E8A33D",
    icon: ICONS.dangerTriangle,
  },
  {
    key: "ballSrs",
    label: "Ball SRS >6h",
    sublabel: "Pendiente acción nuestra",
    color: "#0A1628",
    icon: ICONS.clock,
  },
  {
    key: "unassigned",
    label: "Sin asignar",
    sublabel: "Activa sin técnico",
    color: "#0066B8",
    icon: ICONS.userCross,
  },
  {
    key: "activeToday",
    label: "Activas · hoy",
    sublabel: "En ruta y en sitio",
    color: "#16A34A",
    icon: ICONS.mapPoint,
  },
];

export default function KpiStripV2({ stats, activeFilter, onFilterChange }) {
  return (
    // Strip con border-bottom navy soft para presencia + bg surface-3 entre cards
    <section
      className="grid grid-cols-5 gap-px"
      style={{
        background: "#C8CDD8",
        border: "1px solid #C8CDD8",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {KPI_DEFS.map((def) => {
        const count = stats?.[def.key] ?? 0;
        const isActive = activeFilter === def.key;
        const isDisabled = count === 0 && def.key !== "activeToday";

        return (
          <button
            key={def.key}
            type="button"
            onClick={() => {
              if (isDisabled) return;
              onFilterChange(isActive ? null : def.key);
            }}
            className={[
              "kpi-filter px-5 py-4 text-left",
              isActive ? "is-active" : "",
              isDisabled ? "is-disabled" : "",
            ].join(" ")}
            style={{
              borderLeft: `4px solid ${def.color}`,
              background: isActive ? "#F4F6F8" : "#FFFFFF",
            }}
            disabled={isDisabled}
          >
            <div className="flex items-center justify-between mb-3">
              <p
                className="label-caps-v2"
                style={{ color: def.color, letterSpacing: "0.14em", fontWeight: 800 }}
              >
                {def.label}
              </p>
              <Icon icon={def.icon} size={16} color={def.color} />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              {/* Número GIGANTE 44px navy strong + Plus Jakarta 800 (mock F) */}
              <span
                className="leading-none"
                style={{
                  color: "#0A1628",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 44,
                  fontWeight: 800,
                  letterSpacing: "-0.025em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {count}
              </span>
            </div>
            <p
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 11,
                color: "#3D4A66",
                fontWeight: 500,
                letterSpacing: "0.02em",
                lineHeight: 1.4,
              }}
            >
              {def.sublabel}
            </p>
          </button>
        );
      })}
    </section>
  );
}
