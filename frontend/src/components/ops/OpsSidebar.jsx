import { useMemo } from "react";
import { Zap, AlertTriangle, Shield, User, MapPin, CheckCircle, XCircle, Clock, FileWarning, Award } from "lucide-react";

/* ── Status colors ────────────────────────────────────────────────── */
const ST_COLOR = {
  assigned: "text-gray-400", accepted: "text-cyan-400", en_route: "text-yellow-400",
  on_site: "text-purple-400", in_progress: "text-amber-400",
};

/* ── SLA helper ───────────────────────────────────────────────────── */
function slaPercent(sla) {
  if (!sla?.resolution_minutes || !sla?.started_at) return 0;
  return ((Date.now() - new Date(sla.started_at).getTime()) / (sla.resolution_minutes * 60000)) * 100;
}

function fmtMins(ms) {
  const m = Math.floor(Math.abs(ms) / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

/* ══════════════════════════════════════════════════════════════════════
   SECTION: Alerts & Escalations
   ══════════════════════════════════════════════════════════════════════ */
function AlertsFeed({ activeInterventions }) {
  const alerts = useMemo(() => {
    const items = [];
    const now = Date.now();
    activeInterventions.forEach((i) => {
      const pct = slaPercent(i.sla);
      if (pct >= 100) {
        const over = now - (new Date(i.sla.started_at).getTime() + i.sla.resolution_minutes * 60000);
        items.push({ type: "breach", intv: i, pct, over, sort: 0 });
      } else if (pct >= 90) {
        items.push({ type: "critical", intv: i, pct, sort: 1 });
      } else if (pct >= 75) {
        items.push({ type: "risk", intv: i, pct, sort: 2 });
      }
      // Unassigned emergency/high
      if (!i.technician_id && (i.priority === "emergency" || i.priority === "high")) {
        items.push({ type: "unassigned", intv: i, sort: -1 });
      }
    });
    return items.sort((a, b) => a.sort - b.sort);
  }, [activeInterventions]);

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 text-emerald-400 text-xs">
        <CheckCircle size={14} />
        <span className="font-medium">All clear — no escalations</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {alerts.map((a, idx) => (
        <div
          key={`${a.type}-${a.intv.reference}-${idx}`}
          className={`flex items-start gap-2 px-2.5 py-2 rounded-md border text-xs ${
            a.type === "breach" ? "bg-red-500/10 border-red-500/30 animate-pulse" :
            a.type === "critical" ? "bg-red-500/10 border-red-500/20" :
            a.type === "unassigned" ? "bg-amber-500/10 border-amber-500/30" :
            "bg-amber-500/5 border-amber-500/20"
          }`}
        >
          {a.type === "breach" && <Zap size={12} className="text-red-400 mt-0.5 flex-shrink-0" />}
          {a.type === "critical" && <AlertTriangle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />}
          {a.type === "risk" && <Shield size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />}
          {a.type === "unassigned" && <XCircle size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-text-primary">{a.intv.reference}</span>
              {a.type === "breach" && <span className="text-red-400 font-bold">+{fmtMins(a.over)} OVER</span>}
              {a.type === "critical" && <span className="text-red-400 font-bold">CRITICAL</span>}
              {a.type === "risk" && <span className="text-amber-400">AT RISK</span>}
              {a.type === "unassigned" && <span className="text-amber-400 font-bold">NO TECH</span>}
            </div>
            <p className="text-text-tertiary truncate mt-0.5">{a.intv.site_name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SECTION: Workforce Status
   ══════════════════════════════════════════════════════════════════════ */
function WorkforceStatus({ workforce }) {
  if (!workforce) return <p className="text-text-tertiary text-xs">Loading...</p>;

  const { data, counts } = workforce;
  return (
    <div className="space-y-3">
      {/* Counts bar */}
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /><span className="font-mono text-text-primary">{counts.available}</span><span className="text-text-tertiary">avail</span></span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="font-mono text-text-primary">{counts.busy}</span><span className="text-text-tertiary">active</span></span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-500" /><span className="font-mono text-text-primary">{counts.offline}</span><span className="text-text-tertiary">off</span></span>
      </div>

      {/* Busy technicians (most important) */}
      {(data.busy || []).map((t) => (
        <div key={t.id} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-text-primary font-medium">{t.name}</span>
            <span className="text-text-tertiary ml-1">{t.city}</span>
          </div>
          {t.current_mission && (
            <span className={`font-mono text-2xs flex-shrink-0 ${ST_COLOR[t.current_mission.status] || "text-text-tertiary"}`}>
              {t.current_mission.reference}
            </span>
          )}
        </div>
      ))}

      {/* Available */}
      {(data.available || []).map((t) => (
        <div key={t.id} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-text-secondary">{t.name}</span>
          <span className="text-text-tertiary">{t.city}</span>
        </div>
      ))}

      {/* Offline (dimmed) */}
      {(data.offline || []).map((t) => (
        <div key={t.id} className="flex items-center gap-2 text-xs opacity-50">
          <span className="w-2 h-2 rounded-full bg-gray-500 flex-shrink-0" />
          <span className="text-text-tertiary">{t.name}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SECTION: SLA Overview
   ══════════════════════════════════════════════════════════════════════ */
function SLAOverview({ activeInterventions }) {
  const { onTrack, atRisk, critical, breached, total } = useMemo(() => {
    let ot = 0, ar = 0, cr = 0, br = 0;
    activeInterventions.forEach((i) => {
      const pct = slaPercent(i.sla);
      if (pct >= 100) br++;
      else if (pct >= 90) cr++;
      else if (pct >= 75) ar++;
      else ot++;
    });
    return { onTrack: ot, atRisk: ar, critical: cr, breached: br, total: ot + ar + cr + br };
  }, [activeInterventions]);

  if (total === 0) return <p className="text-text-tertiary text-xs">No active SLAs</p>;

  const pctBar = (val, color) => ({ width: `${total ? (val / total) * 100 : 0}%`, className: `h-full ${color}` });

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="w-full h-3 bg-surface-overlay rounded-full overflow-hidden flex">
        {onTrack > 0 && <div style={{ width: `${(onTrack / total) * 100}%` }} className="h-full bg-emerald-500" />}
        {atRisk > 0 && <div style={{ width: `${(atRisk / total) * 100}%` }} className="h-full bg-amber-500" />}
        {critical > 0 && <div style={{ width: `${(critical / total) * 100}%` }} className="h-full bg-red-500" />}
        {breached > 0 && <div style={{ width: `${(breached / total) * 100}%` }} className="h-full bg-red-700" />}
      </div>
      {/* Labels */}
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500" /><span className="text-text-secondary">On Track</span><span className="font-mono text-text-primary ml-auto">{onTrack}</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500" /><span className="text-text-secondary">At Risk</span><span className="font-mono text-text-primary ml-auto">{atRisk}</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500" /><span className="text-text-secondary">Critical</span><span className="font-mono text-text-primary ml-auto">{critical}</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-700" /><span className="text-text-secondary">Breached</span><span className="font-mono text-text-primary ml-auto">{breached}</span></div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SECTION: Compliance
   ══════════════════════════════════════════════════════════════════════ */
function ComplianceWidget({ compliance }) {
  if (!compliance) return <p className="text-text-tertiary text-xs">Loading...</p>;

  const allGood = compliance.status === "ok";

  return (
    <div className="space-y-2">
      {allGood ? (
        <div className="flex items-center gap-2 text-emerald-400 text-xs">
          <CheckCircle size={14} />
          <span className="font-medium">All clear</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {compliance.preflight_pending > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <FileWarning size={12} />
              <span><span className="font-mono font-bold">{compliance.preflight_pending}</span> pre-flight pending</span>
            </div>
          )}
          {compliance.missing_proof > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <XCircle size={12} />
              <span><span className="font-mono font-bold">{compliance.missing_proof}</span> missing proof of work</span>
            </div>
          )}
          {(compliance.certs_expiring || []).length > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <Award size={12} />
              <span><span className="font-mono font-bold">{compliance.certs_expiring.length}</span> cert(s) expiring &lt;30d</span>
            </div>
          )}
          {(compliance.certs_expiring || []).map((c, i) => (
            <div key={i} className="text-2xs text-text-tertiary pl-5">
              {c.tech_name} — {c.cert_name} ({c.expires})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SECTION: Today Summary
   ══════════════════════════════════════════════════════════════════════ */
function TodaySummary({ today, stats }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div><span className="text-text-tertiary">Created</span><p className="font-mono text-text-primary font-bold">{today?.created_today ?? "—"}</p></div>
      <div><span className="text-text-tertiary">Completed</span><p className="font-mono text-text-primary font-bold">{today?.completed_today ?? "—"}</p></div>
      <div><span className="text-text-tertiary">This Week</span><p className="font-mono text-text-primary font-bold">{stats?.this_week ?? "—"}</p></div>
      <div><span className="text-text-tertiary">This Month</span><p className="font-mono text-text-primary font-bold">{stats?.this_month ?? "—"}</p></div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN SIDEBAR COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
export default function OpsSidebar({ activeInterventions, workforce, compliance, today, stats, selectedIntv, children }) {
  return (
    <div className="h-full overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
      {/* Selected mission detail (injected from parent) */}
      {children}

      {/* Alerts */}
      <SidebarSection title="Alerts & Escalations" icon={<Zap size={12} className="text-red-400" />}>
        <AlertsFeed activeInterventions={activeInterventions} />
      </SidebarSection>

      {/* Workforce */}
      <SidebarSection title="Workforce" icon={<User size={12} className="text-blue-400" />}>
        <WorkforceStatus workforce={workforce} />
      </SidebarSection>

      {/* SLA Overview */}
      <SidebarSection title="SLA Status" icon={<Clock size={12} className="text-amber-400" />}>
        <SLAOverview activeInterventions={activeInterventions} />
      </SidebarSection>

      {/* Compliance */}
      <SidebarSection title="Compliance" icon={<Shield size={12} className="text-emerald-400" />}>
        <ComplianceWidget compliance={compliance} />
      </SidebarSection>

      {/* Today */}
      <SidebarSection title="Summary" icon={<CheckCircle size={12} className="text-text-tertiary" />}>
        <TodaySummary today={today} stats={stats} />
      </SidebarSection>
    </div>
  );
}

/* ── Sidebar section wrapper ──────────────────────────────────────── */
function SidebarSection({ title, icon, children }) {
  return (
    <div className="bg-surface-raised border border-surface-border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-2xs font-mono uppercase tracking-wider text-text-tertiary">{title}</h4>
      </div>
      {children}
    </div>
  );
}
