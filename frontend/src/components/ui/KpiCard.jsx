/**
 * KPI card — accent-bar signature + label-caps + big mono value.
 * tone: 'default' | 'primary' | 'success' | 'warning' | 'danger'
 */

const TONE_STYLES = {
  default: { bar: "border-l-surface-border",    value: "text-text-primary" },
  primary: { bar: "border-l-primary",           value: "text-primary-light" },
  success: { bar: "border-l-success",           value: "text-success" },
  warning: { bar: "border-l-warning",           value: "text-warning" },
  danger:  { bar: "border-l-danger",            value: "text-danger" },
};

export default function KpiCard({ label, value, hint, tone = "default", loading = false }) {
  const s = TONE_STYLES[tone] || TONE_STYLES.default;
  return (
    <div
      className={`bg-surface-raised border-l-3 ${s.bar} rounded-sm px-4 py-3`}
      style={{ borderLeftWidth: "3px" }}
    >
      <div className="label-caps mb-1.5">{label}</div>
      <div className={`font-mono text-2xl font-semibold ${s.value} leading-tight`}>
        {loading ? <span className="opacity-50">—</span> : value}
      </div>
      {hint && <div className="font-body text-2xs text-text-tertiary mt-1">{hint}</div>}
    </div>
  );
}
