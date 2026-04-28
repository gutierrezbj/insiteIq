/**
 * SideDetailPanel — panel lateral derecho 520px slide-in
 *
 * Extraído 1:1 de mocks/insiteiq_map_srs_dark_v2_static.html (líneas 851-1100).
 * Design System v1.7 §5.3 + §3.6a (timezone-aware obligatorio).
 *
 * Estructura:
 *   - Header sticky: WO code + SLA badge timer + close
 *   - Status row: dot stage + STATUS + SEVERITY + Shield label
 *   - Title: site name (Instrument Sans 20px) + ID + city + client
 *   - Body scrollable:
 *     · Warning banner (si site.warning)
 *     · Timezone block (regla §3.6a) — hora local mono 28px + estado + offset
 *     · Metadata grid 2x2: BALL / TECH / TAG / AUDIT
 *     · Descripción
 *     · Alcance
 *     · Timeline vertical con dots (done / active / error / pending)
 *     · Threads shared (cyan) + internal (amber)
 *     · Parts (si aplica) con estado IN_STOCK/EN_TRANSITO
 *     · Briefing/Capture/Report status cards
 *     · Audit log reciente
 *   - Footer sticky: overflow dots + Cerrar + CTA amber "Escalar ball → cliente"
 *
 * Props:
 *   wo, site, tech, client, agreement, alerts, threads, parts, briefing, capture, report, audit, open, onClose, onEscalate
 */

import { useEffect } from "react";
import { Icon, ICONS } from "../../lib/icons";
import { getTechTimeInfo, VIEWER_TZ_LABEL } from "../../lib/tz";
import { formatWoCode } from "../../lib/woCode";
import { getStatusInfo } from "../cockpit-v2/InterventionCardFull";
import { getSeverityInfo } from "../cockpit-v2/InterventionCardMini";

const SLA_BADGE = {
  BREACH:  { label: "BREACH",  bg: "#DC262622", color: "#DC2626", border: "#DC2626" },
  AT_RISK: { label: "AT RISK", bg: "#F59E0B22", color: "#F59E0B", border: "#F59E0B" },
  OK:      { label: "OK",      bg: "#22C55E22", color: "#22C55E", border: "#22C55E" },
};

function getSlaBadge(slaStatus) {
  const key = (slaStatus || "OK").toUpperCase().replace("_RISK", "_RISK");
  return SLA_BADGE[key] || SLA_BADGE.OK;
}

