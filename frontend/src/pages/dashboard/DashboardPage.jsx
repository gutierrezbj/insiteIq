import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { Activity, CheckCircle, AlertTriangle, MapPin, Users, Wrench, Navigation, Clock, ChevronRight, Timer, Zap, Shield, Globe, Radio } from "lucide-react";
import ControlTowerMap from "../../components/maps/ControlTowerMap";

/* ── Live Clock ───────────────────────────────────────────────────── */
function useLiveClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function LiveClock() {
  const now = useLiveClock();
  const d = new Date(now);
  const utcH = d.getUTCHours();
  const utcM = d.getUTCMinutes();
  const utcS = d.getUTCSeconds();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    <span className="font-mono text-xs text-text-secondary tabular-nums">
      {pad(utcH)}:{pad(utcM)}:{pad(utcS)} <span className="text-text-tertiary">UTC</span>
    </span>
  );
}

/* ── Status config ────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  assigned:    { label: "Assigned",    color: "bg-gray-500",   textColor: "text-gray-400" },
  accepted:    { label: "Accepted",    color: "bg-cyan-600",   textColor: "text-cyan-400" },
  en_route:    { label: "En Route",    color: "bg-yellow-500", textColor: "text-yellow-400" },
  on_site:     { label: "On Site",     color: "bg-purple-600", textColor: "text-purple-400" },
  in_progress: { label: "In Progress", color: "bg-amber-600",  textColor: "text-amber-400" },
};

const PRIORITY_BADGE = {
  emergency: "text-red-400 bg-red-500/15 border-red-500/30",
  high:      "text-amber-400 bg-amber-500/10 border-amber-500/30",
  normal:    "text-text-tertiary bg-surface-overlay border-surface-border",
  low:       "text-text-tertiary bg-surface-overlay border-surface-border",
};

/* ── Helpers ──────────────────────────────────────────────────────── */
function formatDuration(ms) {
  if (ms < 0) ms = Math.abs(ms);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d`;
}

function slaPercent(sla) {
  if (!sla?.resolution_minutes || !sla?.started_at) return 0;
  const elapsed = Date.now() - new Date(sla.started_at).getTime();
  return Math.min(150, (elapsed / (sla.resolution_minutes * 60000)) * 100);
}

/* ── SLA mini bar ─────────────────────────────────────────────────── */
function SLAMiniBar({ sla }) {
  const now = useLiveClock();
  if (!sla?.resolution_minutes || !sla?.started_at) return null;

  const started = new Date(sla.started_at).getTime();
  const budget = sla.resolution_minutes * 60000;
  const elapsed = now - started;
  const remaining = started + budget - now;
  const pct = Math.min(100, (elapsed / budget) * 100);
  const isBreached = remaining < 0;
  const isCritical = !isBreached && pct > 90;
  const isWarning = !isBreached && pct > 75;

  const barColor = isBreached ? "bg-red-500" : isCritical ? "bg-red-500 animate-pulse" : isWarning ? "bg-amber-500" : "bg-emerald-500";
  const textColor = isBreached ? "text-red-400" : isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-2xs font-mono font-bold ${textColor}`}>
          {isBreached ? "BREACHED" : isCritical ? "CRITICAL" : isWarning ? "AT RISK" : "SLA OK"}
        </span>
        <span className={`text-2xs font-mono tabular-nums font-bold ${textColor}`}>
          {isBreached ? `+${formatDuration(Math.abs(remaining))}` : formatDuration(remaining)}
        </span>
      </div>
      <div className="w-full h-1 bg-surface-overlay rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

/* ── Mission Card (compact, operational) ──────────────────────────── */
function MissionCard({ intv, isSelected, onClick }) {
  const st = STATUS_CONFIG[intv.status] || STATUS_CONFIG.assigned;
  const prBadge = PRIORITY_BADGE[intv.priority] || PRIORITY_BADGE.normal;
  const lastEvent = intv.timeline?.[intv.timeline.length - 1];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg p-3 transition-all duration-fast ease-out-expo border group ${
        isSelected
          ? "bg-primary/10 border-primary/40 shadow-glow-primary/10"
          : "bg-surface-overlay/50 border-surface-border/50 hover:border-surface-border hover:bg-surface-overlay"
      }`}
    >
      {/* Row 1: ref + priority + status */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${st.color} flex-shrink-0`} />
          <span className="text-xs font-mono font-bold text-primary">{intv.reference}</span>
          <span className={`text-2xs font-mono font-semibold px-1.5 py-0.5 rounded border ${prBadge}`}>
            {intv.priority?.slice(0, 4).toUpperCase()}
          </span>
        </div>
        <span className={`text-2xs font-mono ${st.textColor}`}>{st.label}</span>
      </div>

      {/* Row 2: title */}
      {intv.title && <p className="text-xs text-text-primary font-medium truncate mb-1">{intv.title}</p>}

      {/* Row 3: site + tech */}
      <div className="flex items-center gap-2 text-2xs text-text-tertiary">
        <span className="truncate">{intv.site_name || "—"}</span>
        <span className="text-surface-border">|</span>
        <span className="truncate">{intv.technician_name || "Unassigned"}</span>
        {lastEvent && (
          <>
            <span className="text-surface-border">|</span>
            <span className="tabular-nums">{timeAgo(lastEvent.timestamp)}</span>
          </>
        )}
      </div>

      {/* SLA bar */}
      <SLAMiniBar sla={intv.sla} />
    </button>
  );
}

