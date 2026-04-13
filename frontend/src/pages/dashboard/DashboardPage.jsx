import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { Activity, CheckCircle, AlertTriangle, MapPin, Users, ClipboardList, Map, BarChart3, Wrench, Navigation, Radio, Clock, ChevronRight, Timer, Zap, Shield, TrendingUp } from "lucide-react";
import ControlTowerMap from "../../components/maps/ControlTowerMap";

function StatCard({ label, value, icon: Icon, color = "primary", index = 0 }) {
  const colors = {
    primary: "bg-primary-muted text-primary-light",
    success: "bg-success-muted text-success",
    warning: "bg-warning-muted text-warning",
    danger: "bg-danger-muted text-danger",
    info: "bg-info-muted text-info",
  };

  return (
    <div className="bg-surface-raised border border-surface-border rounded-lg p-4 accent-bar stagger-item" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="label-caps">{label}</p>
          <p className="text-2xl font-bold text-text-primary font-mono mt-1">{value ?? "-"}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

/* ── Live Clock ───────────────────────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-2 bg-surface-overlay rounded-lg px-3 py-1.5 border border-surface-border">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      <span className="text-xs font-mono text-text-secondary tabular-nums">
        {time.toLocaleTimeString("en-US", { hour12: false })} UTC{time.getTimezoneOffset() > 0 ? "-" : "+"}{Math.abs(time.getTimezoneOffset() / 60)}
      </span>
    </div>
  );
}

/* ── Status config ─────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  assigned:    { label: "Assigned",    color: "bg-gray-500",   icon: ClipboardList },
  accepted:    { label: "Accepted",    color: "bg-cyan-600",   icon: CheckCircle },
  en_route:    { label: "En Route",    color: "bg-yellow-500", icon: Navigation },
  on_site:     { label: "On Site",     color: "bg-purple-600", icon: MapPin },
  in_progress: { label: "In Progress", color: "bg-amber-600",  icon: Wrench },
};

const PRIORITY_CONFIG = {
  emergency: { label: "EMER", color: "text-red-500 bg-red-500/10 border-red-500/30" },
  high:      { label: "HIGH", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  normal:    { label: "NORM", color: "text-text-tertiary bg-surface-overlay border-surface-border" },
  low:       { label: "LOW",  color: "text-text-tertiary bg-surface-overlay border-surface-border" },
};

/* ── Time helpers ──────────────────────────────────────────────────── */
function formatDuration(ms) {
  if (ms < 0) ms = Math.abs(ms);
  const totalSec = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) return `${hrs}h ${String(mins).padStart(2, "0")}m`;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── SLA Timer (ticks every second) ───────────────────────────────── */
function useLiveClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function SLATimer({ sla, status }) {
  const now = useLiveClock();
  if (!sla?.resolution_minutes || !sla?.started_at) return null;

  const startedAt = new Date(sla.started_at).getTime();
  const deadlineMs = startedAt + sla.resolution_minutes * 60000;
  const elapsed = now - startedAt;
  const totalBudget = sla.resolution_minutes * 60000;
  const remaining = deadlineMs - now;
  const pct = Math.min(100, Math.max(0, (elapsed / totalBudget) * 100));

  const isBreached = remaining < 0;
  const isWarning = !isBreached && pct > 75;
  const isCritical = !isBreached && pct > 90;

  const barColor = isBreached
    ? "bg-red-500"
    : isCritical
    ? "bg-red-500 animate-pulse"
    : isWarning
    ? "bg-amber-500"
    : "bg-emerald-500";

  const textColor = isBreached
    ? "text-red-400"
    : isCritical
    ? "text-red-400"
    : isWarning
    ? "text-amber-400"
    : "text-emerald-400";

  return (
    <div className="mt-2 pt-2 border-t border-surface-border/50">
      {/* Timer row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Timer size={10} className={textColor} />
          <span className={`text-2xs font-mono font-semibold ${textColor}`}>
            {isBreached ? "BREACHED" : "SLA"}
          </span>
        </div>
        <span className={`text-2xs font-mono font-bold tabular-nums ${textColor}`}>
          {isBreached ? `+${formatDuration(Math.abs(remaining))}` : formatDuration(remaining)}
        </span>
      </div>
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-surface-overlay rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {/* Elapsed / Budget */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-2xs text-text-tertiary font-mono">{formatDuration(elapsed)} elapsed</span>
        <span className="text-2xs text-text-tertiary font-mono">{Math.floor(sla.resolution_minutes / 60)}h budget</span>
      </div>
    </div>
  );
}

/* ── Escalation badge ─────────────────────────────────────────────── */
function EscalationBadge({ sla }) {
  const now = useLiveClock();
  if (!sla?.resolution_minutes || !sla?.started_at) return null;

  const startedAt = new Date(sla.started_at).getTime();
  const totalBudget = sla.resolution_minutes * 60000;
  const elapsed = now - startedAt;
  const pct = (elapsed / totalBudget) * 100;

  if (pct < 75) return null;
  if (pct >= 100) {
    return (
      <span className="flex items-center gap-1 text-2xs font-mono font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded border border-red-500/30 animate-pulse">
        <Zap size={9} /> ESCALATED
      </span>
    );
  }
  if (pct >= 90) {
    return (
      <span className="flex items-center gap-1 text-2xs font-mono font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
        <AlertTriangle size={9} /> CRITICAL
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-2xs font-mono font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
      <AlertTriangle size={9} /> AT RISK
    </span>
  );
}

function InterventionCard({ intv, index }) {
  const navigate = useNavigate();
  const st = STATUS_CONFIG[intv.status] || STATUS_CONFIG.assigned;
  const pr = PRIORITY_CONFIG[intv.priority] || PRIORITY_CONFIG.normal;
  const StIcon = st.icon;
  const lastEvent = intv.timeline?.[intv.timeline.length - 1];

  return (
    <button
      onClick={() => navigate(`/interventions/${intv.id || intv._id}`)}
      className="w-full text-left bg-surface-raised border border-surface-border rounded-lg p-3 hover:border-primary/40 hover:shadow-glow-primary/5 transition-all duration-fast ease-out-expo accent-bar stagger-item group"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-md ${st.color} flex items-center justify-center flex-shrink-0`}>
            <StIcon size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold text-primary">{intv.reference}</span>
              <span className={`text-2xs font-mono font-medium px-1.5 py-0.5 rounded border ${pr.color}`}>{pr.label}</span>
              <EscalationBadge sla={intv.sla} />
            </div>
            <p className="text-2xs text-text-tertiary mt-0.5">{st.label}</p>
          </div>
        </div>
        <ChevronRight size={14} className="text-text-tertiary group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>

      {/* Title */}
      {intv.title && (
        <p className="text-xs text-text-primary font-medium mb-1.5 line-clamp-1">{intv.title}</p>
      )}

      {/* Site + Tech row */}
      <div className="flex items-center gap-3 text-2xs text-text-tertiary mb-0.5">
        <span className="flex items-center gap-1 truncate">
          <MapPin size={10} className="flex-shrink-0" />
          {intv.site_name || "Unassigned"}
        </span>
        {intv.technician_name && (
          <span className="flex items-center gap-1 truncate">
            <Wrench size={10} className="flex-shrink-0" />
            {intv.technician_name}
          </span>
        )}
      </div>

      {/* Last activity */}
      {lastEvent && (
        <div className="flex items-center gap-1.5 text-2xs text-text-tertiary">
          <Clock size={9} />
          <span>{timeAgo(lastEvent.timestamp)}</span>
          {lastEvent.note && <span className="truncate">— {lastEvent.note}</span>}
        </div>
      )}

      {/* SLA Live Timer */}
      <SLATimer sla={intv.sla} status={intv.status} />
    </button>
  );
}

export default function DashboardPage() {
  const [view, setView] = useState("map"); // "map" | "stats"
  const navigate = useNavigate();
  const { data: today } = useFetch("/dashboard/today");
  const { data: stats } = useFetch("/dashboard/stats");
  const { data: sla } = useFetch("/dashboard/sla");
  const { data: sitesRes } = useFetch("/sites");
  const { data: techsRes } = useFetch("/technicians");
  const { data: intvsRes } = useFetch("/interventions");

  const t = today?.data || {};
  const s = stats?.data || {};
  const sl = sla?.data || {};

  /* ── Active interventions sorted by priority + recency ──────────── */
  const activeInterventions = useMemo(() => {
    const all = intvsRes?.data || [];
    const active = all.filter((i) =>
      ["assigned", "accepted", "en_route", "on_site", "in_progress"].includes(i.status)
    );
    const priorityOrder = { emergency: 0, high: 1, normal: 2, low: 3 };
    const statusOrder = { in_progress: 0, on_site: 1, en_route: 2, accepted: 3, assigned: 4 };
    return active.sort((a, b) => {
      const pd = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
      if (pd !== 0) return pd;
      return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    });
  }, [intvsRes]);

  /* ── Escalation counts ────────────────────────────────────────────── */
  const escalationCounts = useMemo(() => {
    let atRisk = 0, critical = 0, breached = 0;
    const now = Date.now();
    activeInterventions.forEach((i) => {
      if (!i.sla?.resolution_minutes || !i.sla?.started_at) return;
      const started = new Date(i.sla.started_at).getTime();
      const budget = i.sla.resolution_minutes * 60000;
      const pct = ((now - started) / budget) * 100;
      if (pct >= 100) breached++;
      else if (pct >= 90) critical++;
      else if (pct >= 75) atRisk++;
    });
    return { atRisk, critical, breached };
  }, [activeInterventions]);

  return (
    <div className="space-y-6">
      {/* Header with live clock */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-text-primary font-display">Control Tower</h2>
          {/* Escalation indicators */}
          {(escalationCounts.breached > 0 || escalationCounts.critical > 0 || escalationCounts.atRisk > 0) && (
            <div className="flex items-center gap-2">
              {escalationCounts.breached > 0 && (
                <span className="flex items-center gap-1 text-xs font-mono font-bold text-red-400 bg-red-500/15 px-2 py-1 rounded-md border border-red-500/30 animate-pulse">
                  <Zap size={12} /> {escalationCounts.breached} BREACH
                </span>
              )}
              {escalationCounts.critical > 0 && (
                <span className="flex items-center gap-1 text-xs font-mono font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">
                  <AlertTriangle size={12} /> {escalationCounts.critical} CRIT
                </span>
              )}
              {escalationCounts.atRisk > 0 && (
                <span className="flex items-center gap-1 text-xs font-mono font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                  <Shield size={12} /> {escalationCounts.atRisk} RISK
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LiveClock />
          <div className="flex bg-surface-overlay rounded-lg p-0.5 border border-surface-border">
            <button
              onClick={() => setView("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-fast ${view === "map" ? "bg-primary text-text-inverse" : "text-text-secondary hover:text-text-primary"}`}
            >
              <Map size={14} /> Map
            </button>
            <button
              onClick={() => setView("stats")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-fast ${view === "stats" ? "bg-primary text-text-inverse" : "text-text-secondary hover:text-text-primary"}`}
            >
              <BarChart3 size={14} /> Stats
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Now" value={t.active} icon={Activity} color="primary" index={0} />
        <StatCard label="Completed Today" value={t.completed_today} icon={CheckCircle} color="success" index={1} />
        <StatCard label="Total Sites" value={s.total_sites} icon={MapPin} color="info" index={2} />
        <StatCard label="Technicians" value={s.total_technicians} icon={Users} color="primary" index={3} />
      </div>

      {view === "map" && (
        <>
          {/* Map + Live Feed side by side on desktop */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Map — 2/3 */}
            <div className="xl:col-span-2 bg-surface-raised border border-surface-border rounded-lg p-3 accent-bar">
              <div className="flex items-center justify-between mb-3">
                <h3 className="label-caps">Global Operations</h3>
                <div className="flex items-center gap-4 text-2xs text-text-tertiary">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" /> Sites</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" /> Techs</span>
                </div>
              </div>
              <ControlTowerMap
                sites={sitesRes?.data || []}
                technicians={techsRes?.data || []}
                interventions={intvsRes?.data || []}
              />
            </div>

            {/* Live Feed — 1/3 */}
            <div className="bg-surface-raised border border-surface-border rounded-lg p-3 accent-bar flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="label-caps">Live Missions</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-2xs text-text-tertiary font-mono">{activeInterventions.length} active</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[380px] pr-1 scrollbar-thin">
                {activeInterventions.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-text-tertiary text-sm">
                    No active missions
                  </div>
                )}
                {activeInterventions.map((intv, i) => (
                  <InterventionCard key={intv.id || intv._id || intv.reference} intv={intv} index={i} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {view === "stats" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="This Week" value={s.this_week} icon={ClipboardList} color="primary" index={4} />
            <StatCard label="This Month" value={s.this_month} icon={ClipboardList} color="primary" index={5} />
            <StatCard label="Fix Rate" value={s.fix_rate ? `${s.fix_rate}%` : "-"} icon={CheckCircle} color="success" index={6} />
            <StatCard label="SLA At Risk" value={(sl.at_risk?.length || 0) + (sl.breached?.length || 0)} icon={AlertTriangle} color={sl.breached?.length ? "danger" : "warning"} index={7} />
          </div>

          {t.by_status && (
            <div className="bg-surface-raised border border-surface-border rounded-lg p-4 accent-bar">
              <h3 className="label-caps mb-3">Active by Status</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(t.by_status).map(([status, count]) => (
                  <div key={status} className="bg-surface-overlay rounded-md px-3 py-1.5 text-sm">
                    <span className="text-text-secondary">{status}: </span>
                    <span className="text-text-primary font-mono font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {sl.breached?.length > 0 && (
        <div className="bg-danger-muted border border-danger/30 rounded-lg p-4 accent-bar-danger">
          <h3 className="label-caps text-danger mb-2">SLA Breached</h3>
          {sl.breached.map((b) => (
            <div key={b.id} className="text-sm text-danger">
              <span className="font-mono">{b.reference}</span> — {b.status}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
