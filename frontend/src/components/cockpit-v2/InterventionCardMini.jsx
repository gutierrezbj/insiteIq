/**
 * InterventionCardMini — Card compacta para grid 4 cols "Historial reciente"
 *
 * Extraído 1:1 de mocks/insiteiq_cockpit_srs_dark_v2_static.html (líneas 320-402).
 *
 * Anatomía:
 *  - Border-top 2px color stage
 *  - WO code mono 10px color severity
 *  - Title site name 13px display white (truncate)
 *  - Bottom row: priority text + badge status compacto
 *
 * Props:
 *  - wo: work order { code, status, severity, ... }
 *  - site: site { name }
 */

import { getStatusInfo } from "./InterventionCardFull";
import { formatWoCode } from "../../lib/woCode";

const SEVERITY_LABEL = {
  critical: { label: "URGENTE", color: "#DC2626" },
  high:     { label: "ALTA",    color: "#F59E0B" },
  medium:   { label: "Normal",  color: "#9CA3AF" },
  low:      { label: "Baja",    color: "#9CA3AF" },
};

function getSeverityInfo(severity) {
  return SEVERITY_LABEL[severity] || { label: "Normal", color: "#9CA3AF" };
}

export default function InterventionCardMini({ wo, site, onClick }) {
  const status = getStatusInfo(wo?.status);
  const severity = getSeverityInfo(wo?.severity);

  return (
    <article
      className="stage-border-top bg-wr-surface border border-wr-border rounded-sm p-3 hover:border-wr-border-strong transition cursor-pointer"
      style={{ "--stage-color": status.color }}
      onClick={onClick}
    >
      <p
        className="font-mono text-[10px]"
        style={{ color: status.color, fontWeight: 600, marginTop: 3 }}
      >
        {formatWoCode(wo)}
      </p>
      <h4
        className="font-display text-[13px] font-semibold text-white leading-tight mt-1 mb-2 truncate"
        title={site?.name || wo?.site_name}
      >
        {site?.name || wo?.site_name || "Sin sitio"}
      </h4>
      <div className="flex items-center justify-between">
        <span
          className="text-[10px]"
          style={{ color: severity.color }}
        >
          {severity.label}
        </span>
        <span
          style={{
            fontSize: 9,
            padding: "1.5px 6px",
            borderRadius: 2,
            background: `${status.color}22`,
            color: status.color,
            fontWeight: 600,
            letterSpacing: "0.12em",
          }}
        >
          {status.label}
        </span>
      </div>
    </article>
  );
}

export { SEVERITY_LABEL, getSeverityInfo };
