/**
 * WoStageModal — Modal context-aware con CTAs por stage.
 *
 * Extraído 1:1 de mocks/insiteiq_kanban_v2_static.html.
 * Design System v1.7 §5.3 (Modal context-aware · LO MÁS IMPORTANTE).
 *
 * Estructura común:
 *   - Overlay rgba(10,10,10,0.55) con animación fade
 *   - Panel centrado 560px, bg #0A0A0A, radius 12, animación scale + slide
 *   - Header: stage badge color + prio badge + SLA alert si aplica + close X
 *   - Title block: WO code + site name bold + city + shield + tipo
 *   - Sections con label uppercase tracking-wide:
 *       · DESCRIPCIÓN
 *       · ALCANCE
 *       · TIMELINE (con dots done/active/error/pending)
 *       · RESULTADO (solo si stage >= resolved)
 *       · NIVEL RIESGO (solo si stage == closed)
 *       · RAZÓN CANCELACIÓN (solo si cancelled)
 *   - Footer: nota explicativa del CTA + Cerrar + CTA primary
 *
 * Tabla CTA por stage (DS v1.7 §5.3):
 *   intake → "Triagear" cyan
 *   triage → "Preparar intervención" violeta
 *   pre_flight → "Despachar" violeta-dark
 *   dispatched → "Esperando confirmación tech" disabled amber
 *   en_route → "Llegar al sitio" naranja
 *   on_site → "Marcar como resuelta" verde
 *   resolved → "Cerrar intervención" verde-dark
 *   closed → "Descargar informe" verde-dark terminal
 *   cancelled → readonly
 *
 * Props:
 *   - wo, site, tech, client (datos completos)
 *   - open
 *   - onClose
 *   - onAdvance(targetStage) → llama API advance
 */

import { useEffect } from "react";
import { Icon, ICONS } from "../../lib/icons";
import { formatWoCode } from "../../lib/woCode";
import { getStatusInfo } from "../cockpit-v2/InterventionCardFull";
import { getSeverityInfo } from "../cockpit-v2/InterventionCardMini";
import { computeSlaInfo, getTag, buildTimeline } from "../../lib/woFields";

const STAGE_CTA = {
  intake:      { label: "Triagear",                      target: "triage",     bg: "#0EA5E9", note: "Mover a evaluación interna." },
  triage:      { label: "Preparar intervención",         target: "pre_flight", bg: "#8B5CF6", note: "Inicia la lista de preparación SRS." },
  pre_flight:  { label: "Despachar",                     target: "dispatched", bg: "#7C3AED", note: "Requiere lista de preparación completa." },
  dispatched:  { label: "Esperando confirmación del técnico", target: null,    bg: "#F59E0B", note: "Bloqueado hasta que el técnico firme la preparación.", disabled: true },
  assigned:    { label: "Esperando confirmación del técnico", target: null,    bg: "#F59E0B", note: "Bloqueado hasta que el técnico firme la preparación.", disabled: true },
  en_route:    { label: "Llegar al sitio",               target: "on_site",    bg: "#EA580C", note: "Confirmar arribo del técnico." },
  on_site:     { label: "Marcar como resuelta",          target: "resolved",   bg: "#22C55E", note: "Requiere captura de evidencia." },
  in_progress: { label: "Marcar como resuelta",          target: "resolved",   bg: "#22C55E", note: "Requiere captura de evidencia." },
  resolved:    { label: "Cerrar intervención",           target: "closed",     bg: "#16A34A", note: "Requiere firma del cliente (o autorización SRS)." },
  in_closeout: { label: "Cerrar intervención",           target: "closed",     bg: "#16A34A", note: "Requiere firma del cliente (o autorización SRS)." },
  closed:      { label: "Descargar informe",             target: null,         bg: "#16A34A", note: "Informe emitido a 5 canales. PDF firmado.", terminal: true },
  completed:   { label: "Descargar informe",             target: null,         bg: "#16A34A", note: "Informe emitido a 5 canales. PDF firmado.", terminal: true },
  cancelled:   { label: null,                            target: null,         readonly: true, note: "Intervención cancelada. Ver razón abajo." },
};

const SHIELD_META = {
  bronze:      { hex: "#B45309", label: "Bronze" },
  bronze_plus: { hex: "#D97706", label: "Bronze+" },
  silver:      { hex: "#64748B", label: "Silver" },
  gold:        { hex: "#CA8A04", label: "Gold" },
};

