/**
 * v2-shared · Pills (Iter 2.22).
 *
 * Set de pills con paleta F NAVEGANTE para reusar en todas las migraciones
 * v1→v2. Cada preset envuelve <Pill> base con un map de status → estilo.
 *
 * Exports:
 *   - Pill (base atómico)
 *   - ProjectStatusPill
 *   - WoStatusPill
 *   - SeverityPill
 *   - ShieldPill
 *   - BallPill
 *   - SiteStatusPill
 *
 * Cuando aparezca un nuevo status (ej. equipment status, agreement tier),
 * agregar un nuevo preset acá — NO duplicar inline en pages.
 */

import { useTranslation } from "react-i18next";
import { MONO_CAPS } from "./typography";

/* ─── Pill base ────────────────────────────────────────────────── */

export function Pill({
  bg = "#F0F2F7",
  border,
  color = "#0A1628",
  fontSize = 10,
  padding = "2px 8px",
  borderRadius = 4,
  children,
  style,
}) {
  return (
    <span
      style={{
        ...MONO_CAPS,
        display: "inline-block",
        padding,
        borderRadius,
        background: bg,
        border: border ? `1px solid ${border}` : undefined,
        color,
        fontSize,
        letterSpacing: "0.12em",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ─── Project status ───────────────────────────────────────────── */

const PROJECT_STATUS_STYLES = {
  draft:     { bg: "#F0F2F7", border: "#C8CDD8", color: "#3D4A66", labelKey: "comp_pills.project_draft" },
  active:    { bg: "#D9F1E5", border: "#16A34A", color: "#0A6131", labelKey: "comp_pills.project_active" },
  paused:    { bg: "#FCF1DC", border: "#E8A33D", color: "#7E5212", labelKey: "comp_pills.project_paused" },
  completed: { bg: "#DBEAFE", border: "#2563EB", color: "#1E3A8A", labelKey: "comp_pills.project_completed" },
  cancelled: { bg: "#FEE2E2", border: "#DC2626", color: "#7F1D1D", labelKey: "comp_pills.project_cancelled" },
};

export function ProjectStatusPill({ status }) {
  const { t } = useTranslation("common");
  const s = PROJECT_STATUS_STYLES[status] || PROJECT_STATUS_STYLES.draft;
  const labelKey = PROJECT_STATUS_STYLES[status]?.labelKey;
  return (
    <Pill bg={s.bg} border={s.border} color={s.color}>
      {labelKey ? t(labelKey) : status}
    </Pill>
  );
}

/* ─── WO status ────────────────────────────────────────────────── */

const WO_STATUS_STYLES = {
  intake:     { bg: "#F0F2F7", color: "#3D4A66", labelKey: "comp_pills.wo_intake" },
  triage:     { bg: "#DBEAFE", color: "#1E3A8A", labelKey: "comp_pills.wo_triage" },
  pre_flight: { bg: "#DBEAFE", color: "#1E3A8A", labelKey: "comp_pills.wo_pre_flight" },
  dispatched: { bg: "#DBEAFE", color: "#1E40AF", labelKey: "comp_pills.wo_dispatched" },
  en_route:   { bg: "#E0E7FF", color: "#0A1628", labelKey: "comp_pills.wo_en_route" },
  on_site:    { bg: "#E0E7FF", color: "#0A1628", labelKey: "comp_pills.wo_on_site" },
  resolved:   { bg: "#D9F1E5", color: "#0A6131", labelKey: "comp_pills.wo_resolved" },
  closed:     { bg: "#F0F2F7", color: "#8B95A8", labelKey: "comp_pills.wo_closed" },
  cancelled:  { bg: "#FEE2E2", color: "#7F1D1D", labelKey: "comp_pills.wo_cancelled" },
};

export function WoStatusPill({ status }) {
  const { t } = useTranslation("common");
  const known = WO_STATUS_STYLES[status];
  const s = known || WO_STATUS_STYLES.intake;
  const label = known ? t(known.labelKey) : (status || "").replace("_", " ");
  return (
    <Pill bg={s.bg} color={s.color} padding="2px 7px" borderRadius={3} fontSize={9.5}>
      {label}
    </Pill>
  );
}

/* ─── Severity ─────────────────────────────────────────────────── */

const SEVERITY_COLORS = {
  low:      "#3D4A66",
  normal:   "#3D4A66",
  high:     "#B45309",
  critical: "#DC2626",
};

const SEVERITY_LABEL_KEYS = {
  low: "comp_pills.severity_low",
  normal: "comp_pills.severity_normal",
  high: "comp_pills.severity_high",
  critical: "comp_pills.severity_critical",
};

export function SeverityPill({ severity }) {
  const { t } = useTranslation("common");
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.normal;
  const labelKey = SEVERITY_LABEL_KEYS[severity] || SEVERITY_LABEL_KEYS.normal;
  return (
    <span
      style={{
        ...MONO_CAPS,
        fontSize: 9.5,
        color,
        letterSpacing: "0.12em",
      }}
    >
      {t(labelKey)}
    </span>
  );
}

/* ─── Shield (brand · amber legítimo del Bronze tier preserved) ── */

const SHIELD_STYLES = {
  bronze:      { dot: "#A16207", labelKey: "comp_pills.shield_bronze" },
  bronze_plus: { dot: "#D97706", labelKey: "comp_pills.shield_bronze_plus" },
  silver:      { dot: "#94A3B8", labelKey: "comp_pills.shield_silver" },
  gold:        { dot: "#CA8A04", labelKey: "comp_pills.shield_gold" },
};

export function ShieldPill({ level }) {
  const { t } = useTranslation("common");
  const s = SHIELD_STYLES[level] || SHIELD_STYLES.bronze;
  return (
    <span
      style={{
        ...MONO_CAPS,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 9.5,
        color: "#3D4A66",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {t(s.labelKey)}
    </span>
  );
}

/* ─── Ball-in-court ────────────────────────────────────────────── */

const BALL_STYLES = {
  srs:    { bg: "#E0E7FF", color: "#0A1628", labelKey: "comp_pills.ball_srs" },
  tech:   { bg: "#DBEAFE", color: "#1E3A8A", labelKey: "comp_pills.ball_tech" },
  client: { bg: "#FCF1DC", color: "#7E5212", labelKey: "comp_pills.ball_client" },
};

export function BallPill({ side }) {
  const { t } = useTranslation("common");
  const s = BALL_STYLES[side] || BALL_STYLES.srs;
  return (
    <Pill bg={s.bg} color={s.color} padding="2px 7px" borderRadius={3} fontSize={9.5}>
      {t(s.labelKey)}
    </Pill>
  );
}

/* ─── Site status (binario active vs other + bullet dot) ───────── */

const SITE_STATUS_STYLES = {
  active:   { dot: "#16A34A", color: "#0A6131", labelKey: "comp_pills.site_active" },
  inactive: { dot: "#8B95A8", color: "#8B95A8", labelKey: "comp_pills.site_inactive" },
  pending:  { dot: "#E8A33D", color: "#7E5212", labelKey: "comp_pills.site_pending" },
};

export function SiteStatusPill({ status }) {
  const { t } = useTranslation("common");
  const known = SITE_STATUS_STYLES[status];
  const s = known || SITE_STATUS_STYLES.inactive;
  const label = known ? t(known.labelKey) : (status || "—");
  return (
    <span
      style={{
        ...MONO_CAPS,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 9.5,
        color: s.color,
        letterSpacing: "0.12em",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {label}
    </span>
  );
}
