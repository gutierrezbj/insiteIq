/**
 * WoKanbanCard — card draggable del Kanban Intervenciones (Fase Epsilon).
 *
 * Extraído 1:1 de mocks/insiteiq_kanban_v2_static.html.
 * Design System v1.7 §5.1 (WO Card anatomy) + §3.6b (drag handle 6-dots).
 *
 * Anatomía:
 *   - Border-top 2px color stage
 *   - Top row: drag handle 6-dots SVG + prio badge + sub-stage label uppercase + warning icon si SLA
 *   - Title site (font-jakarta 15px white)
 *   - Mono code · client · city
 *   - Tags row: tipo intervención pill + shield pill
 *   - Descripción 2 lines truncate
 *   - Footer: tech con icon + tiempo relativo con icon
 *
 * Estados:
 *   - Hover: translateY(-1px) + shadow
 *   - is-dragging: opacity 0.4 scale(0.98)
 *
 * Props:
 *   - wo, site, tech, client
 *   - onClick(): callback cuando click (no drag) — abre modal
 *   - onDragStart(woId): handler cuando inicia drag
 *   - onDragEnd(): handler cuando termina drag
 */

import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { Icon, ICONS } from "../../lib/icons";
import { formatWoCode } from "../../lib/woCode";
import { getStatusInfo } from "../cockpit-v2/InterventionCardFull";
import { getSeverityInfo } from "../cockpit-v2/InterventionCardMini";
import { computeSlaInfo, getTag } from "../../lib/woFields";

const SHIELD_META = {
  bronze:      { hex: "#B45309", label: "Bronze" },
  bronze_plus: { hex: "#D97706", label: "Bronze+" },
  silver:      { hex: "#64748B", label: "Silver" },
  gold:        { hex: "#CA8A04", label: "Gold" },
};

function timeAgo(date) {
  if (!date) return "";
  const ts = new Date(date).getTime();
  if (Number.isNaN(ts)) return "";
  const t = i18n.t.bind(i18n);
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t("kanban.time_now");
  if (minutes < 60) return t("kanban.time_min_ago", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remMin = minutes % 60;
    return remMin > 0
      ? t("kanban.time_h_ago_with_min", { h: hours, m: remMin })
      : t("kanban.time_h_ago", { count: hours });
  }
  const days = Math.floor(hours / 24);
  return t("kanban.time_d_ago", { count: days });
}

/* Drag handle 6-dots SVG inline · Design System v1.7 §3.6b */
function DragHandle() {
  return (
    <svg
      className="drag-handle"
      width="8"
      height="14"
      viewBox="0 0 8 14"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="1.5" cy="1.5" r="1.2" />
      <circle cx="6.5" cy="1.5" r="1.2" />
      <circle cx="1.5" cy="7" r="1.2" />
      <circle cx="6.5" cy="7" r="1.2" />
      <circle cx="1.5" cy="12.5" r="1.2" />
      <circle cx="6.5" cy="12.5" r="1.2" />
    </svg>
  );
}

export default function WoKanbanCard({
  wo,
  site,
  tech,
  client,
  onClick,
  onDragStart,
  onDragEnd,
}) {
  const { t } = useTranslation("common");
  const status = getStatusInfo(wo?.status);
  const severity = getSeverityInfo(wo?.severity);
  const shield = SHIELD_META[site?.shield_level || wo?.shield_level] || null;
  const slaStatus = computeSlaInfo(wo).status;
  const hasSlaAlert = slaStatus === "BREACH" || slaStatus === "AT_RISK";

  const tag = getTag(wo);

  return (
    <article
      draggable
      data-code={wo.id}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", wo.id);
        // El handler externo añade is-dragging y body.drag-active
        onDragStart?.(wo.id, e);
      }}
      onDragEnd={(e) => {
        onDragEnd?.(e);
      }}
      onClick={(e) => {
        // Si la card está siendo arrastrada, no abre modal
        if (e.currentTarget.classList.contains("is-dragging")) return;
        onClick?.(wo);
      }}
      className="wo-kanban-card stage-border-top transition cursor-grab"
      style={{
        "--stage-color": status.color,
        padding: 14,
        borderRadius: "0 0 8px 8px",
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        transition: "transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease, border-color 180ms ease",
      }}
    >
      {/* Top row: drag handle + prio + sub-stage + warning */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <DragHandle />
          <span
            className="font-jakarta uppercase"
            style={{
              padding: "2px 7px",
              borderRadius: 3,
              color: severity.color,
              background: `${severity.color}14`,
              border: `1px solid ${severity.color}55`,
              fontSize: 10,
              letterSpacing: "0.08em",
              fontWeight: 700,
            }}
          >
            {severity.label?.toUpperCase()}
          </span>
          <span
            className="font-jakarta uppercase"
            style={{
              fontSize: 10,
              color: "#3D4A66",
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            {status.label}
          </span>
        </div>
        {hasSlaAlert && (
          <Icon icon={ICONS.dangerTriangle} size={14} color="#D63944" />
        )}
      </div>

      {/* Title navy strong (NO text-white) + meta */}
      <h3
        className="font-jakarta text-[15px] leading-tight mb-1"
        style={{ color: "#0A1628", fontWeight: 700, letterSpacing: "-0.005em" }}
      >
        {site?.name || wo?.site_name || t("intervention.no_site")}
      </h3>
      <div className="flex items-center gap-1.5 text-[12px] mb-2 flex-wrap" style={{ color: "#3D4A66" }}>
        <span className="font-mono text-[11px] text-cl-text-dim">{formatWoCode(wo)}</span>
        <span className="text-cl-text-dim">·</span>
        <span style={{ fontWeight: 500 }}>{client?.name || "—"}</span>
        {site?.city && (
          <>
            <span className="text-cl-text-dim">·</span>
            <span style={{ fontWeight: 500 }}>{site.city}</span>
          </>
        )}
      </div>

      {/* Tags row */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {tag && (
          <span
            className="font-jakarta px-2 py-0.5 text-[11px] rounded"
            style={{ background: "#F4F6F8", color: "#3D4A66", fontWeight: 600, border: "1px solid #E2E5EC" }}
          >
            {tag}
          </span>
        )}
        {shield && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-jakarta"
            style={{ background: `${shield.hex}1A`, color: shield.hex, border: `1px solid ${shield.hex}55`, fontWeight: 700 }}
          >
            <Icon icon={ICONS.shield} size={11} />
            {shield.label}
          </span>
        )}
      </div>

      {/* Description */}
      {wo?.description && (
        <p
          className="text-[12px] mb-3 leading-snug"
          style={{
            color: "#3D4A66",
            fontWeight: 400,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {wo.description}
        </p>
      )}

      {/* Footer: tech + tiempo relativo · border-top navy soft */}
      <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid #E2E5EC" }}>
        <div className="flex items-center gap-1.5 text-[11px]">
          {tech ? (
            <>
              <Icon icon={ICONS.user} size={12} color="#3D4A66" />
              <span style={{ color: "#0A1628", fontWeight: 600 }}>{tech.full_name || tech.name}</span>
            </>
          ) : (
            <span className="text-cl-text-dim italic">{t("intervention.unassigned")}</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-cl-text-dim font-mono">
          <Icon icon={ICONS.clock} size={11} />
          <span>{timeAgo(wo?.updated_at || wo?.created_at)}</span>
        </div>
      </div>
    </article>
  );
}