export default function WoStageModal({
  wo,
  site,
  tech,
  client,
  open,
  onClose,
  onAdvance,
}) {
  // ESC para cerrar
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !wo) return null;

  const status = getStatusInfo(wo.status);
  const severity = getSeverityInfo(wo.severity);
  const cta = STAGE_CTA[wo.status] || STAGE_CTA.intake;
  const shield = SHIELD_META[site?.shield_level || wo?.shield_level];
  const tag = getTag(wo);
  const showResult = ["resolved", "in_closeout", "closed", "completed"].includes(wo.status);
  const showRisk = wo.status === "closed" || wo.status === "completed";
  const showReason = wo.status === "cancelled";
  const slaStatus = computeSlaInfo(wo).status;
  const hasSlaAlert = slaStatus === "BREACH" || slaStatus === "AT_RISK";
  // Timeline construido si el WO no trae uno explícito.
  const timelineItems = Array.isArray(wo?.timeline_items) && wo.timeline_items.length > 0
    ? wo.timeline_items
    : buildTimeline(wo, tech?.full_name || tech?.name);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 10, 10, 0.55)",
        zIndex: 50,
        padding: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflowY: "auto",
        animation: "overlayIn 200ms ease",
      }}
    >
      <div
        style={{
          background: "#0A0A0A",
          width: 560,
          maxWidth: "100%",
          maxHeight: "calc(100vh - 48px)",
          borderRadius: 12,
          border: "1px solid #2A2A2A",
          boxShadow: "0 20px 40px -8px rgba(0, 0, 0, 0.7), 0 8px 16px -4px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "JetBrains Mono, monospace",
          animation: "panelIn 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: "14px 20px 12px", borderBottom: "1px solid #1F1F1F" }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5"
              style={{
                padding: "3px 8px",
                borderRadius: 4,
                background: `${status.color}22`,
                color: status.color,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
              {status.label}
            </span>
            <span
              className="label-caps-v2"
              style={{
                padding: "1.5px 6px",
                borderRadius: 2,
                color: severity.color,
                background: `${severity.color}1A`,
                fontWeight: 600,
              }}
            >
              {severity.label?.toUpperCase()}
            </span>
            {hasSlaAlert && (
              <span
                className="inline-flex items-center gap-1"
                style={{
                  padding: "1.5px 6px",
                  borderRadius: 2,
                  background: "#DC262622",
                  color: "#DC2626",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                }}
              >
                <Icon icon={ICONS.dangerTriangle} size={11} />
                SLA EN RIESGO
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-wr-text-dim hover:text-wr-amber transition cursor-pointer p-1 flex items-center"
            aria-label="Cerrar"
          >
            <Icon icon={ICONS.close} size={22} />
          </button>
        </header>

        {/* Title block */}
        <div style={{ padding: "16px 20px 14px" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-wr-text-dim mb-1">{formatWoCode(wo)}</p>
              <h2
                className="font-display text-white leading-tight"
                style={{ fontSize: 24, fontWeight: 700, margin: 0 }}
              >
                {site?.name || wo?.site_name || "Sin sitio"}
              </h2>
              <p className="text-[13px] text-wr-text-mid mt-1">
                {client?.name && <span>{client.name}</span>}
                {site?.city && (
                  <>
                    {client?.name ? " · " : ""}
                    {site.city}
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {shield && (
                <span
                  className="inline-flex items-center gap-1"
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 500,
                    background: `${shield.hex}26`,
                    color: shield.hex,
                  }}
                >
                  <Icon icon={ICONS.shield} size={11} />
                  {shield.label}
                </span>
              )}
              {tag && (
                <span
                  className="px-2 py-0.5 text-[11px] rounded bg-wr-surface-2 text-wr-text-mid"
                >
                  {tag}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content scrollable */}
        <div
          className="wr-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* Descripción */}
          {wo?.description && (
            <section>
              <div className="label-caps-v2 mb-1.5" style={{ color: "#94A3B8", letterSpacing: "0.14em" }}>
                Descripción
              </div>
              <p className="text-[13px] text-wr-text leading-relaxed m-0">{wo.description}</p>
            </section>
          )}

          {/* Alcance */}
          {wo?.scope && (
            <section>
              <div className="label-caps-v2 mb-1.5" style={{ color: "#94A3B8", letterSpacing: "0.14em" }}>
                Alcance
              </div>
              <p className="text-[13px] text-wr-text-mid leading-relaxed m-0">{wo.scope}</p>
            </section>
          )}

          {/* Timeline · construido desde handshakes/status si el WO no trae uno */}
          {timelineItems.length > 0 && (
            <section>
              <div className="label-caps-v2 mb-1.5" style={{ color: "#94A3B8", letterSpacing: "0.14em" }}>
                Timeline
              </div>
              <div>
                {timelineItems.map((item, idx) => {
                  const kindClass = item.kind === "done" ? "is-done"
                    : item.kind === "active" ? "is-active"
                    : item.kind === "error" ? "is-error"
                    : "";
                  const labelColor = item.kind === "pending" ? "#6B7280"
                    : item.kind === "error" ? "#DC2626"
                    : item.kind === "active" ? "#F59E0B"
                    : "#E5E5E5";
                  return (
                    <div className="detail-tl-item" key={idx}>
                      <div className={`detail-tl-dot ${kindClass}`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex justify-between gap-3 items-center">
                          <span style={{ fontSize: 12, color: labelColor, fontWeight: 500 }}>
                            {item.label}
                          </span>
                          <span className="text-[10px] text-wr-text-dim">{item.time || ""}</span>
                        </div>
                        {item.detail && (
                          <p className="text-[11px] text-wr-text-mid mt-0.5 leading-snug">
                            {item.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Resultado */}
          {showResult && wo?.result && (
            <section>
              <div className="label-caps-v2 mb-1.5" style={{ color: "#94A3B8", letterSpacing: "0.14em" }}>
                Resultado
              </div>
              <p className="text-[13px] text-wr-text leading-relaxed m-0">{wo.result}</p>
            </section>
          )}

          {/* Nivel riesgo */}
          {showRisk && (
            <section>
              <div className="label-caps-v2 mb-1.5" style={{ color: "#94A3B8", letterSpacing: "0.14em" }}>
                Nivel riesgo
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    background: "#22C55E22",
                    color: "#22C55E",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  <Icon icon={ICONS.checkCircle} size={13} />
                  {wo.risk_level || "Nominal"}
                </span>
                {wo.risk_note && (
                  <span className="text-[12px] text-wr-text-mid">{wo.risk_note}</span>
                )}
              </div>
            </section>
          )}

          {/* Razón cancelación */}
          {showReason && wo?.cancellation_reason && (
            <section>
              <div className="label-caps-v2 mb-1.5" style={{ color: "#94A3B8", letterSpacing: "0.14em" }}>
                Razón cancelación
              </div>
              <p className="text-[13px] text-wr-text leading-relaxed m-0">
                {wo.cancellation_reason}
              </p>
            </section>
          )}
        </div>

        {/* Footer */}
        <footer
          className="flex items-center justify-between gap-3 flex-shrink-0"
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #1F1F1F",
            background: "rgba(20, 20, 20, 0.5)",
            borderRadius: "0 0 12px 12px",
          }}
        >
          <p className="text-[12px] text-wr-text-dim flex-1">{cta.note}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="cursor-pointer transition rounded-md"
              style={{
                height: 36,
                padding: "0 16px",
                fontSize: 13,
                fontWeight: 500,
                color: "#9CA3AF",
                background: "transparent",
                border: "1px solid #2A2A2A",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Cerrar
            </button>
            {!cta.readonly && cta.label && (
              <button
                onClick={() => {
                  if (cta.disabled) return;
                  if (cta.terminal) {
                    // Acción terminal (ej descargar PDF) — caller decide qué hacer
                    onAdvance?.(null, "download");
                    return;
                  }
                  if (cta.target) onAdvance?.(cta.target);
                }}
                disabled={cta.disabled}
                className="cursor-pointer transition rounded-md flex items-center gap-1.5"
                style={{
                  height: 36,
                  padding: "0 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: cta.bg,
                  color: "#FFFFFF",
                  border: "none",
                  opacity: cta.disabled ? 0.5 : 1,
                  fontFamily: "JetBrains Mono, monospace",
                  cursor: cta.disabled ? "not-allowed" : "pointer",
                }}
              >
                {cta.label}
                {cta.target && <Icon icon={ICONS.arrowRight} size={14} />}
              </button>
            )}
          </div>
        </footer>
      </div>

      {/* Animations inyectadas inline para no depender de Tailwind keyframes */}
      <style>{`
        @keyframes overlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes panelIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
