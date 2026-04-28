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

const KPI_DEFS = [
  {
    key: "critical",
    label: "Críticos abiertos",
    sublabel: "Severity critical · activos",
    color: "#DC2626",
    icon: ICONS.dangerTriangle,
  },
  {
    key: "slaRisk",
    label: "SLA en riesgo",
    sublabel: "Breach o próximo breach",
    color: "#F59E0B",
    icon: ICONS.dangerTriangle,
  },
  {
    key: "ballSrs",
    label: "Ball SRS >6h",
    sublabel: "Pendiente acción nuestra",
    color: "#F59E0B",
    icon: ICONS.clock,
  },
  {
    key: "unassigned",
    label: "Sin asignar",
    sublabel: "Activa sin técnico",
    color: "#06B6D4",
    icon: ICONS.userCross,
  },
  {
    key: "activeToday",
    label: "Activas · hoy",
    sublabel: "En ruta y en sitio",
    color: "#22C55E",
    icon: ICONS.mapPoint,
  },
];

export default function KpiStripV2({ stats, activeFilter, onFilterChange }) {
  return (
    <section className="grid grid-cols-5 gap-px bg-wr-border">
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
              "kpi-filter px-5 py-4 border-l-2 text-left",
              isActive ? "is-active" : "",
              isDisabled ? "is-disabled" : "",
            ].join(" ")}
            style={{ borderLeftColor: def.color }}
            disabled={isDisabled}
          >
            <div className="flex items-center justify-between mb-3">
              <p
                className="label-caps-v2"
                style={{ color: def.color, letterSpacing: "0.14em" }}
              >
                {def.label}
              </p>
              <Icon icon={def.icon} size={16} color={def.color} />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span
                className="text-[44px] font-semibold leading-none stat-mono"
                style={{ color: def.color, fontFamily: "JetBrains Mono, monospace", fontVariantNumeric: "tabular-nums" }}
              >
                {count}
              </span>
            </div>
            <p
              className="label-caps-v2 text-[9px]"
              style={{ letterSpacing: "0.14em" }}
            >
              {def.sublabel}
            </p>
          </button>
        );
      })}
    </section>
  );
}
