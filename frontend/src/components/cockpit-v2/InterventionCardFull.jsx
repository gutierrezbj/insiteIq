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
  en_route:      { label: "EN RUTA",     color: "#F59E0B" },
  on_site:       { label: "EN SITIO",    color: "#EA580C" },
  in_progress:   { label: "EN SITIO",    color: "#EA580C" },
  in_closeout:   { label: "RESUELTA",    color: "#22C55E" },
  resolved:      { label: "RESUELTA",    color: "#22C55E" },
  completed:     { label: "CERRADA",     color: "#16A34A" },
  closed:        { label: "CERRADA",     color: "#16A34A" },
  cancelled:     { label: "CANCELADA",   color: "#6B7280" },
};

function getStatusInfo(status) {
  return STATUS_DISPLAY[status] || { label: status?.toUpperCase() || "—", color: "#6B7280" };
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
      className="stage-border-top bg-wr-surface border border-wr-border rounded-sm p-4 hover:border-wr-border-strong transition cursor-pointer"
      style={{ "--stage-color": status.color }}
    >
      {/* Top row: WO code + badge stage */}
      <div className="flex items-center justify-between mb-2 pt-1">
        <span
          className="font-mono text-[11px]"
          style={{ color: status.color, fontWeight: 600 }}
        >
          {formatWoCode(wo)}
        </span>
        <span
          style={{
            fontSize: 10,
            padding: "2px 7px",
            borderRadius: 2,
            background: `${status.color}22`,
            color: status.color,
            border: `1px solid ${status.color}`,
            fontWeight: 600,
            letterSpacing: "0.12em",
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Title + subtitle */}
      <h3 className="font-display text-[15px] font-semibold text-white mb-1 leading-tight">
        {site?.name || wo?.site_name || "Sin sitio"}
      </h3>
      <p className="text-[11px] text-wr-text-dim mb-3">
        {site?.code && <span>SITE <span className="text-wr-text-mid">{site.code}</span></span>}
        {site?.city && <span> · {site.city}</span>}
        {wo?.summary && <span> · {wo.summary}</span>}
      </p>

      {/* Info rows */}
      <div className="space-y-1.5 text-[11px] mb-4">
        <div className="flex items-center gap-2">
          <Icon icon={ICONS.user} size={12} color="#9CA3AF" />
          <span className={tech ? "text-wr-text" : "text-wr-text-dim italic"}>
            {tech?.full_name || tech?.name || "Sin asignar"}
          </span>
        </div>
        {extra && (
          <div className="flex items-center gap-2">
            <Icon icon={ICONS.box} size={12} color="#9CA3AF" />
            <span className="text-wr-text-mid">{extra}</span>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onDetail}
          className="btn-outline-v2"
          style={{
            background: "transparent",
            border: "1px solid #06B6D4",
            color: "#06B6D4",
            padding: "7px 0",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.04em",
            borderRadius: 2,
            cursor: "pointer",
            transition: "background 180ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(6, 182, 212, 0.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Detalle
        </button>
        <button
          onClick={onCompliance}
          className="btn-outline-v2"
          style={{
            background: "transparent",
            border: "1px solid #DC2626",
            color: "#DC2626",
            padding: "7px 0",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.04em",
            borderRadius: 2,
            cursor: "pointer",
            transition: "background 180ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(220, 38, 38, 0.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Compliance
        </button>
      </div>
    </article>
  );
}

export { STATUS_DISPLAY, getStatusInfo };
