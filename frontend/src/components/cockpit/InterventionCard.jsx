/**
 * InterventionCard · 1 WO activa.
 *
 * Corporativa, densa, accionable. Sin decoración.
 * Muestra alertas asociadas inline (máx 3) y botón "más detalles"
 * que abre drawer a la derecha.
 */
import { SeverityIcon, KindIcon, KIND_LABEL } from "./alertIcons";

const SEV_BORDER = {
  critical: "border-l-[3px] border-l-danger",
  high:     "border-l-[3px] border-l-primary",
  medium:   "border-l-[3px] border-l-surface-border",
  low:      "border-l-[3px] border-l-surface-border",
};

const STATUS_TINT = {
  assigned:    "text-text-tertiary",
  dispatched:  "text-primary-light",
  en_route:    "text-primary-light",
  on_site:     "text-primary-light",
  in_progress: "text-success",
  in_closeout: "text-text-secondary",
};

function ageShort(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 24) return rem ? `${h}h${String(rem).padStart(2, "0")}` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d${h % 24}h`;
}

function slaLabel(wo) {
  // Sin deadline explícito por ahora · derivamos de ball_in_court age
  // contra umbral heurístico. Mejorará cuando SLA deadline vaya al modelo.
  const since = wo?.ball_in_court?.since;
  if (!since) return null;
  const hrs = (Date.now() - new Date(since).getTime()) / 36e5;
  if (hrs > 8) return { text: "BREACH", tone: "danger" };
  if (hrs > 4) return { text: `${Math.round((8 - hrs) * 60)}m`, tone: "warn" };
  return { text: `${Math.round((8 - hrs) * 10) / 10}h`, tone: "ok" };
}

export default function InterventionCard({
  wo,
  site,
  client,
  tech,
  alerts = [],
  selected = false,
  onSelect,
  onMoreDetails,
}) {
  const border = SEV_BORDER[wo.severity] || SEV_BORDER.medium;
  const statusCls = STATUS_TINT[wo.status] || "text-text-tertiary";
  const sla = slaLabel(wo);
  const visibleAlerts = alerts.slice(0, 3);
  const hiddenCount = Math.max(0, alerts.length - 3);

  return (
    <div
      onClick={() => onSelect?.(wo)}
      className={`${border} bg-surface-raised rounded-sm px-3.5 py-3 transition-colors duration-fast cursor-pointer
        ${selected ? "bg-surface-overlay ring-1 ring-primary/60" : "hover:bg-surface-overlay/50"}`}
    >
      {/* Top row: ref · status · severity · age */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[11px] text-text-primary leading-none">
          {wo.reference}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">·</span>
        <span className={`font-mono text-[10px] uppercase tracking-widest-srs ${statusCls}`}>
          {wo.status}
        </span>
        {wo.severity && (
          <>
            <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">·</span>
            <span className={`font-mono text-[10px] uppercase tracking-widest-srs
              ${wo.severity === "critical" ? "text-danger"
                : wo.severity === "high" ? "text-primary-light"
                : "text-text-tertiary"}`}>
              {wo.severity}
            </span>
          </>
        )}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary tabular-nums">
          {ageShort(wo.created_at)}
        </span>
      </div>

      {/* Title */}
      <div className="font-display text-sm text-text-primary leading-snug mb-1.5 truncate">
        {wo.title}
      </div>

      {/* Meta grid: site · tech · ball · SLA */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-2 text-xs">
        <div className="truncate">
          <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">site </span>
          <span className="text-text-secondary font-body">
            {site ? `${site.code} · ${site.country}` : "—"}
          </span>
        </div>
        <div className="truncate">
          <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">cli </span>
          <span className="text-text-secondary font-body">
            {client?.display_name || client?.legal_name || "—"}
          </span>
        </div>
        <div className="truncate">
          <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">tech </span>
          <span className="text-text-secondary font-body">
            {tech?.full_name || tech?.email?.split("@")[0] || "sin asignar"}
          </span>
        </div>
        <div className="truncate">
          <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">ball </span>
          <span className="text-text-secondary font-body uppercase">
            {wo?.ball_in_court?.side || "—"}{" "}
            <span className="text-text-tertiary font-mono tabular-nums">
              {ageShort(wo?.ball_in_court?.since)}
            </span>
          </span>
        </div>
      </div>

      {/* SLA pill */}
      {sla && (
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">sla</span>
          <span
            className={`font-mono text-[10px] uppercase tracking-widest-srs tabular-nums px-1.5 py-0.5 rounded-sm border
              ${sla.tone === "danger" ? "text-danger border-danger/50 bg-danger/5"
                : sla.tone === "warn" ? "text-primary-light border-primary/50 bg-primary/5"
                : "text-text-secondary border-surface-border"}`}
          >
            {sla.text}
          </span>
        </div>
      )}

      {/* Alerts inline */}
      {visibleAlerts.length > 0 && (
        <div className="border-t border-surface-border/60 pt-2 space-y-1 mb-2">
          {visibleAlerts.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-xs">
              <SeverityIcon severity={a.severity} size={12} />
              <KindIcon kind={a.kind} size={11} />
              <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">
                {KIND_LABEL[a.kind] || a.kind}
              </span>
              <span className="text-text-secondary font-body truncate flex-1">
                {a.title}
              </span>
            </div>
          ))}
          {hiddenCount > 0 && (
            <div className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">
              +{hiddenCount} alertas mas
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoreDetails?.(wo);
          }}
          className="font-mono text-[10px] uppercase tracking-widest-srs text-text-secondary hover:text-primary-light transition-colors duration-fast"
        >
          mas detalles →
        </button>
      </div>
    </div>
  );
}
