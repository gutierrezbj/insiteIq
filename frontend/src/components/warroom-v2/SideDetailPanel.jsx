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

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { Icon, ICONS } from "../../lib/icons";
import { getTechTimeInfo, VIEWER_TZ_LABEL } from "../../lib/tz";
import { formatWoCode } from "../../lib/woCode";
import { getStatusInfo } from "../cockpit-v2/InterventionCardFull";
import { getSeverityInfo } from "../cockpit-v2/InterventionCardMini";
import {
  getBallSide, getBallLabel, getBallColor,
  getTag, computeSlaInfo,
} from "../../lib/woFields";

const SLA_BADGE = {
  BREACH:  { label: "BREACH",  bg: "#DC262622", color: "#DC2626", border: "#DC2626" },
  AT_RISK: { label: "AT RISK", bg: "#0A162822", color: "#0A1628", border: "#0A1628" },
  OK:      { label: "OK",      bg: "#22C55E22", color: "#22C55E", border: "#22C55E" },
};

function getSlaBadge(slaStatus) {
  const key = (slaStatus || "OK").toUpperCase().replace("_RISK", "_RISK");
  return SLA_BADGE[key] || SLA_BADGE.OK;
}

/* Sub-componente: Timezone block */
function TimezoneBlock({ tech }) {
  const { t } = useTranslation("common");
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
          style={{ color: "#8B95A8", letterSpacing: "0.14em", textTransform: "uppercase" }}
        >
          {t("detail_panel.tz_block_label")}
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
      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
        {/* Hora del tech navy strong (NO white) */}
        <span
          className="font-mono"
          style={{ fontSize: 28, fontWeight: 700, color: "#0A1628", lineHeight: 1, letterSpacing: "-0.01em" }}
        >
          {info.techTime}
        </span>
        <span
          className="text-[11px] font-jakarta"
          style={{ color: "#8B95A8", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}
        >
          {info.tzLabel}
        </span>
        <span className="text-[11px] text-cl-text-dim">·</span>
        <span className="text-[12px]" style={{ color: "#3D4A66", fontWeight: 600 }}>{techName}</span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-cl-text-dim font-mono">
        <span>{t("detail_panel.tz_viewer_at", { time: info.viewerTime, tz: VIEWER_TZ_LABEL })}</span>
        <span>·</span>
        <span style={{ color: info.diffHours !== 0 ? "#0A1628" : "#3D4A66" }}>
          {info.offsetText}
        </span>
        {info.untilEndOfDay && (
          <>
            <span>·</span>
            <span>{t("detail_panel.tz_end_of_day", { time: info.untilEndOfDay })}</span>
          </>
        )}
      </div>
      {info.shouldNotDisturb && (
        <div
          className="mt-2 pt-2 flex items-center gap-1.5 text-[11px]"
          style={{ borderTop: `1px solid ${info.color}22`, color: info.color }}
        >
          <Icon icon={ICONS.moon} size={13} />
          <span>{t("detail_panel.tz_dnd_warning")}</span>
        </div>
      )}
    </section>
  );
}

