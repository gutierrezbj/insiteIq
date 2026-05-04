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
  draft:     { bg: "#F0F2F7", border: "#C8CDD8", color: "#3D4A66" },
  active:    { bg: "#D9F1E5", border: "#16A34A", color: "#0A6131" },
  paused:    { bg: "#FCF1DC", border: "#E8A33D", color: "#7E5212" },
  completed: { bg: "#DBEAFE", border: "#2563EB", color: "#1E3A8A" },
  cancelled: { bg: "#FEE2E2", border: "#DC2626", color: "#7F1D1D" },
};

export function ProjectStatusPill({ status }) {
  const s = PROJECT_STATUS_STYLES[status] || PROJECT_STATUS_STYLES.draft;
  return (
    <Pill bg={s.bg} border={s.border} color={s.color}>
      {status}
    </Pill>
  );
}

/* ─── WO status ────────────────────────────────────────────────── */

const WO_STATUS_STYLES = {
  intake:     { bg: "#F0F2F7", color: "#3D4A66" },
  triage:     { bg: "#DBEAFE", color: "#1E3A8A" },
  pre_flight: { bg: "#DBEAFE", color: "#1E3A8A" },
  dispatched: { bg: "#DBEAFE", color: "#1E40AF" },
  en_route:   { bg: "#E0E7FF", color: "#0A1628" },
  on_site:    { bg: "#E0E7FF", color: "#0A1628" },
  resolved:   { bg: "#D9F1E5", color: "#0A6131" },
  closed:     { bg: "#F0F2F7", color: "#8B95A8" },
  cancelled:  { bg: "#FEE2E2", color: "#7F1D1D" },
};

export function WoStatusPill({ status }) {
  const s = WO_STATUS_STYLES[status] || WO_STATUS_STYLES.intake;
  return (
    <Pill bg={s.bg} color={s.color} padding="2px 7px" borderRadius={3} fontSize={9.5}>
      {(status || "").replace("_", " ")}
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

export function SeverityPill({ severity }) {
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.normal;
  return (
    <span
      style={{
        ...MONO_CAPS,
        fontSize: 9.5,
        color,
        letterSpacing: "0.12em",
      }}
    >
      {severity || "normal"}
    </span>
  );
}

/* ─── Shield (brand · amber legítimo del Bronze tier preserved) ── */

const SHIELD_STYLES = {
  bronze:      { dot: "#A16207", label: "BRONZE" },
  bronze_plus: { dot: "#D97706", label: "BRONZE+" },
  silver:      { dot: "#94A3B8", label: "SILVER" },
  gold:        { dot: "#CA8A04", label: "GOLD" },
};

export function ShieldPill({ level }) {
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
      {s.label}
    </span>
  );
}

/* ─── Ball-in-court ────────────────────────────────────────────── */

const BALL_STYLES = {
  srs:    { bg: "#E0E7FF", color: "#0A1628", label: "SRS" },
  tech:   { bg: "#DBEAFE", color: "#1E3A8A", label: "TECH" },
  client: { bg: "#FCF1DC", color: "#7E5212", label: "CLIENT" },
};

export function BallPill({ side }) {
  const s = BALL_STYLES[side] || BALL_STYLES.srs;
  return (
    <Pill bg={s.bg} color={s.color} padding="2px 7px" borderRadius={3} fontSize={9.5}>
      {s.label}
    </Pill>
  );
}

/* ─── Site status (binario active vs other + bullet dot) ───────── */

const SITE_STATUS_STYLES = {
  active:   { dot: "#16A34A", color: "#0A6131" },
  inactive: { dot: "#8B95A8", color: "#8B95A8" },
  pending:  { dot: "#E8A33D", color: "#7E5212" },
};

export function SiteStatusPill({ status }) {
  const s = SITE_STATUS_STYLES[status] || SITE_STATUS_STYLES.inactive;
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
      {status || "—"}
    </span>
  );
}
