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
 *  - Footer: 2 botones outline grid 2 cols (Detalle cyan / Reporte rojo)
 *
 * Props:
 *  - wo: work order object con .id, .site_id, .severity, .status, .organization_id, etc
 *  - site: site object con .name, .city
 *  - tech: user object con .full_name
 *  - extra: string opcional con info adicional (partes en sitio, ETA, ventana)
 *  - onDetail: () => void
 *  - onReport: () => void  // navega al Intervention Report del WO
 */

import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { Icon, ICONS } from "../../lib/icons";
import { formatWoCode } from "../../lib/woCode";

// Color semántico por status (la label viene de i18n, no hardcoded).
const STATUS_COLORS = {
  intake:      "#3B82F6",
  triage:      "#3B82F6",
  pre_flight:  "#8B5CF6",
  dispatched:  "#7C3AED",
  assigned:    "#7C3AED",
  en_route:    "#0A1628",
  on_site:     "#EA580C",
  in_progress: "#EA580C",
  in_closeout: "#22C55E",
  resolved:    "#22C55E",
  completed:   "#16A34A",
  closed:      "#16A34A",
  cancelled:   "#8B95A8",
};

// Helper · usable también desde class components / non-React
function getStatusInfo(status) {
  const color = STATUS_COLORS[status] || "#8B95A8";
  // Si el status existe en el catálogo, usamos i18n. Si no (status raro del
  // backend), fallback a uppercase del status raw.
  const t = i18n.t.bind(i18n);
  const key = `wo_status.${status}`;
  const i18nLabel = t(key);
  // i18n.t devuelve la key si no encuentra valor. Detectamos eso.
  const label = i18nLabel === key ? (status?.toUpperCase() || "—") : i18nLabel;
  return { label, color };
}

export default function InterventionCardFull({
  wo,
  site,
  tech,
  extra,
  onDetail,
  onReport,
  attention = false,
}) {
  const { t } = useTranslation("common");
  const status = getStatusInfo(wo?.status);
  // Halo amber "TE TOCA" (Sprint Afinar B3) · la WO requiere acción del viewer
  const restBorder = attention ? "#D97706" : "#E2E5EC";
  const restShadow = attention ? "0 0 0 1px #D97706, 0 6px 16px -6px rgba(217,119,6,0.25)" : "none";

  return (
    <article
      className="stage-border-top bg-cl-surface rounded-sm p-4 transition cursor-pointer"
      style={{
        "--stage-color": status.color,
        border: `1px solid ${restBorder}`,
        boxShadow: restShadow,
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = attention ? "#D97706" : "#C8CDD8";
        e.currentTarget.style.background = "#FAFBFC";
        e.currentTarget.style.boxShadow = attention
          ? "0 0 0 1px #D97706, 0 8px 20px -6px rgba(217,119,6,0.35)"
          : "0 4px 12px -2px rgba(10, 22, 40, 0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = restBorder;
        e.currentTarget.style.background = "#FFFFFF";
        e.currentTarget.style.boxShadow = restShadow;
      }}
    >
      {attention && (
        <span
          style={{
            position: "absolute",
            top: -9,
            right: 12,
            background: "#D97706",
            color: "#FFFFFF",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8.5,
            fontWeight: 800,
            letterSpacing: "0.1em",
            padding: "2px 7px",
            borderRadius: 4,
            textTransform: "uppercase",
          }}
        >
          {t("notifications.ball_to_me", { defaultValue: "Te toca a ti" })}
        </span>
      )}
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
        {site?.name || wo?.site_name || t("intervention.no_site")}
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
            {tech?.full_name || tech?.name || t("intervention.unassigned")}
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
          {t("intervention.details_btn")}
        </button>
        <button
          onClick={onReport}
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
          {t("intervention.report_btn")}
        </button>
      </div>
    </article>
  );
}

export { STATUS_COLORS, getStatusInfo };
