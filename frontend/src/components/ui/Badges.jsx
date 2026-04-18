/**
 * Small badge primitives reused across SRS space.
 * All use Nucleus tokens (label-caps mono, accent colors, radius sm).
 */

// Work order status → color token (semantic)
const WO_STATUS_STYLES = {
  intake:     { bg: "bg-surface-overlay",   text: "text-text-secondary", label: "Intake" },
  triage:     { bg: "bg-surface-overlay",   text: "text-info",           label: "Triage" },
  pre_flight: { bg: "bg-surface-overlay",   text: "text-info",           label: "Pre-flight" },
  dispatched: { bg: "bg-info-muted",           text: "text-info",           label: "Dispatched" },
  en_route:   { bg: "bg-primary-muted",     text: "text-primary-light",  label: "En route" },
  on_site:    { bg: "bg-primary-muted",     text: "text-primary-light",  label: "On site" },
  resolved:   { bg: "bg-success-muted",     text: "text-success",        label: "Resolved" },
  closed:     { bg: "bg-surface-overlay",   text: "text-text-tertiary",  label: "Closed" },
  cancelled:  { bg: "bg-danger-muted",      text: "text-danger",         label: "Cancelled" },
};

export function StatusBadge({ status }) {
  const s = WO_STATUS_STYLES[status] || WO_STATUS_STYLES.intake;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-sm font-mono text-2xs uppercase tracking-widest-srs ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

// Shield level
const SHIELD_STYLES = {
  bronze:      { dot: "bg-amber-700",         label: "BRONZE" },
  bronze_plus: { dot: "bg-primary",           label: "BRONZE+" },
  silver:      { dot: "bg-text-secondary",    label: "SILVER" },
  gold:        { dot: "bg-primary-light",     label: "GOLD" },
};

export function ShieldBadge({ level }) {
  const s = SHIELD_STYLES[level] || SHIELD_STYLES.bronze;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest-srs text-text-secondary">
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// Ball-in-court side
const BALL_STYLES = {
  srs:    { bg: "bg-primary-muted",   text: "text-primary-light", label: "SRS" },
  tech:   { bg: "bg-info-muted",         text: "text-info",          label: "TECH" },
  client: { bg: "bg-warning-muted",   text: "text-warning",       label: "CLIENT" },
};

export function BallBadge({ side, sinceIso }) {
  const s = BALL_STYLES[side] || BALL_STYLES.srs;
  const age = formatAge(sinceIso);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-mono text-2xs uppercase tracking-widest-srs ${s.bg} ${s.text}`}
      title={`Ball on ${s.label} · since ${sinceIso ?? "—"}`}
    >
      <span>◐</span>
      {s.label}
      {age && <span className="opacity-60 normal-case tracking-normal">· {age}</span>}
    </span>
  );
}

// Severity
const SEVERITY_STYLES = {
  low:      { text: "text-text-tertiary", label: "low" },
  normal:   { text: "text-text-secondary", label: "normal" },
  high:     { text: "text-warning", label: "high" },
  critical: { text: "text-danger", label: "critical" },
};

export function SeverityBadge({ severity }) {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.normal;
  return (
    <span className={`font-mono text-2xs uppercase tracking-widest-srs ${s.text}`}>
      {s.label}
    </span>
  );
}

// Project status
export function ProjectStatusBadge({ status }) {
  const m = {
    draft:     { text: "text-text-tertiary", label: "draft" },
    active:    { text: "text-success",       label: "active" },
    on_hold:   { text: "text-warning",       label: "on hold" },
    closed:    { text: "text-text-tertiary", label: "closed" },
    cancelled: { text: "text-danger",        label: "cancelled" },
  };
  const s = m[status] || m.draft;
  return (
    <span className={`font-mono text-2xs uppercase tracking-widest-srs ${s.text}`}>
      {s.label}
    </span>
  );
}

// Helpers
function formatAge(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  const delta = Date.now() - t;
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export { formatAge };