/* Sub-componente: Timeline */
function TimelineSection({ items = [] }) {
  const { t } = useTranslation("common");
  if (!items.length) {
    return (
      <p className="text-[11px] text-cl-text-dim italic">{t("detail_panel.no_events")}</p>
    );
  }
  return items.map((item, idx) => {
    const kindClass = item.kind === "done" ? "is-done"
      : item.kind === "active" ? "is-active"
      : item.kind === "error" ? "is-error"
      : "";
    const labelColor = item.kind === "pending" ? "#8B95A8"
      : item.kind === "error" ? "#DC2626"
      : item.kind === "active" ? "#0A1628"
      : "#0A1628";
    return (
      <div className="detail-tl-item" key={idx}>
        <div className={`detail-tl-dot ${kindClass}`} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex justify-between gap-3 items-center">
            <span style={{ fontSize: 12, color: labelColor, fontWeight: 500 }}>
              {item.label}
            </span>
            <span className="text-[10px] text-cl-text-dim">{item.time || ""}</span>
          </div>
          {item.detail && (
            <p className="text-[11px] text-cl-text-mid mt-0.5 leading-snug">
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
  const { t } = useTranslation("common");
  if (!messages.length) {
    return <p className="text-[11px] text-cl-text-dim italic py-2">{t("detail_panel.no_messages")}</p>;
  }
  const accentColor = kind === "shared" ? "#06B6D4" : "#0A1628";
  return messages.map((m, idx) => (
    <div key={idx} className="py-2 border-b border-cl-border last:border-0">
      <div className="flex justify-between items-center gap-2 mb-1">
        <span className="text-[11px]" style={{ color: accentColor, fontWeight: 500 }}>
          {m.who}
        </span>
        <span className="text-[10px] text-cl-text-dim">
          {m.when}{m.pending ? " · pending reply" : ""}
        </span>
      </div>
      <p className="text-[12px] text-cl-text leading-relaxed m-0">{m.msg}</p>
    </div>
  ));
}

/* Sub-componente: Parts */
function PartsTable({ parts = [] }) {
  if (!parts.length) return null;
  return (
    <div className="border border-cl-border rounded-sm">
      {parts.map((p, idx) => {
        const stateColor = p.status === "IN_STOCK" ? "#22C55E"
          : p.status === "EN_TRANSITO" ? "#0A1628"
          : "#DC2626";
        return (
          <div
            key={idx}
            className="px-3 py-2.5"
            style={idx > 0 ? { borderTop: "1px solid #E2E5EC" } : {}}
          >
            <div className="flex justify-between gap-2 items-center mb-1">
              <span className="text-[11px]" style={{ color: "#0A1628", fontWeight: 500 }}>
                {p.code}
              </span>
              <span
                className="text-[10px]"
                style={{ color: stateColor, fontWeight: 600, letterSpacing: "0.1em" }}
              >
                {p.status?.replace("_", " ")}
              </span>
            </div>
            <p className="text-[12px] text-cl-text mb-1">
              {p.desc} <span className="text-cl-text-dim">× {p.qty}</span>
            </p>
            {p.detail && (
              <p className="text-[11px] text-cl-text-mid leading-snug">{p.detail}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* Sub-componente: Doc cycle (Briefing/Capture/Report) */
function DocCycleGrid({ briefing, capture, report }) {
  const { t } = useTranslation("common");
  const items = [
    { label: t("detail_panel.doc_briefing"), state: briefing?.status || "PENDING", detail: briefing?.signed_by || t("detail_panel.doc_unsigned") },
    { label: t("detail_panel.doc_capture"), state: capture?.status || "PENDING", detail: capture?.photos ? t("detail_panel.doc_photos", { count: capture.photos }) : t("detail_panel.doc_no_evidence") },
    { label: t("detail_panel.doc_report"), state: report?.status || "PENDING", detail: report?.reason ? report.reason.slice(0, 40) : t("detail_panel.doc_ok") },
  ];
  const colorFor = (s) =>
    s === "SIGNED" || s === "COMPLETE" || s === "EMITTED" ? "#22C55E"
      : s === "PARTIAL" || s === "PENDING" ? "#0A1628"
      : "#DC2626";

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it) => (
        <div key={it.label} className="p-2.5 border border-cl-border rounded-sm">
          <p className="text-[9px] text-cl-text-dim uppercase mb-1" style={{ letterSpacing: "0.14em" }}>
            {it.label}
          </p>
          <p
            className="text-[11px] mb-0.5"
            style={{ color: colorFor(it.state), fontWeight: 600, letterSpacing: "0.1em" }}
          >
            {it.state}
          </p>
          <p className="text-[10px] text-cl-text-mid leading-snug">{it.detail}</p>
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
  loading = false,
  open,
  onClose,
  onEscalate,
  escalating = false,
  viewerScope = "srs",
}) {
  const { t } = useTranslation("common");
  // Cliente NO ve threads internos ni audit log SRS-internal (Principio #1).
  const isClientScope = viewerScope === "client";
  const visibleThreadsInternal = isClientScope ? null : threadsInternal;
  const visibleAuditRecent = isClientScope ? null : auditRecent;
  const visibleAuditCount = isClientScope ? 0 : auditCount;
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
  const slaInfo = computeSlaInfo(wo);
  const sla = getSlaBadge(slaInfo.status);
  const slaTime = slaInfo.timeText;

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
            <header className="flex-shrink-0 border-b border-cl-border bg-cl-bg">
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
                    {sla.label}{slaTime && slaTime !== "—" ? ` · ${slaTime}` : ""}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="bg-transparent border-0 text-cl-text-dim hover:text-cl-orange transition cursor-pointer p-1 flex items-center"
                  aria-label={t("detail_panel.close")}
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
                  <span className="text-[10px] text-cl-text-dim">· {shieldLevel} Shield</span>
                )}
              </div>

              <div className="px-[18px] pb-4">
                {/* Site title navy strong (NO text-white) */}
                <h2
                  id="detail-title"
                  className="font-jakarta text-[22px] m-0 leading-tight"
                  style={{ color: "#0A1628", fontWeight: 700, letterSpacing: "-0.015em" }}
                >
                  {site?.name || wo?.site_name || t("intervention.no_site")}
                </h2>
                <p className="text-[12px] m-0 mt-1" style={{ color: "#3D4A66", fontWeight: 500 }}>
                  <span className="font-mono" style={{ color: "#0A1628", fontWeight: 600 }}>{site?.code || site?.id || "—"}</span>
                  {site?.city && <span> · {site.city}</span>}
                  {site?.country && <span>, {site.country}</span>}
                  {client?.name && <span> · {client.name}</span>}
                </p>
              </div>
            </header>

            {/* Body scrollable */}
            <div
              className="wr-scroll"
              style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 16 }}
            >
              {/* Warning banner */}
              {warning && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: "rgba(255, 107, 53, 0.06)",
                    borderLeft: "2px solid #0A1628",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon icon={ICONS.dangerTriangle} size={13} color="#0A1628" />
                    <span style={{ fontSize: 11, color: "#0A1628", fontWeight: 600, letterSpacing: "0.1em" }}>
                      {warning.type?.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[12px] text-cl-text leading-relaxed m-0">{warning.detail}</p>
                </div>
              )}

              {/* Timezone block */}
              <TimezoneBlock tech={tech} />

              {/* Metadata grid 2x2 */}
              <section>
                <div className="text-[10px] text-cl-text-dim uppercase mb-2" style={{ letterSpacing: "0.14em", fontWeight: 600 }}>
                  {t("detail_panel.references")}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <div>
                    <p className="text-[9px] text-cl-text-dim uppercase mb-0.5" style={{ letterSpacing: "0.14em" }}>{t("detail_panel.ball")}</p>
                    <p
                      className="text-[13px] m-0"
                      style={{ color: getBallColor(wo), fontWeight: 500 }}
                    >
                      {getBallLabel(wo) === "—" ? t("intervention.unassigned") : getBallLabel(wo)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-cl-text-dim uppercase mb-0.5" style={{ letterSpacing: "0.14em" }}>{t("detail_panel.tech_label")}</p>
                    <p className="text-[13px] m-0" style={{ color: tech ? "#0A1628" : "#8B95A8" }}>
                      {tech?.full_name || tech?.name || t("intervention.unassigned")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-cl-text-dim uppercase mb-0.5" style={{ letterSpacing: "0.14em" }}>{t("detail_panel.tag")}</p>
                    <p className="text-[13px] m-0" style={{ color: getTag(wo) ? "#0A1628" : "#8B95A8" }}>
                      {getTag(wo) || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-cl-text-dim uppercase mb-0.5" style={{ letterSpacing: "0.14em" }}>{t("detail_panel.audit_log")}</p>
                    <p className="text-[13px] text-cl-text m-0">{t("detail_panel.audit_events", { count: auditCount ?? 0 })}</p>
                  </div>
                </div>
              </section>

              {/* ETA acknowledgment (Iter 2.10 · Pain #005-4) */}
              <EtaSection wo={wo} onUpdated={onClose ? () => onClose({ refresh: true }) : null} />

              {/* Description */}
              {description && (
                <section>
                  <div className="text-[10px] text-cl-text-dim uppercase mb-2" style={{ letterSpacing: "0.14em", fontWeight: 600 }}>
                    {t("detail_panel.description")}
                  </div>
                  <p className="text-[12px] text-cl-text leading-relaxed m-0">{description}</p>
                </section>
              )}

              {/* Scope */}
              {scope && (
                <section>
                  <div className="text-[10px] text-cl-text-dim uppercase mb-2" style={{ letterSpacing: "0.14em", fontWeight: 600 }}>
                    {t("detail_panel.scope")}
                  </div>
                  <p className="text-[12px] text-cl-text-mid leading-relaxed m-0">{scope}</p>
                </section>
              )}

              {/* Timeline */}
              {timeline && timeline.length > 0 && (
                <section>
                  <div
                    className="text-[10px] text-cl-text-dim uppercase mb-2 flex items-center justify-between"
                    style={{ letterSpacing: "0.14em", fontWeight: 600 }}
                  >
                    <span>{t("detail_panel.timeline")}</span>
                    <span className="text-[10px] text-cl-text-dim normal-case" style={{ letterSpacing: 0, fontWeight: 400 }}>
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
                    className="text-[10px] text-cl-text-dim uppercase mb-2 flex items-center justify-between"
                    style={{ letterSpacing: "0.14em", fontWeight: 600 }}
                  >
                    <span>{t("detail_panel.thread_client")}</span>
                    <span className="text-[10px] normal-case" style={{ letterSpacing: 0, fontWeight: 400, color: "#06B6D4" }}>
                      {t("detail_panel.thread_visible_client", { count: threadsShared.length })}
                    </span>
                  </div>
                  <div>
                    <ThreadList messages={threadsShared} kind="shared" />
                  </div>
                </section>
              )}

              {/* Threads internal · OCULTO en client scope (Principio #1) */}
              {visibleThreadsInternal && (
                <section>
                  <div
                    className="text-[10px] text-cl-text-dim uppercase mb-2 flex items-center justify-between"
                    style={{ letterSpacing: "0.14em", fontWeight: 600 }}
                  >
                    <span>{t("detail_panel.thread_internal")}</span>
                    <span className="text-[10px] normal-case" style={{ letterSpacing: 0, fontWeight: 400, color: "#0A1628" }}>
                      {t("detail_panel.thread_opaque_client", { count: visibleThreadsInternal.length })}
                    </span>
                  </div>
                  <div>
                    <ThreadList messages={visibleThreadsInternal} kind="internal" />
                  </div>
                </section>
              )}

              {/* Parts */}
              {parts && parts.length > 0 && (
                <section>
                  <div
                    className="text-[10px] text-cl-text-dim uppercase mb-2 flex items-center justify-between"
                    style={{ letterSpacing: "0.14em", fontWeight: 600 }}
                  >
                    <span>{t("detail_panel.parts")}</span>
                    <span className="text-[10px] normal-case" style={{ letterSpacing: 0, fontWeight: 400, color: "#8B95A8" }}>
                      {t("detail_panel.parts_count", { count: parts.length })}
                    </span>
                  </div>
                  <PartsTable parts={parts} />
                </section>
              )}

              {/* Doc cycle */}
              <section>
                <div className="text-[10px] text-cl-text-dim uppercase mb-2" style={{ letterSpacing: "0.14em", fontWeight: 600 }}>
                  {t("detail_panel.doc_cycle_title")}
                </div>
                <DocCycleGrid briefing={briefing} capture={capture} report={report} />
              </section>

              {/* Audit log · OCULTO en client scope (Principio #1) */}
              {visibleAuditRecent && visibleAuditRecent.length > 0 && (
                <section>
                  <div
                    className="text-[10px] text-cl-text-dim uppercase mb-2 flex items-center justify-between"
                    style={{ letterSpacing: "0.14em", fontWeight: 600 }}
                  >
                    <span>{t("detail_panel.audit_recent_title")}</span>
                    <a
                      href="#"
                      className="text-[10px] uppercase no-underline"
                      style={{ color: "#0A1628", letterSpacing: "0.1em", fontWeight: 500 }}
                    >
                      {t("detail_panel.audit_recent_view_all", { count: visibleAuditCount })}
                    </a>
                  </div>
                  <div className="border border-cl-border rounded-sm text-[11px]">
                    {visibleAuditRecent.map((a, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-2 flex justify-between gap-2.5"
                        style={idx > 0 ? { borderTop: "1px solid #E2E5EC" } : {}}
                      >
                        <div className="flex gap-2 items-center min-w-0">
                          <span style={{ color: "#0A1628", fontWeight: 500 }}>{a.action}</span>
                          <span className="text-cl-text-dim">·</span>
                          <span className="text-cl-text-mid truncate">{a.actor}</span>
                        </div>
                        <span className="text-cl-text-dim flex-shrink-0">{a.when}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Footer sticky · bg surface-3 + border-top strong + CTA orange ESCASO porque escalar es decisión con urgencia */}
            <footer
              className="flex-shrink-0 flex items-center gap-2"
              style={{
                padding: "14px 18px",
                borderTop: "1px solid #C8CDD8",
                background: "#F7F8FA",
              }}
            >
              <button
                className="rounded-sm cursor-pointer flex items-center justify-center transition"
                style={{
                  width: 36,
                  height: 36,
                  background: "#FFFFFF",
                  color: "#3D4A66",
                  border: "1px solid #C8CDD8",
                }}
                title={t("detail_panel.more_actions")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#F4F6F8";
                  e.currentTarget.style.color = "#0A1628";
                  e.currentTarget.style.borderColor = "#0A1628";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#FFFFFF";
                  e.currentTarget.style.color = "#3D4A66";
                  e.currentTarget.style.borderColor = "#C8CDD8";
                }}
              >
                <Icon icon={ICONS.menuDots} size={16} />
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-sm cursor-pointer transition font-jakarta uppercase"
                style={{
                  height: 36,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  background: "#FFFFFF",
                  color: "#3D4A66",
                  border: "1px solid #C8CDD8",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#F4F6F8";
                  e.currentTarget.style.color = "#0A1628";
                  e.currentTarget.style.borderColor = "#0A1628";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#FFFFFF";
                  e.currentTarget.style.color = "#3D4A66";
                  e.currentTarget.style.borderColor = "#C8CDD8";
                }}
              >
                {t("detail_panel.close")}
              </button>
              <button
                onClick={escalating ? undefined : onEscalate}
                disabled={escalating}
                className="rounded-sm flex items-center justify-center gap-1.5 transition font-jakarta uppercase"
                style={{
                  flex: 2,
                  height: 36,
                  background: escalating ? "#E8895A" : "#FF6B35",
                  color: "#FFFFFF",
                  border: `1px solid ${escalating ? "#E8895A" : "#FF6B35"}`,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  boxShadow: escalating ? "none" : "0 2px 6px -1px rgba(255, 107, 53, 0.32)",
                  cursor: escalating ? "wait" : "pointer",
                  opacity: escalating ? 0.8 : 1,
                }}
                onMouseEnter={(e) => {
                  if (escalating) return;
                  e.currentTarget.style.background = "#C5481E";
                  e.currentTarget.style.borderColor = "#C5481E";
                }}
                onMouseLeave={(e) => {
                  if (escalating) return;
                  e.currentTarget.style.background = "#FF6B35";
                  e.currentTarget.style.borderColor = "#FF6B35";
                }}
              >
                {escalating ? t("detail_panel.escalating") : t("detail_panel.escalate_to_client")}
                {!escalating && <Icon icon={ICONS.arrowRight} size={14} />}
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

/* ─────────────────────── EtaSection (Iter 2.10 · Pain #005-4) ───────────────────────
 * Pill ETA con tres estados:
 *   - Sin scheduled_at: oculta (no aplica · WO sin agendar)
 *   - scheduled_at + sin eta_ack: pill amber "ETA pendiente confirmación tech" + botón "Registrar"
 *   - eta_ack presente: pill verde "ETA confirmada · {hora} · por {source}" + botón "Re-registrar"
 * Solo SRS coord ve el botón. Tech PWA self-service queda para iter futura. */
function EtaSection({ wo, onUpdated }) {
  const { t, i18n } = useTranslation("common");
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const isSrsCoord = user?.memberships?.some((m) => m.space === "srs_coordinators");

  const scheduledAt = wo?.scheduled_at;
  const etaAck = wo?.eta_ack;

  if (!scheduledAt && !etaAck) return null;  // WO sin agendar

  const locale = (i18n.language || "es").startsWith("en") ? "en-US" : "es-ES";
  const fmtDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
    } catch { return iso; }
  };

  const hasAck = !!etaAck;
  const ackedAt = etaAck?.proposed_eta;
  const ackSource = etaAck?.ack_source === "self"
    ? t("detail_panel.eta_source_short_self")
    : t("detail_panel.eta_source_short_coord");

  return (
    <>
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-cl-text-dim uppercase" style={{ letterSpacing: "0.14em", fontWeight: 600 }}>
            {t("detail_panel.eta_title")}
          </div>
          {isSrsCoord && (
            <button
              onClick={() => setModalOpen(true)}
              className="text-[10px] uppercase font-medium px-2 py-0.5 rounded-sm border transition"
              style={{
                color: "#0A1628",
                borderColor: "#0A1628",
                background: "rgba(255,107,53,0.08)",
                letterSpacing: "0.08em",
              }}
            >
              {hasAck ? t("detail_panel.eta_re_register") : t("detail_panel.eta_register")}
            </button>
          )}
        </div>

        <div
          className="rounded-sm px-3 py-2 flex items-start gap-2"
          style={{
            border: `1px solid ${hasAck ? "#22C55E55" : "#0A162855"}`,
            background: hasAck ? "rgba(34,197,94,0.06)" : "rgba(255,107,53,0.06)",
          }}
        >
          <Icon
            icon={hasAck ? ICONS.checkCircle : ICONS.clock}
            size={16}
            color={hasAck ? "#22C55E" : "#0A1628"}
            style={{ marginTop: 2 }}
          />
          <div className="min-w-0 flex-1">
            {hasAck ? (
              <>
                <p className="text-[12px] text-cl-text m-0" style={{ fontWeight: 500 }}>
                  {t("detail_panel.eta_confirmed", { date: fmtDate(ackedAt) })}
                </p>
                <p className="text-[10px] text-cl-text-mid font-mono mt-0.5">
                  {t("detail_panel.eta_by_source", { source: ackSource, date: fmtDate(etaAck.acknowledged_at) })}
                </p>
                {etaAck.notes && (
                  <p className="text-[11px] text-cl-text-mid mt-1 leading-snug">{etaAck.notes}</p>
                )}
                {scheduledAt && new Date(scheduledAt).getTime() !== new Date(ackedAt).getTime() && (
                  <p className="text-[10px] text-cl-text-dim font-mono mt-1">
                    {t("detail_panel.eta_original_sched", { date: fmtDate(scheduledAt) })}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-[12px] text-cl-text m-0" style={{ fontWeight: 500 }}>
                  {t("detail_panel.eta_pending_confirm")}
                </p>
                <p className="text-[10px] text-cl-text-mid font-mono mt-0.5">
                  {t("detail_panel.eta_scheduled_for", { date: fmtDate(scheduledAt) })}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {modalOpen && (
        <RegisterEtaModalLight
          wo={wo}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            onUpdated?.();
          }}
        />
      )}
    </>
  );
}

function RegisterEtaModalLight({ wo, onClose, onSaved }) {
  const { t, i18n } = useTranslation("common");
  const locale = (i18n.language || "es").startsWith("en") ? "en-US" : "es-ES";
  const initial = wo?.eta_ack?.proposed_eta
    ? new Date(wo.eta_ack.proposed_eta).toISOString().slice(0, 16)
    : (wo?.scheduled_at ? new Date(wo.scheduled_at).toISOString().slice(0, 16) : "");
  const [proposedEta, setProposedEta] = useState(initial);
  const [ackSource, setAckSource] = useState("by_coord");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!proposedEta) {
      toast.error(t("detail_panel.eta_toast_required"));
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/work-orders/${wo.id}/eta-ack`, {
        proposed_eta: new Date(proposedEta).toISOString(),
        ack_source: ackSource,
        notes: notes.trim() || null,
      });
      toast.success(t("detail_panel.eta_toast_saved"));
      onSaved?.();
    } catch (err) {
      toast.error(t("detail_panel.eta_toast_error", { message: err.message || err }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[6000] flex items-center justify-center"
      style={{ background: "rgba(10, 22, 40, 0.55)", backdropFilter: "blur(2px)" }}
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="rounded-md w-[460px] max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          border: "1px solid #C8CDD8",
          boxShadow: "0 24px 48px -8px rgba(10, 22, 40, 0.32)",
        }}
      >
        <header className="px-5 py-4" style={{ borderBottom: "1px solid #E2E5EC", background: "#F7F8FA", borderRadius: "6px 6px 0 0" }}>
          <p className="label-caps-v2 mb-1" style={{ color: "#0A1628", fontWeight: 800 }}>{t("detail_panel.eta_modal_title")}</p>
          {/* Title navy strong (NO text-white) */}
          <h2 className="font-jakarta text-[18px] leading-tight" style={{ color: "#0A1628", fontWeight: 700, letterSpacing: "-0.005em" }}>
            {wo?.title || "Work Order"}
          </h2>
          <p className="text-[11px] text-cl-text-mid font-mono mt-0.5">{formatWoCode(wo)}</p>
        </header>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[10px] text-cl-text-dim uppercase mb-1.5" style={{ letterSpacing: "0.14em" }}>
              {t("detail_panel.eta_field_time")}
            </label>
            <input
              type="datetime-local"
              value={proposedEta}
              onChange={(e) => setProposedEta(e.target.value)}
              disabled={submitting}
              className="w-full bg-cl-surface/40 border border-cl-border rounded-sm px-3 py-2 text-[13px] text-cl-text font-mono"
            />
            {wo?.scheduled_at && (
              <p className="text-[10px] text-cl-text-dim mt-1 font-mono">
                {t("detail_panel.eta_field_original", { date: new Date(wo.scheduled_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) })}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] text-cl-text-dim uppercase mb-1.5" style={{ letterSpacing: "0.14em" }}>
              {t("detail_panel.eta_field_source")}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAckSource("by_coord")}
                disabled={submitting}
                className="font-jakarta text-[11px] px-3 py-1.5 rounded-sm transition"
                style={{
                  color: ackSource === "by_coord" ? "#FFFFFF" : "#3D4A66",
                  border: ackSource === "by_coord" ? "1px solid #0A1628" : "1px solid #C8CDD8",
                  background: ackSource === "by_coord" ? "#0A1628" : "#FFFFFF",
                  fontWeight: ackSource === "by_coord" ? 700 : 600,
                }}
                title={t("detail_panel.eta_source_coord_title")}
              >
                {t("detail_panel.eta_source_coord")}
              </button>
              <button
                onClick={() => setAckSource("self")}
                disabled={submitting}
                className="font-jakarta text-[11px] px-3 py-1.5 rounded-sm transition"
                style={{
                  color: ackSource === "self" ? "#FFFFFF" : "#3D4A66",
                  border: ackSource === "self" ? "1px solid #0A1628" : "1px solid #C8CDD8",
                  background: ackSource === "self" ? "#0A1628" : "#FFFFFF",
                  fontWeight: ackSource === "self" ? 700 : 600,
                }}
                title={t("detail_panel.eta_source_self_title")}
              >
                {t("detail_panel.eta_source_self")}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-cl-text-dim uppercase mb-1.5" style={{ letterSpacing: "0.14em" }}>
              {t("detail_panel.eta_field_notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              rows={2}
              placeholder={t("detail_panel.eta_notes_placeholder")}
              className="w-full bg-cl-surface/40 border border-cl-border rounded-sm px-3 py-2 text-[12px] text-cl-text font-mono resize-none"
            />
          </div>
        </div>

        <footer className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop: "1px solid #E2E5EC", background: "#F7F8FA", borderRadius: "0 0 6px 6px" }}>
          <button
            onClick={onClose}
            disabled={submitting}
            className="font-jakarta text-[11px] uppercase px-3 py-2 transition"
            style={{ letterSpacing: "0.08em", color: "#3D4A66", fontWeight: 600 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0A1628")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#3D4A66")}
          >
            {t("detail_panel.eta_cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !proposedEta}
            className="font-jakarta text-[11px] uppercase px-5 py-2 rounded-sm transition"
            style={{
              background: submitting || !proposedEta ? "#E2E5EC" : "#0A1628",
              color: submitting || !proposedEta ? "#8B95A8" : "#FFFFFF",
              border: submitting || !proposedEta ? "1px solid #E2E5EC" : "1px solid #0A1628",
              cursor: submitting || !proposedEta ? "not-allowed" : "pointer",
              letterSpacing: "0.08em",
              fontWeight: 700,
              boxShadow: submitting || !proposedEta ? "none" : "0 2px 6px -1px rgba(10, 22, 40, 0.18)",
            }}
          >
            {submitting ? t("detail_panel.eta_submitting") : t("detail_panel.eta_submit")}
          </button>
        </footer>
      </div>
    </div>
  );
}
