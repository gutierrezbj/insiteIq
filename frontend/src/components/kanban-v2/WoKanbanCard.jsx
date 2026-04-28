/**
 * WoKanbanCard — card draggable del Kanban Intervenciones (Fase Epsilon).
 *
 * Extraído 1:1 de mocks/insiteiq_kanban_v2_static.html.
 * Design System v1.7 §5.1 (WO Card anatomy) + §3.6b (drag handle 6-dots).
 *
 * Anatomía:
 *   - Border-top 2px color stage
 *   - Top row: drag handle 6-dots SVG + prio badge + sub-stage label uppercase + warning icon si SLA
 *   - Title site (font-display 15px white)
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

import { Icon, ICONS } from "../../lib/icons";
import { formatWoCode } from "../../lib/woCode";
import { getStatusInfo } from "../cockpit-v2/InterventionCardFull";
import { getSeverityInfo } from "../cockpit-v2/InterventionCardMini";

const SHIELD_META = {
  bronze:      { hex: "#B45309", label: "Bronze" },
  bronze_plus: { hex: "#D97706", label: "Bronze+" },
  silver:      { hex: "#64748B", label: "Silver" },
  gold:        { hex: "#CA8A04", label: "Gold" },
};

function timeAgo(date) {
  if (!date) return "";
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return "";
  const diffMs = Date.now() - t;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h${minutes % 60 > 0 ? ` ${minutes % 60}min` : ""}`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
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
  const status = getStatusInfo(wo?.status);
  const severity = getSeverityInfo(wo?.severity);
  const shield = SHIELD_META[site?.shield_level || wo?.shield_level] || null;
  const hasSlaAlert = wo?.sla_status === "breach" || wo?.sla_status === "at_risk";

  const tag = wo?.intervention_type || wo?.tag || wo?.kind;

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
      className="wo-kanban-card stage-border-top bg-wr-surface border border-wr-border hover:border-wr-border-strong transition cursor-grab"
      style={{
        "--stage-color": status.color,
        padding: 14,
        borderRadius: "0 0 8px 8px",
        transition: "transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease",
      }}
    >
      {/* Top row: drag handle + prio + sub-stage + warning */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <DragHandle />
          <span
            className="label-caps-v2"
            style={{
              padding: "1.5px 6px",
              borderRadius: 2,
              color: severity.color,
              background: `${severity.color}1A`,
              fontSize: 10,
              letterSpacing: "0.06em",
              fontWeight: 600,
            }}
          >
            {severity.label?.toUpperCase()}
          </span>
          <span className="label-caps-v2 text-wr-text-dim">{status.label}</span>
        </div>
        {hasSlaAlert && (
          <Icon icon={ICONS.dangerTriangle} size={14} color="#DC2626" />
        )}
      </div>

      {/* Title + meta */}
      <h3 className="font-display text-[15px] font-semibold text-white leading-tight mb-1">
        {site?.name || wo?.site_name || "Sin sitio"}
      </h3>
      <div className="flex items-center gap-1.5 text-[12px] text-wr-text-mid mb-2 flex-wrap">
        <span className="font-mono text-[11px] text-wr-text-dim">{formatWoCode(wo)}</span>
        <span className="text-wr-text-dim">·</span>
        <span>{client?.name || "—"}</span>
        {site?.city && (
          <>
            <span className="text-wr-text-dim">·</span>
            <span>{site.city}</span>
          </>
        )}
      </div>

      {/* Tags row */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {tag && (
          <span className="px-2 py-0.5 text-[11px] rounded bg-wr-surface-2 text-wr-text-mid">
            {tag}
          </span>
        )}
        {shield && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ background: `${shield.hex}26`, color: shield.hex }}
          >
            <Icon icon={ICONS.shield} size={11} />
            {shield.label}
          </span>
        )}
      </div>

      {/* Description */}
      {wo?.description && (
        <p
          className="text-[12px] text-wr-text-dim mb-3 leading-snug"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {wo.description}
        </p>
      )}

      {/* Footer: tech + tiempo relativo */}
      <div className="flex items-center justify-between pt-2 border-t border-wr-border">
        <div className="flex items-center gap-1.5 text-[11px]">
          {tech ? (
            <>
              <Icon icon={ICONS.user} size={12} color="#9CA3AF" />
              <span className="text-wr-text-mid">{tech.full_name || tech.name}</span>
            </>
          ) : (
            <span className="text-wr-text-dim italic">Sin asignar</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-wr-text-dim">
          <Icon icon={ICONS.clock} size={11} />
          <span>{timeAgo(wo?.updated_at || wo?.created_at)}</span>
        </div>
      </div>
    </article>
  );
}
