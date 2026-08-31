/**
 * PendingOfYouBlock — "Pendiente de ti · N acciones" (Sprint Afinar B3).
 *
 * "El path de la incidencia debe ser cristal clear" — al entrar al cockpit,
 * lo primero que ves es QUÉ te toca hacer, con CTA directo. Sin escanear
 * listas ni adivinar.
 *
 * Réplica del toca-block validado por el owner en
 * mocks/insiteiq_eventos_v2_grid_demo.html (2026-05-20).
 *
 * Reglas por scope:
 *   srs:    resolved → "Cerrar intervención"
 *           intake → "Hacer triage"
 *           triage/pre_flight sin scheduled_at → "Agendar visita"
 *   client: resolved → "Validar cierre"
 *
 * Si no hay pendientes no renderiza nada (cero ruido).
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatWoCode } from "../../lib/woCode";

const JAKARTA = "'Plus Jakarta Sans', sans-serif";
const MONO = "'JetBrains Mono', monospace";
const MAX_ROWS = 5;

function timeSince(iso, lang = "es") {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const en = lang === "en";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function PendingOfYouBlock({ wos, scope = "srs" }) {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();

  const pending = useMemo(() => {
    const items = [];
    for (const wo of wos || []) {
      const code = formatWoCode(wo);
      const since = wo.status_timestamps?.[wo.status] || wo.updated_at;
      if (scope === "srs") {
        if (wo.status === "resolved") {
          items.push({
            wo, code, since, prio: 0,
            action: t("pending_block.action_close", { defaultValue: "Cerrar intervención" }),
            meta: t("pending_block.meta_resolved", { defaultValue: "tech terminó" }),
            url: `/srs/ops/${wo.id}`,
          });
        } else if (wo.status === "intake") {
          items.push({
            wo, code, since, prio: 1,
            action: t("pending_block.action_triage", { defaultValue: "Hacer triage" }),
            meta: t("pending_block.meta_intake", { defaultValue: "solicitud nueva" }),
            url: `/srs/ops/${wo.id}`,
          });
        } else if (
          (wo.status === "triage" || wo.status === "pre_flight") &&
          !wo.scheduled_at
        ) {
          items.push({
            wo, code, since, prio: 2,
            action: t("pending_block.action_schedule", { defaultValue: "Agendar visita" }),
            meta: t("pending_block.meta_unscheduled", { defaultValue: "sin programar" }),
            url: `/srs/ops/${wo.id}`,
          });
        }
      } else if (scope === "client") {
        if (wo.status === "resolved") {
          items.push({
            wo, code, since, prio: 0,
            action: t("pending_block.action_validate", { defaultValue: "Validar cierre" }),
            meta: t("pending_block.meta_resolved_client", { defaultValue: "intervención resuelta" }),
            url: `/client/ops/${wo.id}`,
          });
        }
      }
    }
    // Más urgente primero (prio asc) · dentro de prio, más viejo primero
    items.sort((a, b) => a.prio - b.prio || new Date(a.since) - new Date(b.since));
    return items;
  }, [wos, scope, t]);

  if (pending.length === 0) return null;

  const visible = pending.slice(0, MAX_ROWS);
  const overflow = pending.length - visible.length;

  return (
    <section
      style={{
        padding: "12px 14px",
        background: "#FEF3E2",
        border: "1px solid #F4D9A8",
        borderLeft: "3px solid #D97706",
        borderRadius: "0 8px 8px 0",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#9A5A05",
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
        {t("pending_block.title", { defaultValue: "Pendiente de ti" })} ·{" "}
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{pending.length}</span>{" "}
        {pending.length === 1
          ? t("pending_block.action_one", { defaultValue: "acción" })
          : t("pending_block.action_other", { defaultValue: "acciones" })}
      </div>

      {visible.map((p) => (
        <div
          key={p.wo.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 8,
            padding: "7px 9px",
            background: "#FFFFFF",
            border: "1px solid #F4D9A8",
            borderRadius: 6,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              color: "#8B95A8",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {p.code}
          </span>
          <span
            style={{
              fontFamily: JAKARTA,
              fontSize: 13,
              fontWeight: 700,
              color: "#0A1628",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
            title={p.wo.title}
          >
            {p.action}
          </span>
          <span
            style={{
              fontFamily: JAKARTA,
              fontSize: 11,
              color: "#3D4A66",
              marginLeft: "auto",
              fontWeight: 600,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {p.meta} ·{" "}
            <span style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>
              {timeSince(p.since, i18n.language)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => navigate(p.url)}
            style={{
              border: 0,
              background: "#0A1628",
              color: "#FFFFFF",
              cursor: "pointer",
              fontFamily: JAKARTA,
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              padding: "7px 12px",
              borderRadius: 5,
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "background 140ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1A2640")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#0A1628")}
          >
            {t("pending_block.cta_open", { defaultValue: "Abrir" })} →
          </button>
        </div>
      ))}

      {overflow > 0 && (
        <div
          style={{
            marginTop: 7,
            fontFamily: JAKARTA,
            fontSize: 11,
            fontWeight: 600,
            color: "#9A5A05",
          }}
        >
          {t("pending_block.overflow", {
            defaultValue: "y {{count}} más…",
            count: overflow,
          })}
        </div>
      )}
    </section>
  );
}