/* Sub-componente: Timezone block */
function TimezoneBlock({ tech }) {
  if (!tech) return null;
  const techName = tech.full_name || tech.name;
  const info = getTechTimeInfo(techName);
  if (!info) return null;

  return (
    <section
      className="rounded-sm"
      style={{
        padding: "12px 14px",
        background: `${info.color}0F`,
        border: `1px solid ${info.color}33`,
        borderLeft: `3px solid ${info.color}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[9px]"
          style={{ color: "#6B7280", letterSpacing: "0.14em", textTransform: "uppercase" }}
        >
          Hora del técnico
        </span>
        <span
          style={{
            fontSize: 10,
            padding: "2px 7px",
            borderRadius: 2,
            background: `${info.color}22`,
            color: info.color,
            fontWeight: 600,
            letterSpacing: "0.12em",
          }}
        >
          {info.label}
        </span>
      </div>
      <div className="flex items-baseline gap-3 mb-2">
        <span
          className="font-mono"
          style={{ fontSize: 28, fontWeight: 600, color: "#FFFFFF", lineHeight: 1 }}
        >
          {info.techTime}
        </span>
        <span
          className="text-[11px]"
          style={{ color: "#9CA3AF", letterSpacing: "0.14em", textTransform: "uppercase" }}
        >
          {info.tzLabel}
        </span>
        <span className="text-[11px] text-wr-text-dim">·</span>
        <span className="text-[12px] text-wr-text-mid">{techName}</span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-wr-text-dim font-mono">
        <span>Tú estás en {info.viewerTime} {VIEWER_TZ_LABEL}</span>
        <span>·</span>
        <span style={{ color: info.diffHours !== 0 ? "#F59E0B" : "#9CA3AF" }}>
          {info.offsetText}
        </span>
        {info.untilEndOfDay && (
          <>
            <span>·</span>
            <span>fin jornada en {info.untilEndOfDay}</span>
          </>
        )}
      </div>
      {info.shouldNotDisturb && (
        <div
          className="mt-2 pt-2 flex items-center gap-1.5 text-[11px]"
          style={{ borderTop: `1px solid ${info.color}22`, color: info.color }}
        >
          <Icon icon={ICONS.moon} size={13} />
          <span>No contactar salvo emergencia crítica · escalación vía Luis (Lima CET cover)</span>
        </div>
      )}
    </section>
  );
}

/* Sub-componente: Timeline */
function TimelineSection({ items = [] }) {
  if (!items.length) {
    return (
      <p className="text-[11px] text-wr-text-dim italic">Sin eventos registrados.</p>
    );
  }
  return items.map((item, idx) => {
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
  });
}

/* Sub-componente: Thread */
function ThreadList({ messages = [], kind }) {
  if (!messages.length) {
    return <p className="text-[11px] text-wr-text-dim italic py-2">Sin mensajes.</p>;
  }
  const accentColor = kind === "shared" ? "#06B6D4" : "#F59E0B";
  return messages.map((m, idx) => (
    <div key={idx} className="py-2 border-b border-wr-border last:border-0">
      <div className="flex justify-between items-center gap-2 mb-1">
        <span className="text-[11px]" style={{ color: accentColor, fontWeight: 500 }}>
          {m.who}
        </span>
        <span className="text-[10px] text-wr-text-dim">
          {m.when}{m.pending ? " · pending reply" : ""}
        </span>
      </div>
      <p className="text-[12px] text-wr-text leading-relaxed m-0">{m.msg}</p>
    </div>
  ));
}

/* Sub-componente: Parts */
function PartsTable({ parts = [] }) {
  if (!parts.length) return null;
  return (
    <div className="border border-wr-border rounded-sm">
      {parts.map((p, idx) => {
        const stateColor = p.status === "IN_STOCK" ? "#22C55E"
          : p.status === "EN_TRANSITO" ? "#F59E0B"
          : "#DC2626";
        return (
          <div
            key={idx}
            className="px-3 py-2.5"
            style={idx > 0 ? { borderTop: "1px solid #1F1F1F" } : {}}
          >
            <div className="flex justify-between gap-2 items-center mb-1">
              <span className="text-[11px]" style={{ color: "#F59E0B", fontWeight: 500 }}>
                {p.code}
              </span>
              <span
                className="text-[10px]"
                style={{ color: stateColor, fontWeight: 600, letterSpacing: "0.1em" }}
              >
                {p.status?.replace("_", " ")}
              </span>
            </div>
            <p className="text-[12px] text-wr-text mb-1">
              {p.desc} <span className="text-wr-text-dim">× {p.qty}</span>
            </p>
            {p.detail && (
              <p className="text-[11px] text-wr-text-mid leading-snug">{p.detail}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* Sub-componente: Doc cycle (Briefing/Capture/Report) */
function DocCycleGrid({ briefing, capture, report }) {
  const items = [
    { label: "Briefing", state: briefing?.status || "PENDING", detail: briefing?.signed_by || "sin firmar" },
    { label: "Capture", state: capture?.status || "PENDING", detail: capture?.photos ? `${capture.photos} fotos` : "sin evidencia" },
    { label: "Report", state: report?.status || "PENDING", detail: report?.reason ? report.reason.slice(0, 40) : "ok" },
  ];
  const colorFor = (s) =>
    s === "SIGNED" || s === "COMPLETE" || s === "EMITTED" ? "#22C55E"
      : s === "PARTIAL" || s === "PENDING" ? "#F59E0B"
      : "#DC2626";

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it) => (
        <div key={it.label} className="p-2.5 border border-wr-border rounded-sm">
          <p className="text-[9px] text-wr-text-dim uppercase mb-1" style={{ letterSpacing: "0.14em" }}>
            {it.label}
          </p>
          <p
            className="text-[11px] mb-0.5"
            style={{ color: colorFor(it.state), fontWeight: 600, letterSpacing: "0.1em" }}
          >
            {it.state}
          </p>
          <p className="text-[10px] text-wr-text-mid leading-snug">{it.detail}</p>
        </div>
      ))}
    </div>
  );
}

/* Componente principal */
export default function SideDetailPanel({
  wo,
  site,
  tech,
  client,
  shieldLevel,
  warning,
  description,
  scope,
  timeline,
  threadsShared,
  threadsInternal,
  parts,
  briefing,
  capture,
  report,
  auditCount,
  auditRecent,
  open,
  onClose,
  onEscalate,
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

  if (!wo && !open) return null;

  const status = getStatusInfo(wo?.status);
  const severity = getSeverityInfo(wo?.severity);
  const sla = getSlaBadge(wo?.sla_status || wo?.sla?.status);
  const slaTime = wo?.sla?.time_to_breach || wo?.sla_time || "—";

  return (
    <>
      <div
        className={`detail-overlay${open ? " is-open" : ""}`}
        onClick={onClose}
      />
      <aside
        className={`detail-panel${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        {wo && (
          <>
            {/* Header sticky */}
            <header className="flex-shrink-0 border-b border-wr-border bg-wr-bg">
              <div className="px-[18px] pt-3.5 pb-2.5 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: severity.color, fontWeight: 600 }}
                  >
                    {formatWoCode(wo)}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 7px",
                      borderRadius: 2,
                      background: sla.bg,
                      color: sla.color,
                      border: `1px solid ${sla.border}`,
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                    }}
                  >
                    {sla.label} · {slaTime}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="bg-transparent border-0 text-wr-text-dim hover:text-wr-amber transition cursor-pointer p-1 flex items-center"
                  aria-label="Cerrar"
                >
                  <Icon icon={ICONS.close} size={22} />
                </button>
              </div>

              <div className="px-[18px] pb-2.5 flex items-center gap-2.5">
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{ fontSize: 10, color: status.color, fontWeight: 600, letterSpacing: "0.12em" }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: status.color }}
                  />
                  {status.label}
                </span>
                <span style={{ fontSize: 10, color: severity.color, fontWeight: 600, letterSpacing: "0.12em" }}>
                  · {severity.label}
                </span>
                {shieldLevel && (
                  <span className="text-[10px] text-wr-text-dim">· {shieldLevel} Shield</span>
                )}
              </div>

              <div className="px-[18px] pb-4">
                <h2
                  id="detail-title"
                  className="font-display text-[20px] font-semibold text-white m-0 leading-tight"
                >
                  {site?.name || wo?.site_name || "Sin sitio"}
                </h2>
                <p className="text-[11px] text-wr-text-dim m-0">
                  <span className="text-wr-text-mid">{site?.code || site?.id || "—"}</span>
                  {site?.city && <span> · {site.city}</span>}
                  {site?.country && <span>, {site.country}</span>}
                  {client?.name && <span> · {client.name}</span>}
                </p>
              </div>
            </header>

            {/* Body scrollable */}
            <div
              className="wr-scroll"
              style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 20 }}
            >
              {/* Warning banner */}
              {warning && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: "rgba(245, 158, 11, 0.06)",
                    borderLeft: "2px solid #F59E0B",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon icon={ICONS.dangerTriangle} size={13} color="#F59E0B" />
                    <span style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600, letterSpacing: "0.1em" }}>
                      {warning.type?.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[12px] text-wr-text leading-relaxed m-0">{warning.detail}</p>
                </div>
              )}

              {/* Timezone block */}
              <TimezoneBlock tech={tech} />

              {/* Metadata grid 2x2 */}
              <section>
                <div className="text-[10px] text-wr-text-dim uppercase mb-2" style={{ letterSpacing: "0.14em", fontWeight: 600 }}>
                  Referencias
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <div>
                    <p className="text-[9px] text-wr-text-dim uppercase mb-0.5" style={{ letterSpacing: "0.14em" }}>BALL</p>
                    <p
                      className="text-[13px] m-0"
                      style={{
                        color: wo?.ball_in_court?.party === "srs" ? "#F59E0B"
                          : wo?.ball_in_court?.party === "client" ? "#DC2626"
                          : "#E5E5E5",
                        fontWeight: 500,
                      }}
                    >
                      {wo?.ball_in_court?.party?.toUpperCase() || "—"}
                      {wo?.ball_in_court?.since && (
                        <span className="text-wr-text-dim font-normal"> · stuck</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-wr-text-dim uppercase mb-0.5" style={{ letterSpacing: "0.14em" }}>TECH</p>
                    <p className="text-[13px] m-0" style={{ color: tech ? "#E5E5E5" : "#6B7280" }}>
                      {tech?.full_name || tech?.name || "Sin asignar"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-wr-text-dim uppercase mb-0.5" style={{ letterSpacing: "0.14em" }}>TAG</p>
                    <p className="text-[13px] text-wr-text m-0">
                      {wo?.intervention_type || wo?.tag || wo?.kind || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-wr-text-dim uppercase mb-0.5" style={{ letterSpacing: "0.14em" }}>AUDIT LOG</p>
                    <p className="text-[13px] text-wr-text m-0">{auditCount ?? 0} eventos</p>
                  </div>
                </div>
              </section>

              {/* Description */}
              {description && (
                <section>
                  <div className="text-[10px] text-wr-text-dim uppercase mb-2" style={{ letterSpacing: "0.14em", fontWeight: 600 }}>
                    Descripción
                  </div>
                  <p className="text-[12px] text-wr-text leading-relaxed m-0">{description}</p>
                </section>
              )}

              {/* Scope */}
              {scope && (
                <section>
                  <div className="text-[10px] text-wr-text-dim uppercase mb-2" style={{ letterSpacing: "0.14em", fontWeight: 600 }}>
                    Alcance
                  </div>
                  <p className="text-[12px] text-wr-text-mid leading-relaxed m-0">{scope}</p>
                </section>
              )}

              {/* Timeline */}
              {timeline && timeline.length > 0 && (
                <section>
                  <div
                    className="text-[10px] text-wr-text-dim uppercase mb-2 flex items-center justify-between"
                    style={{ letterSpacing: "0.14em", fontWeight: 600 }}
                  >
                    <span>Timeline</span>
                    <span className="text-[10px] text-wr-text-dim normal-case" style={{ letterSpacing: 0, fontWeight: 400 }}>
                      {timeline.filter((t) => t.kind === "done").length}/{timeline.length}
                    </span>
                  </div>
                  <div>
                    <TimelineSection items={timeline} />
                  </div>
                </section>
              )}

              {/* Threads shared */}
              {threadsShared && (
                <section>
                  <div
                    className="text-[10px] text-wr-text-dim uppercase mb-2 flex items-center justify-between"
                    style={{ letterSpacing: "0.14em", fontWeight: 600 }}
                  >
                    <span>Thread con cliente</span>
                    <span className="text-[10px] normal-case" style={{ letterSpacing: 0, fontWeight: 400, color: "#06B6D4" }}>
                      {threadsShared.length} mensajes · visible para cliente
                    </span>
                  </div>
                  <div>
                    <ThreadList messages={threadsShared} kind="shared" />
                  </div>
                </section>
              )}

              {/* Threads internal */}
              {threadsInternal && (
                <section>
                  <div
                    className="text-[10px] text-wr-text-dim uppercase mb-2 flex items-center justify-between"
                    style={{ letterSpacing: "0.14em", fontWeight: 600 }}
                  >
                    <span>Thread interno SRS</span>
                    <span className="text-[10px] normal-case" style={{ letterSpacing: 0, fontWeight: 400, color: "#F59E0B" }}>
                      {threadsInternal.length} mensajes · opaco cliente
                    </span>
                  </div>
                  <div>
                    <ThreadList messages={threadsInternal} kind="internal" />
                  </div>
                </section>
              )}

              {/* Parts */}
              {parts && parts.length > 0 && (
                <section>
                  <div
                    className="text-[10px] text-wr-text-dim uppercase mb-2 flex items-center justify-between"
                    style={{ letterSpacing: "0.14em", fontWeight: 600 }}
                  >
                    <span>Repuestos / partes</span>
                    <span className="text-[10px] normal-case" style={{ letterSpacing: 0, fontWeight: 400, color: "#6B7280" }}>
                      {parts.length} ítems
                    </span>
                  </div>
                  <PartsTable parts={parts} />
                </section>
              )}

              {/* Doc cycle */}
              <section>
                <div className="text-[10px] text-wr-text-dim uppercase mb-2" style={{ letterSpacing: "0.14em", fontWeight: 600 }}>
                  Estado del ciclo documental
                </div>
                <DocCycleGrid briefing={briefing} capture={capture} report={report} />
              </section>

              {/* Audit log */}
              {auditRecent && auditRecent.length > 0 && (
                <section>
                  <div
                    className="text-[10px] text-wr-text-dim uppercase mb-2 flex items-center justify-between"
                    style={{ letterSpacing: "0.14em", fontWeight: 600 }}
                  >
                    <span>Audit log reciente</span>
                    <a
                      href="#"
                      className="text-[10px] uppercase no-underline"
                      style={{ color: "#F59E0B", letterSpacing: "0.1em", fontWeight: 500 }}
                    >
                      Ver {auditCount} →
                    </a>
                  </div>
                  <div className="border border-wr-border rounded-sm text-[11px]">
                    {auditRecent.map((a, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-2 flex justify-between gap-2.5"
                        style={idx > 0 ? { borderTop: "1px solid #1F1F1F" } : {}}
                      >
                        <div className="flex gap-2 items-center min-w-0">
                          <span style={{ color: "#F59E0B", fontWeight: 500 }}>{a.action}</span>
                          <span className="text-wr-text-dim">·</span>
                          <span className="text-wr-text-mid truncate">{a.actor}</span>
                        </div>
                        <span className="text-wr-text-dim flex-shrink-0">{a.when}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Footer sticky */}
            <footer
              className="flex-shrink-0 border-t border-wr-border bg-wr-bg flex items-center gap-2"
              style={{ padding: "14px 18px" }}
            >
              <button
                className="bg-transparent text-wr-text-mid border border-wr-border-strong rounded-sm cursor-pointer flex items-center justify-center transition hover:text-wr-amber"
                style={{ width: 36, height: 36 }}
                title="Más acciones"
              >
                <Icon icon={ICONS.menuDots} size={16} />
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-transparent text-wr-text-mid border border-wr-border-strong rounded-sm cursor-pointer transition hover:text-wr-text"
                style={{
                  height: 36,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Cerrar
              </button>
              <button
                onClick={onEscalate}
                className="rounded-sm cursor-pointer flex items-center justify-center gap-1.5 transition hover:brightness-110"
                style={{
                  flex: 2,
                  height: 36,
                  background: "#F59E0B",
                  color: "#0A0A0A",
                  border: "1px solid #F59E0B",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Escalar ball → cliente
                <Icon icon={ICONS.arrowRight} size={14} />
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