/* ── MAIN DASHBOARD ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [selectedIntv, setSelectedIntv] = useState(null);
  const { data: today } = useFetch("/dashboard/today");
  const { data: stats } = useFetch("/dashboard/stats");
  const { data: sla } = useFetch("/dashboard/sla");
  const { data: sitesRes } = useFetch("/sites");
  const { data: techsRes } = useFetch("/technicians");
  const { data: intvsRes } = useFetch("/interventions");

  const t = today?.data || {};
  const s = stats?.data || {};
  const sl = sla?.data || {};

  const activeInterventions = useMemo(() => {
    const all = intvsRes?.data || [];
    const active = all.filter((i) =>
      ["assigned", "accepted", "en_route", "on_site", "in_progress"].includes(i.status)
    );
    const po = { emergency: 0, high: 1, normal: 2, low: 3 };
    const so = { in_progress: 0, on_site: 1, en_route: 2, accepted: 3, assigned: 4 };
    return active.sort((a, b) => (po[a.priority] ?? 9) - (po[b.priority] ?? 9) || (so[a.status] ?? 9) - (so[b.status] ?? 9));
  }, [intvsRes]);

  const escalation = useMemo(() => {
    let breach = 0, crit = 0, risk = 0;
    activeInterventions.forEach((i) => {
      const p = slaPercent(i.sla);
      if (p >= 100) breach++;
      else if (p >= 90) crit++;
      else if (p >= 75) risk++;
    });
    return { breach, crit, risk };
  }, [activeInterventions]);

  const selectedDetail = useMemo(() => {
    if (!selectedIntv) return null;
    const id = selectedIntv.id || selectedIntv._id;
    return activeInterventions.find((i) => (i.id || i._id) === id) || selectedIntv;
  }, [selectedIntv, activeInterventions]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col gap-3 -m-6 p-4">
      {/* ── TOP BAR ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-text-primary font-display tracking-tight">CONTROL TOWER</h2>
          {/* Escalation pills */}
          {escalation.breach > 0 && (
            <span className="flex items-center gap-1 text-2xs font-mono font-bold text-red-400 bg-red-500/15 px-2 py-1 rounded-md border border-red-500/30 animate-pulse">
              <Zap size={10} /> {escalation.breach} BREACH
            </span>
          )}
          {escalation.crit > 0 && (
            <span className="flex items-center gap-1 text-2xs font-mono font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">
              <AlertTriangle size={10} /> {escalation.crit} CRIT
            </span>
          )}
          {escalation.risk > 0 && (
            <span className="flex items-center gap-1 text-2xs font-mono font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
              <Shield size={10} /> {escalation.risk} RISK
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <LiveClock />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-2xs font-mono text-text-tertiary">OPERATIONAL</span>
          </div>
        </div>
      </div>

      {/* ── STATS ROW ────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2 flex-shrink-0">
        <div className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2 flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-primary-muted"><Activity size={14} className="text-primary-light" /></div>
          <div><p className="text-lg font-bold font-mono text-text-primary">{t.active ?? "—"}</p><p className="text-2xs text-text-tertiary uppercase tracking-wider">Active</p></div>
        </div>
        <div className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2 flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-success-muted"><CheckCircle size={14} className="text-success" /></div>
          <div><p className="text-lg font-bold font-mono text-text-primary">{t.completed_today ?? "—"}</p><p className="text-2xs text-text-tertiary uppercase tracking-wider">Today</p></div>
        </div>
        <div className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2 flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-info-muted"><MapPin size={14} className="text-info" /></div>
          <div><p className="text-lg font-bold font-mono text-text-primary">{s.total_sites ?? "—"}</p><p className="text-2xs text-text-tertiary uppercase tracking-wider">Sites</p></div>
        </div>
        <div className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2 flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-primary-muted"><Users size={14} className="text-primary-light" /></div>
          <div><p className="text-lg font-bold font-mono text-text-primary">{s.total_technicians ?? "—"}</p><p className="text-2xs text-text-tertiary uppercase tracking-wider">Techs</p></div>
        </div>
        <div className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2 flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-success-muted"><CheckCircle size={14} className="text-success" /></div>
          <div><p className="text-lg font-bold font-mono text-text-primary">{s.fix_rate ? `${s.fix_rate}%` : "—"}</p><p className="text-2xs text-text-tertiary uppercase tracking-wider">Fix Rate</p></div>
        </div>
      </div>

      {/* ── MAIN AREA: Map + Sidebar ─────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-3 min-h-0">
        {/* Map — 3/4 */}
        <div className="xl:col-span-3 bg-surface-raised border border-surface-border rounded-lg overflow-hidden relative">
          {/* Map legend overlay */}
          <div className="absolute top-3 left-3 z-[500] flex flex-col gap-1.5">
            <div className="bg-surface-base/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-surface-border/50">
              <p className="text-2xs font-mono text-text-tertiary uppercase tracking-wider mb-1.5">Legend</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-2xs text-text-secondary">
                  <span className="w-2 h-2 rounded-full bg-amber-600" /> Sites
                </div>
                <div className="flex items-center gap-2 text-2xs text-text-secondary">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> Tech (available)
                </div>
                <div className="flex items-center gap-2 text-2xs text-text-secondary">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Tech (on mission)
                </div>
                <div className="flex items-center gap-2 text-2xs text-text-secondary">
                  <span className="w-3 h-0.5 bg-amber-500 rounded" /> Active link
                </div>
              </div>
            </div>
          </div>
          <ControlTowerMap
            sites={sitesRes?.data || []}
            technicians={techsRes?.data || []}
            interventions={intvsRes?.data || []}
            onSelectIntervention={setSelectedIntv}
          />
        </div>

        {/* Sidebar — 1/4 */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* Detail panel if selected */}
          {selectedDetail && (
            <div className="bg-surface-raised border border-primary/30 rounded-lg p-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-primary">{selectedDetail.reference}</span>
                <button onClick={() => setSelectedIntv(null)} className="text-text-tertiary hover:text-text-primary text-xs">&times;</button>
              </div>
              {selectedDetail.title && <p className="text-sm font-semibold text-text-primary mb-2">{selectedDetail.title}</p>}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-text-tertiary">Status</span><span className={STATUS_CONFIG[selectedDetail.status]?.textColor}>{STATUS_CONFIG[selectedDetail.status]?.label}</span></div>
                <div className="flex justify-between"><span className="text-text-tertiary">Priority</span><span className="text-text-primary uppercase">{selectedDetail.priority}</span></div>
                <div className="flex justify-between"><span className="text-text-tertiary">Site</span><span className="text-text-primary">{selectedDetail.site_name}</span></div>
                <div className="flex justify-between"><span className="text-text-tertiary">Tech</span><span className="text-text-primary">{selectedDetail.technician_name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-text-tertiary">Type</span><span className="text-text-primary capitalize">{selectedDetail.type}</span></div>
              </div>
              <SLAMiniBar sla={selectedDetail.sla} />
              {selectedDetail.timeline?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-surface-border/50 space-y-1">
                  <p className="text-2xs font-mono text-text-tertiary uppercase tracking-wider">Timeline</p>
                  {selectedDetail.timeline.slice(-3).map((ev, i) => (
                    <div key={i} className="text-2xs text-text-tertiary flex gap-2">
                      <span className="font-mono tabular-nums flex-shrink-0">{new Date(ev.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                      <span className="text-text-secondary truncate">{ev.note || ev.event}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => navigate(`/interventions/${selectedDetail.id || selectedDetail._id}`)}
                className="w-full mt-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-md hover:bg-primary/10 transition-all"
              >
                Full detail
              </button>
            </div>
          )}

          {/* Live missions list */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-2xs font-mono text-text-tertiary uppercase tracking-wider">Live Missions</span>
              </div>
              <span className="text-2xs font-mono text-text-tertiary">{activeInterventions.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin">
              {activeInterventions.length === 0 && (
                <div className="text-center text-text-tertiary text-xs py-8">No active missions</div>
              )}
              {activeInterventions.map((intv) => (
                <MissionCard
                  key={intv.id || intv._id || intv.reference}
                  intv={intv}
                  isSelected={(selectedDetail?.id || selectedDetail?._id) === (intv.id || intv._id)}
                  onClick={() => setSelectedIntv(intv)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
