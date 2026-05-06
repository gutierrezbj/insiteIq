/**
 * Small badge primitives reused across SRS space.
 * All use Nucleus tokens (label-caps mono, accent colors, radius sm).
 */
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";

// Work order status → color token (semantic)
const WO_STATUS_STYLES = {
  intake:     { bg: "bg-surface-overlay",   text: "text-text-secondary", labelKey: "comp_badges.wo_intake" },
  triage:     { bg: "bg-surface-overlay",   text: "text-info",           labelKey: "comp_badges.wo_triage" },
  pre_flight: { bg: "bg-surface-overlay",   text: "text-info",           labelKey: "comp_badges.wo_pre_flight" },
  dispatched: { bg: "bg-info-muted",           text: "text-info",           labelKey: "comp_badges.wo_dispatched" },
  en_route:   { bg: "bg-primary-muted",     text: "text-primary-light",  labelKey: "comp_badges.wo_en_route" },
  on_site:    { bg: "bg-primary-muted",     text: "text-primary-light",  labelKey: "comp_badges.wo_on_site" },
  resolved:   { bg: "bg-success-muted",     text: "text-success",        labelKey: "comp_badges.wo_resolved" },
  closed:     { bg: "bg-surface-overlay",   text: "text-text-tertiary",  labelKey: "comp_badges.wo_closed" },
  cancelled:  { bg: "bg-danger-muted",      text: "text-danger",         labelKey: "comp_badges.wo_cancelled" },
};

export function StatusBadge({ status }) {
  const { t } = useTranslation("common");
  const s = WO_STATUS_STYLES[status] || WO_STATUS_STYLES.intake;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-sm font-mono text-2xs uppercase tracking-widest-srs ${s.bg} ${s.text}`}
    >
      {t(s.labelKey)}
    </span>
  );
}

// Shield level
const SHIELD_STYLES = {
  bronze:      { dot: "bg-amber-700",         labelKey: "comp_badges.shield_bronze" },
  bronze_plus: { dot: "bg-primary",           labelKey: "comp_badges.shield_bronze_plus" },
  silver:      { dot: "bg-text-secondary",    labelKey: "comp_badges.shield_silver" },
  gold:        { dot: "bg-primary-light",     labelKey: "comp_badges.shield_gold" },
};

export function ShieldBadge({ level }) {
  const { t } = useTranslation("common");
  const s = SHIELD_STYLES[level] || SHIELD_STYLES.bronze;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest-srs text-text-secondary">
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {t(s.labelKey)}
    </span>
  );
}

// Ball-in-court side
const BALL_STYLES = {
  srs:    { bg: "bg-primary-muted",   text: "text-primary-light", labelKey: "comp_badges.ball_srs" },
  tech:   { bg: "bg-info-muted",         text: "text-info",          labelKey: "comp_badges.ball_tech" },
  client: { bg: "bg-warning-muted",   text: "text-warning",       labelKey: "comp_badges.ball_client" },
};

export function BallBadge({ side, sinceIso }) {
  const { t } = useTranslation("common");
  const s = BALL_STYLES[side] || BALL_STYLES.srs;
  const age = formatAge(sinceIso);
  const label = t(s.labelKey);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-mono text-2xs uppercase tracking-widest-srs ${s.bg} ${s.text}`}
      title={t("comp_badges.ball_title", { side: label, since: sinceIso ?? "—" })}
    >
      <span>◐</span>
      {label}
      {age && <span className="opacity-60 normal-case tracking-normal">· {age}</span>}
    </span>
  );
}

// Severity
const SEVERITY_STYLES = {
  low:      { text: "text-text-tertiary", labelKey: "comp_badges.severity_low" },
  normal:   { text: "text-text-secondary", labelKey: "comp_badges.severity_normal" },
  high:     { text: "text-warning", labelKey: "comp_badges.severity_high" },
  critical: { text: "text-danger", labelKey: "comp_badges.severity_critical" },
};

export function SeverityBadge({ severity }) {
  const { t } = useTranslation("common");
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.normal;
  return (
    <span className={`font-mono text-2xs uppercase tracking-widest-srs ${s.text}`}>
      {t(s.labelKey)}
    </span>
  );
}

// Project status
const PROJECT_STATUS_STYLES = {
  draft:     { text: "text-text-tertiary", labelKey: "comp_badges.project_draft" },
  active:    { text: "text-success",       labelKey: "comp_badges.project_active" },
  on_hold:   { text: "text-warning",       labelKey: "comp_badges.project_on_hold" },
  closed:    { text: "text-text-tertiary", labelKey: "comp_badges.project_closed" },
  cancelled: { text: "text-danger",        labelKey: "comp_badges.project_cancelled" },
};

export function ProjectStatusBadge({ status }) {
  const { t } = useTranslation("common");
  const s = PROJECT_STATUS_STYLES[status] || PROJECT_STATUS_STYLES.draft;
  return (
    <span className={`font-mono text-2xs uppercase tracking-widest-srs ${s.text}`}>
      {t(s.labelKey)}
    </span>
  );
}

// Helpers — top-level pure function, uses i18n singleton (cannot use hook)
function formatAge(iso) {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return null;
  const delta = Date.now() - ts;
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return i18n.t("comp_badges.age_just_now");
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export { formatAge };
