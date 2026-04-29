/**
 * woFields.js — adaptador entre el shape REAL del backend y lo que los
 * componentes v2 asumían.
 *
 * Los componentes v2 se construyeron contra mocks HTML estáticos cuyo shape
 * difería del backend FastAPI real. Este helper centraliza la lectura para
 * que cada componente no tenga que conocer el mapping.
 *
 * Backend real (verificado contra /api/work-orders en localhost:4110):
 *   - ball_in_court.side       (NO .party)
 *   - assigned_tech_user_id    (NO assignment.tech_user_id)
 *   - title                    (NO intervention_type / tag / kind)
 *   - severity in [low, normal, medium, high, critical]
 *   - shield_level + sla_snapshot + deadline_resolve_at  (NO sla_status)
 *   - handshakes []            (origen para construir timeline)
 *
 * Endpoints relacionados (lazy fetch al abrir detail):
 *   - GET /api/work-orders/{id}/briefing
 *   - GET /api/work-orders/{id}/capture
 *   - GET /api/work-orders/{id}/report
 *   - GET /api/work-orders/{id}/threads/shared/messages
 *   - GET /api/work-orders/{id}/threads/internal/messages
 *   - GET /api/audit-log?entity_id={id}&limit=4
 */

/* ─────────────────────── Ball in court ─────────────────────── */

/** Devuelve la "side" del ball: "srs" | "tech" | "client" | null. */
export function getBallSide(wo) {
  return wo?.ball_in_court?.side || null;
}

/** Display uppercase para badges. Empty → "—". */
export function getBallLabel(wo) {
  return getBallSide(wo)?.toUpperCase() || "—";
}

/** Color hex semántico del ball. */
export function getBallColor(wo) {
  const side = getBallSide(wo);
  if (side === "srs") return "#F59E0B";   // amber: nuestra acción pendiente
  if (side === "client") return "#DC2626"; // red: bloqueado por cliente
  if (side === "tech") return "#06B6D4";   // cyan: en manos del técnico
  return "#9CA3AF"; // muted
}

/** Horas que el ball lleva en la misma side (para alertas "stuck"). */
export function ballAgeHours(wo) {
  const since = wo?.ball_in_court?.since;
  if (!since) return 0;
  return (Date.now() - new Date(since).getTime()) / 36e5;
}

/* ─────────────────────── Tech assignment ─────────────────────── */

/** ID del tech asignado (o null si no hay). */
export function getTechId(wo) {
  return wo?.assigned_tech_user_id || null;
}

/* ─────────────────────── Tag / Type display ─────────────────────── */

/**
 * Texto descriptivo corto de la WO. Backend solo expone `title` — usamos eso.
 * Si el día de mañana se añade `intervention_type` o `kind` formales al
 * schema, este helper los preferiría.
 */
export function getTag(wo) {
  return wo?.intervention_type || wo?.kind || wo?.tag || wo?.title || null;
}

/* ─────────────────────── SLA computed ─────────────────────── */

const HOUR = 36e5;

/**
 * Computa el estado SLA en runtime desde `deadline_resolve_at` del backend.
 *
 * Returns:
 *   {
 *     status: "OK" | "AT_RISK" | "BREACH",
 *     timeText: "1h 23m" | "BREACHED 0h 30m" | "—",
 *     timeMs: number (positive = quedan, negative = breached)
 *   }
 *
 * Reglas:
 *   - BREACH si deadline ya pasó.
 *   - AT_RISK si quedan menos de 2h.
 *   - OK en otro caso.
 */
export function computeSlaInfo(wo) {
  const deadline = wo?.deadline_resolve_at || wo?.deadline_receive_at;
  if (!deadline) {
    return { status: "OK", timeText: "—", timeMs: null };
  }
  const ms = new Date(deadline).getTime() - Date.now();
  const absHours = Math.abs(ms) / HOUR;
  const wholeH = Math.floor(absHours);
  const wholeM = Math.floor((absHours - wholeH) * 60);
  const text = `${wholeH}h ${String(wholeM).padStart(2, "0")}m`;

  if (ms < 0) {
    return { status: "BREACH", timeText: `BREACHED ${text}`, timeMs: ms };
  }
  if (absHours < 2) {
    return { status: "AT_RISK", timeText: text, timeMs: ms };
  }
  return { status: "OK", timeText: text, timeMs: ms };
}

/* ─────────────────────── Timeline construido ─────────────────────── */

const STATUS_LABEL = {
  intake: "Solicitada",
  triage: "Triaje SRS",
  pre_flight: "Pre-flight",
  assigned: "Asignada",
  dispatched: "Despachada",
  en_route: "En ruta",
  on_site: "En sitio",
  in_progress: "En progreso",
  in_closeout: "Cerrando",
  resolved: "Resuelta",
  completed: "Completada",
  closed: "Cerrada",
  cancelled: "Cancelada",
};

const STATUS_ORDER = [
  "intake", "triage", "pre_flight", "assigned", "dispatched",
  "en_route", "on_site", "in_progress", "in_closeout",
  "resolved", "completed", "closed",
];

function fmtRelative(date) {
  if (!date) return "";
  const ms = Date.now() - new Date(date).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

/**
 * Construye un timeline visual para el SideDetailPanel desde los campos
 * disponibles en el backend. No es un status_history exhaustivo (el backend
 * no lo expone), pero da un mínimo honesto:
 *
 *   - Solicitada por cliente (created_at, done)
 *   - Asignada a {techName} (si hay assigned_tech_user_id, done)
 *   - Cada handshake registrado (done)
 *   - Estado actual: {STATUS} (active)
 *
 * Cancelled/closed terminan en "done" en vez de "active".
 */
export function buildTimeline(wo, techName = null) {
  if (!wo) return [];
  const items = [];

  items.push({
    label: "Solicitada por cliente",
    time: fmtRelative(wo.created_at),
    kind: "done",
  });

  if (getTechId(wo)) {
    items.push({
      label: techName ? `Asignada a ${techName}` : "Asignada",
      time: "",
      kind: "done",
    });
  }

  if (Array.isArray(wo.handshakes)) {
    wo.handshakes.forEach((h) => {
      const lbl = h?.kind ? h.kind.replace(/_/g, " ") : "Handshake";
      items.push({
        label: lbl.charAt(0).toUpperCase() + lbl.slice(1),
        time: fmtRelative(h?.at),
        detail: h?.actor_user_id ? `por ${h.actor_user_id.slice(0, 8)}…` : null,
        kind: "done",
      });
    });
  }

  const statusLbl = STATUS_LABEL[wo.status] || wo.status;
  const isTerminal = ["closed", "cancelled", "completed", "resolved"].includes(wo.status);
  items.push({
    label: `Estado actual: ${statusLbl}`,
    time: fmtRelative(wo.updated_at || wo.created_at),
    kind: isTerminal ? "done" : "active",
  });

  return items;
}

/* ─────────────────────── Status helpers ─────────────────────── */

export const ACTIVE_STATUSES = [
  "intake", "triage", "pre_flight", "assigned", "dispatched",
  "in_progress", "in_closeout", "en_route", "on_site",
];

export const TERMINAL_STATUSES = ["completed", "closed", "cancelled", "resolved"];

export function isActive(wo) {
  return ACTIVE_STATUSES.includes(wo?.status);
}

export function isTerminal(wo) {
  return TERMINAL_STATUSES.includes(wo?.status);
}
