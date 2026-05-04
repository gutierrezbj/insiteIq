/**
 * InterventionCardFull — Card horizontal grande para "Intervenciones en curso"
 *
 * Extraído 1:1 de mocks/insiteiq_cockpit_srs_dark_v2_static.html (líneas 240-260).
 *
 * Anatomía:
 *  - Border-top 2px color stage (--stage-color CSS var)
 *  - Top row: WO code mono color + badge stage uppercase
 *  - Title: site name (15px display, bold, white)
 *  - Subtitle: SITE id + descripción corta
 *  - Info rows: Tech con icono user · Info extra (partes/ETA) con icono box/calendar
 *  - Footer: 2 botones outline grid 2 cols (Detalle cyan / Compliance rojo)
 *
 * Props:
 *  - wo: work order object con .id, .site_id, .severity, .status, .organization_id, etc
 *  - site: site object con .name, .city
 *  - tech: user object con .full_name
 *  - extra: string opcional con info adicional (partes en sitio, ETA, ventana)
 *  - onDetail: () => void
 *  - onCompliance: () => void
 */

import { Icon, ICONS } from "../../lib/icons";
import { formatWoCode } from "../../lib/woCode";

// Mapping de status del backend → display label + color del stage
const STATUS_DISPLAY = {
  intake:        { label: "ENTRADA",     color: "#3B82F6" },
  triage:        { label: "TRIAJE",      color: "#3B82F6" },
  pre_flight:    { label: "PREPARANDO",  color: "#8B5CF6" },
  dispatched:    { label: "DESPACHADA",  color: "#7C3AED" },
  assigned:      { label: "DESPACHADA",  color: "#7C3AED" },
  en_route:      { label: "EN RUTA",     color: "#0A1628" },
  on_site:       { label: "EN SITIO",    color: "#EA580C" },
  in_progress:   { label: "EN SITIO",    color: "#EA580C" },
  in_closeout:   { label: "RESUELTA",    color: "#22C55E" },
  resolved:      { label: "RESUELTA",    color: "#22C55E" },
  completed:     { label: "CERRADA",     color: "#16A34A" },
  closed:        { label: "CERRADA",     color: "#16A34A" },
  cancelled:     { label: "CANCELADA",   color: "#8B95A8" },
};

function getStatusInfo(status) {
  return STATUS_DISPLAY[status] || { label: status?.toUpperCase() || "—", color: "#8B95A8" };
}

export default function InterventionCardFull({
  wo,
  site,
  tech,
  extra,
  onDetail,
  onCompliance,
}) {
  const status = getStatusInfo(wo?.status);

  return (
    <article
      className="stage-border-top bg-cl-surface rounded-sm p-4 transition cursor-pointer"
      style={{
        "--stage-color": status.color,
        border: "1px solid #E2E5EC",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#C8CDD8";
        e.currentTarget.style.background = "#FAFBFC";
        e.currentTarget.style.boxShadow = "0 4px 12px -2px rgba(10, 22, 40, 0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E2E5EC";
        e.currentTarget.style.background = "#FFFFFF";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Top row: WO code + badge stage */}
      <div className="flex items-center justify-between mb-2 pt-1">
        <span
          className="font-mono text-[11px]"
          style={{ color: status.color, fontWeight: 700 }}
        >
          {formatWoCode(wo)}
        </span>
        <span
          className="font-jakarta"
          style={{
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 3,
            background: `${status.color}1A`,
            color: status.color,
            border: `1px solid ${status.color}66`,
            fontWeight: 700,
            letterSpacing: "0.12em",
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Title navy strong (NO text-white) + subtitle */}
      <h3
        className="font-jakarta text-[16px] mb-1 leading-tight"
        style={{ color: "#0A1628", fontWeight: 700, letterSpacing: "-0.005em" }}
      >
        {site?.name || wo?.site_name || "Sin sitio"}
      </h3>
      <p className="text-[12px] text-cl-text-dim mb-3" style={{ fontWeight: 500 }}>
        {site?.code && (
          <span>
            SITE <span className="text-cl-text-mid font-mono" style={{ fontWeight: 600 }}>{site.code}</span>
          </span>
        )}
        {site?.city && <span> · {site.city}</span>}
        {wo?.summary && <span> · {wo.summary}</span>}
      </p>

      {/* Info rows */}
      <div className="space-y-1.5 text-[12px] mb-4">
        <div className="flex items-center gap-2">
          <Icon icon={ICONS.user} size={13} color="#3D4A66" />
          <span
            style={{
              color: tech ? "#0A1628" : "#8B95A8",
              fontStyle: tech ? "normal" : "italic",
              fontWeight: tech ? 600 : 400,
            }}
          >
            {tech?.full_name || tech?.name || "Sin asignar"}
          </span>
        </div>
        {extra && (
          <div className="flex items-center gap-2">
            <Icon icon={ICONS.box} size={13} color="#3D4A66" />
            <span className="text-cl-text-mid" style={{ fontWeight: 500 }}>{extra}</span>
          </div>
        )}
      </div>

      {/* Footer buttons · outline navy strong (no cyan/red) — paleta F sin colores arbitrarios */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onDetail}
          style={{
            background: "#FFFFFF",
            border: "1px solid #C8CDD8",
            color: "#0A1628",
            padding: "8px 0",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.04em",
            borderRadius: 4,
            cursor: "pointer",
            transition: "background 180ms, border-color 180ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#F4F6F8";
            e.currentTarget.style.borderColor = "#0A1628";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#FFFFFF";
            e.currentTarget.style.borderColor = "#C8CDD8";
          }}
        >
          Detalle
        </button>
        <button
          onClick={onCompliance}
          style={{
            background: "#FFFFFF",
            border: "1px solid #C8CDD8",
            color: "#3D4A66",
            padding: "8px 0",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            borderRadius: 4,
            cursor: "pointer",
            transition: "background 180ms, border-color 180ms, color 180ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#F4F6F8";
            e.currentTarget.style.borderColor = "#0A1628";
            e.currentTarget.style.color = "#0A1628";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#FFFFFF";
            e.currentTarget.style.borderColor = "#C8CDD8";
            e.currentTarget.style.color = "#3D4A66";
          }}
        >
          Compliance
        </button>
      </div>
    </article>
  );
}

export { STATUS_DISPLAY, getStatusInfo };
