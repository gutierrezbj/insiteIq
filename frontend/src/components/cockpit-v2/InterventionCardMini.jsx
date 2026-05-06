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

import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { getStatusInfo } from "./InterventionCardFull";
import { formatWoCode } from "../../lib/woCode";

const SEVERITY_COLORS = {
  critical: "#D63944",
  high:     "#E8A33D",
  medium:   "#3D4A66",
  normal:   "#3D4A66",
  low:      "#8B95A8",
};

function getSeverityInfo(severity) {
  const color = SEVERITY_COLORS[severity] || "#3D4A66";
  const t = i18n.t.bind(i18n);
  const key = `wo_severity.${severity}`;
  const i18nLabel = t(key);
  const label = i18nLabel === key ? t("wo_severity.normal") : i18nLabel;
  return { label, color };
}

export default function InterventionCardMini({ wo, site, onClick }) {
  const { t } = useTranslation("common");
  const status = getStatusInfo(wo?.status);
  const severity = getSeverityInfo(wo?.severity);

  return (
    <article
      className="stage-border-top bg-cl-surface rounded-sm p-3 transition cursor-pointer"
      style={{
        "--stage-color": status.color,
        border: "1px solid #E2E5EC",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#C8CDD8";
        e.currentTarget.style.background = "#FAFBFC";
        e.currentTarget.style.boxShadow = "0 2px 6px -1px rgba(10, 22, 40, 0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E2E5EC";
        e.currentTarget.style.background = "#FFFFFF";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <p
        className="font-mono text-[10px]"
        style={{ color: status.color, fontWeight: 700, marginTop: 3 }}
      >
        {formatWoCode(wo)}
      </p>
      {/* Site title navy strong (NO text-white) */}
      <h4
        className="font-jakarta text-[14px] leading-tight mt-1 mb-2 truncate"
        title={site?.name || wo?.site_name}
        style={{ color: "#0A1628", fontWeight: 700, letterSpacing: "-0.005em" }}
      >
        {site?.name || wo?.site_name || t("intervention.no_site")}
      </h4>
      <div className="flex items-center justify-between">
        <span
          className="font-jakarta uppercase"
          style={{
            fontSize: 10,
            color: severity.color,
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}
        >
          {severity.label}
        </span>
        <span
          className="font-jakarta"
          style={{
            fontSize: 9,
            padding: "2px 6px",
            borderRadius: 3,
            background: `${status.color}1A`,
            color: status.color,
            border: `1px solid ${status.color}55`,
            fontWeight: 700,
            letterSpacing: "0.12em",
          }}
        >
          {status.label}
        </span>
      </div>
    </article>
  );
}

export { SEVERITY_COLORS, getSeverityInfo };
