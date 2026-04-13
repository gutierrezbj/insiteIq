import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import {
  Bell, BellRing, X, Zap, AlertTriangle, Clock, FileWarning,
  Camera, Users, ChevronRight, Shield,
} from "lucide-react";

/* ── Severity config ─────────────────────────────────────────────── */
const SEV = {
  critical: {
    icon: Zap, color: "text-red-400", bg: "bg-red-500/10",
    border: "border-red-500/30", badge: "bg-red-500", pulse: true,
  },
  high: {
    icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10",
    border: "border-amber-500/30", badge: "bg-amber-500", pulse: false,
  },
  medium: {
    icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10",
    border: "border-yellow-500/30", badge: "bg-yellow-500", pulse: false,
  },
  low: {
    icon: FileWarning, color: "text-stone-400", bg: "bg-stone-500/10",
    border: "border-stone-500/30", badge: "bg-stone-500", pulse: false,
  },
};

/* ── Alert type icons ────────────────────────────────────────────── */
const TYPE_ICON = {
  sla_breach: Zap,
  sla_critical: AlertTriangle,
  unassigned_urgent: Users,
  stale_intervention: Clock,
  missing_evidence: Camera,
  pending_deliverable: FileWarning,
  no_coordinator: Shield,
};

/* ── Time ago ────────────────────────────────────────────────────── */
function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Single Alert Row ────────────────────────────────────────────── */
function AlertRow({ alert }) {
  const sev = SEV[alert.severity] || SEV.medium;
  const Icon = TYPE_ICON[alert.type] || sev.icon;

  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${sev.bg} ${sev.border} ${sev.pulse ? "animate-pulse" : ""} transition-all`}>
      <Icon size={14} className={`${sev.color} mt-0.5 flex-shrink-0`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-bold ${sev.color}`}>{alert.title}</span>
          <span className="text-2xs text-text-tertiary font-mono flex-shrink-0">{timeAgo(alert.created_at)}</span>
        </div>
        <p className="text-2xs text-text-secondary mt-0.5 leading-relaxed">{alert.detail}</p>
        {alert.client && (
          <span className="inline-block text-2xs font-mono text-text-tertiary mt-1 px-1.5 py-0.5 bg-surface-overlay rounded">{alert.client}</span>
        )}
      </div>
      {alert.intervention_id && (
        <Link
          to={`/interventions/${alert.intervention_id}`}
          className="flex-shrink-0 mt-0.5 text-text-tertiary hover:text-primary transition-colors"
          title="View intervention"
        >
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN: AlertsPanel — Bell icon + dropdown panel
   ══════════════════════════════════════════════════════════════════════ */
export default function AlertsPanel() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [counts, setCounts] = useState({ total: 0, critical: 0, high: 0 });

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get("/dashboard/alerts");
      setAlerts(res.data || []);
      setCounts(res.counts || { total: 0, critical: 0, high: 0 });
    } catch (e) {
      console.error("[Alerts] fetch error:", e);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  const hasCritical = counts.critical > 0;
  const hasAlerts = counts.total > 0;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
          hasCritical
            ? "bg-red-500/15 border-red-500/30 text-red-400 animate-pulse"
            : hasAlerts
            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
            : "bg-surface-raised border-surface-border text-text-tertiary hover:text-text-secondary"
        }`}
      >
        {hasCritical ? <BellRing size={14} /> : <Bell size={14} />}
        {hasAlerts && (
          <span className={`text-2xs font-mono font-bold ${hasCritical ? "text-red-400" : "text-amber-400"}`}>
            {counts.total}
          </span>
        )}
        {/* Red dot */}
        {hasCritical && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-surface-base animate-pulse" />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[999]" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 z-[1000] w-[400px] max-h-[70vh] bg-surface-base border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface-raised/50">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-primary" />
                <span className="text-sm font-bold text-text-primary">Alerts</span>
                {counts.critical > 0 && (
                  <span className="text-2xs font-mono font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded">{counts.critical} CRIT</span>
                )}
                {counts.high > 0 && (
                  <span className="text-2xs font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{counts.high} HIGH</span>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-text-tertiary hover:text-text-primary transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Alert list */}
            <div className="overflow-y-auto flex-1 p-3 space-y-2 scrollbar-thin">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-text-tertiary">
                  <Shield size={24} className="text-emerald-400 mb-2" />
                  <span className="text-sm font-medium text-emerald-400">All clear</span>
                  <span className="text-2xs mt-1">No operational alerts</span>
                </div>
              ) : (
                alerts.map((alert, idx) => (
                  <AlertRow key={`${alert.type}-${alert.reference || idx}`} alert={alert} />
                ))
              )}
            </div>

            {/* Footer */}
            {alerts.length > 0 && (
              <div className="px-4 py-2.5 border-t border-surface-border bg-surface-raised/30">
                <span className="text-2xs text-text-tertiary">
                  Showing {alerts.length} alert{alerts.length !== 1 ? "s" : ""} — refreshes every 30s
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
