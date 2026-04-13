import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { Activity, CheckCircle, AlertTriangle, MapPin, Users, Wrench, Navigation, Clock, ChevronRight, Zap, Shield, ArrowRight } from "lucide-react";
import ControlTowerMap from "../../components/maps/ControlTowerMap";

/* ── Live tick (1s) ───────────────────────────────────────────────── */
function useLiveClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return now;
}

/* ── Status / Priority config ─────────────────────────────────────── */
const ST = {
  assigned:    { label: "ASSIGNED",    color: "#6B7280", bg: "bg-gray-500/10",   border: "border-gray-500/30",   text: "text-gray-400" },
  accepted:    { label: "ACCEPTED",    color: "#06B6D4", bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   text: "text-cyan-400" },
  en_route:    { label: "EN ROUTE",    color: "#EAB308", bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400" },
  on_site:     { label: "ON SITE",     color: "#A855F7", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
  in_progress: { label: "IN PROGRESS", color: "#D97706", bg: "bg-amber-500/10",  border: "border-amber-500/30",  text: "text-amber-400" },
};

const PR_COLOR = { emergency: "border-t-red-500", high: "border-t-amber-500", normal: "border-t-primary/40", low: "border-t-stone-600" };

/* ── Helpers ──────────────────────────────────────────────────────── */
function elapsed(dateStr) {
  if (!dateStr) return "—";
  const ms = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function slaInfo(sla) {
  if (!sla?.resolution_minutes || !sla?.started_at) return null;
  const started = new Date(sla.started_at).getTime();
  const budget = sla.resolution_minutes * 60000;
  const el = Date.now() - started;
  const pct = Math.min(150, (el / budget) * 100);
  const rem = started + budget - Date.now();
  return { pct, remaining: rem, elapsed: el, budget, isBreached: rem < 0, isCritical: pct >= 90 && rem >= 0, isWarning: pct >= 75 && pct < 90 };
}

function fmtRemaining(ms) {
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000), m = Math.floor((abs % 3600000) / 60000), s = Math.floor((abs % 60000) / 1000);
  const prefix = ms < 0 ? "+" : "";
  return h > 0 ? `${prefix}${h}h ${String(m).padStart(2, "0")}m` : `${prefix}${m}m ${String(s).padStart(2, "0")}s`;
}

/* ── SLA Bar (compact) ────────────────────────────────────────────── */
function SLABar({ sla }) {
  useLiveClock(); // re-render every second
  const info = slaInfo(sla);
  if (!info) return null;
  const barColor = info.isBreached ? "bg-red-500" : info.isCritical ? "bg-red-500 animate-pulse" : info.isWarning ? "bg-amber-500" : "bg-emerald-500";
  const textColor = info.isBreached ? "text-red-400" : info.isCritical ? "text-red-400" : info.isWarning ? "text-amber-400" : "text-emerald-400";
  return (
    <div className="mt-auto pt-2">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-2xs font-mono font-bold ${textColor}`}>{info.isBreached ? "BREACH" : info.isCritical ? "CRITICAL" : info.isWarning ? "AT RISK" : "ON TRACK"}</span>
        <span className={`text-2xs font-mono tabular-nums font-bold ${textColor}`}>{fmtRemaining(info.remaining)}</span>
      </div>
      <div className="w-full h-1 bg-surface-overlay rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${Math.min(100, info.pct)}%` }} />
      </div>
    </div>
  );
}

/* ── Active Mission Card (SkyPro style — horizontal, colored top border) */
function MissionCard({ intv, isSelected, onClick }) {
  const st = ST[intv.status] || ST.assigned;
  const prBorder = PR_COLOR[intv.priority] || PR_COLOR.normal;
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-[260px] text-left rounded-lg border-t-[3px] ${prBorder} border border-surface-border p-3 transition-all duration-fast ease-out-expo hover:border-primary/30 ${isSelected ? "bg-primary/10 border-primary/40 shadow-glow-primary/10" : "bg-surface-raised"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono font-bold text-primary">{intv.reference}</span>
        <span className={`text-2xs font-mono font-bold px-1.5 py-0.5 rounded ${st.bg} ${st.border} border ${st.text}`}>{st.label}</span>
      </div>
      {/* Title */}
      <p className="text-xs text-text-primary font-medium truncate mb-1.5">{intv.title || intv.description?.slice(0, 50) || "—"}</p>
      {/* Meta */}
      <div className="flex items-center gap-1.5 text-2xs text-text-tertiary mb-0.5">
        <Wrench size={9} /><span className="truncate">{intv.technician_name || "Unassigned"}</span>
      </div>
      <div className="flex items-center gap-1.5 text-2xs text-text-tertiary">
        <MapPin size={9} /><span className="truncate">{intv.site_name || "—"}</span>
      </div>
      {/* SLA */}
      <SLABar sla={intv.sla} />
    </button>
  );
}

/* ── Detail Panel (right sidebar when mission selected) ───────────── */
function DetailPanel({ intv, onClose, onNavigate }) {
  const st = ST[intv.status] || ST.assigned;
  useLiveClock();
  const info = slaInfo(intv.sla);
  return (
    <div className="bg-surface-raised border border-surface-border rounded-lg p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-mono font-bold text-primary">{intv.reference}</span>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary text-lg leading-none">&times;</button>
      </div>
      {intv.title && <p className="text-sm font-semibold text-text-primary mb-3">{intv.title}</p>}

      <span className={`inline-block text-2xs font-mono font-bold px-2 py-1 rounded ${st.bg} ${st.border} border ${st.text} mb-3`}>{st.label}</span>

      {intv.description && <p className="text-xs text-text-secondary mb-4 leading-relaxed">{intv.description}</p>}

      {/* Grid info */}
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs mb-4">
        <span className="text-text-tertiary uppercase font-mono text-2xs">Site</span><span className="text-text-primary">{intv.site_name}</span>
        <span className="text-text-tertiary uppercase font-mono text-2xs">Tech</span><span className="text-text-primary">{intv.technician_name || "—"}</span>
        <span className="text-text-tertiary uppercase font-mono text-2xs">Type</span><span className="text-text-primary capitalize">{intv.type}</span>
        <span className="text-text-tertiary uppercase font-mono text-2xs">Priority</span><span className={`uppercase font-bold ${intv.priority === "emergency" ? "text-red-400" : intv.priority === "high" ? "text-amber-400" : "text-text-primary"}`}>{intv.priority}</span>
        {intv.sla?.started_at && (
          <><span className="text-text-tertiary uppercase font-mono text-2xs">Elapsed</span><span className="text-text-primary font-mono">{elapsed(intv.sla.started_at)}</span></>
        )}
        {intv.sla?.resolution_minutes && (
          <><span className="text-text-tertiary uppercase font-mono text-2xs">Budget</span><span className="text-text-primary font-mono">{Math.floor(intv.sla.resolution_minutes / 60)}h {intv.sla.resolution_minutes % 60}m</span></>
        )}
      </div>

      {/* SLA bar */}
      {info && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-mono font-bold ${info.isBreached ? "text-red-400" : info.isCritical ? "text-red-400" : info.isWarning ? "text-amber-400" : "text-emerald-400"}`}>
              {info.isBreached ? "SLA BREACHED" : info.isCritical ? "SLA CRITICAL" : info.isWarning ? "SLA AT RISK" : "SLA ON TRACK"}
            </span>
            <span className={`text-xs font-mono tabular-nums font-bold ${info.isBreached ? "text-red-400" : "text-text-primary"}`}>{fmtRemaining(info.remaining)}</span>
          </div>
          <div className="w-full h-2 bg-surface-overlay rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${info.isBreached ? "bg-red-500" : info.isCritical ? "bg-red-500" : info.isWarning ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, info.pct)}%` }} />
          </div>
        </div>
      )}

      {/* Timeline */}
      {intv.timeline?.length > 0 && (
        <div className="mb-4">
          <p className="label-caps mb-2">Timeline</p>
          <div className="space-y-1.5">
            {intv.timeline.slice().reverse().slice(0, 6).map((ev, i) => (
              <div key={i} className="flex gap-2 text-2xs">
                <span className="font-mono tabular-nums text-text-tertiary flex-shrink-0 w-10">{new Date(ev.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                <span className={`flex-shrink-0 uppercase font-mono font-bold w-16 ${ST[ev.event]?.text || "text-text-tertiary"}`}>{ev.event}</span>
                <span className="text-text-secondary truncate">{ev.note || ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onNavigate}
        className="w-full py-2 text-xs font-semibold text-primary border border-primary/40 rounded-lg hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
      >
        Full Detail <ArrowRight size={12} />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ══════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [selectedIntv, setSelectedIntv] = useState(null);
  const now = useLiveClock();

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
    const active = all.filter((i) => ["assigned", "accepted", "en_route", "on_site", "in_progress"].includes(i.status));
    const po = { emergency: 0, high: 1, normal: 2, low: 3 };
    const so = { in_progress: 0, on_site: 1, en_route: 2, accepted: 3, assigned: 4 };
    return active.sort((a, b) => (po[a.priority] ?? 9) - (po[b.priority] ?? 9) || (so[a.status] ?? 9) - (so[b.status] ?? 9));
  }, [intvsRes]);

  const recentCompleted = useMemo(() => {
    const all = intvsRes?.data || [];
    return all.filter((i) => i.status === "completed").slice(0, 4);
  }, [intvsRes]);

  const escalation = useMemo(() => {
    let breach = 0, crit = 0, risk = 0;
    activeInterventions.forEach((i) => {
      const info = slaInfo(i.sla);
      if (!info) return;
      if (info.isBreached) breach++;
      else if (info.isCritical) crit++;
      else if (info.isWarning) risk++;
    });
    return { breach, crit, risk };
  }, [activeInterventions, now]);

  const selectedDetail = useMemo(() => {
    if (!selectedIntv) return null;
    const id = selectedIntv.id || selectedIntv._id;
    return (intvsRes?.data || []).find((i) => (i.id || i._id) === id) || selectedIntv;
  }, [selectedIntv, intvsRes]);

  const d = new Date(now);
  const clockStr = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;

  return (
    <div className="space-y-4 -m-6 p-4">
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-text-primary font-display tracking-tight uppercase">Control Tower</h2>
          {escalation.breach > 0 && <span className="flex items-center gap-1 text-2xs font-mono font-bold text-red-400 bg-red-500/15 px-2 py-1 rounded-md border border-red-500/30 animate-pulse"><Zap size={10} /> {escalation.breach} BREACH</span>}
          {escalation.crit > 0 && <span className="flex items-center gap-1 text-2xs font-mono font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20"><AlertTriangle size={10} /> {escalation.crit} CRIT</span>}
          {escalation.risk > 0 && <span className="flex items-center gap-1 text-2xs font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20"><Shield size={10} /> {escalation.risk} RISK</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-text-secondary tabular-nums">{clockStr} <span className="text-text-tertiary">UTC</span></span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /><span className="text-2xs font-mono text-green-500">{activeInterventions.length} live</span></span>
        </div>
      </div>

      {/* ── STATS ROW ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "ACTIVE", value: t.active, icon: Activity, color: "text-primary-light", bg: "bg-primary-muted" },
          { label: "TODAY", value: t.completed_today, icon: CheckCircle, color: "text-success", bg: "bg-success-muted" },
          { label: "SITES", value: s.total_sites, icon: MapPin, color: "text-info", bg: "bg-info-muted" },
          { label: "TECHS", value: s.total_technicians, icon: Users, color: "text-primary-light", bg: "bg-primary-muted" },
          { label: "FIX RATE", value: s.fix_rate ? `${s.fix_rate}%` : "—", icon: CheckCircle, color: "text-success", bg: "bg-success-muted" },
        ].map((c) => (
          <div key={c.label} className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2.5 flex items-center gap-3">
            <div className={`p-1.5 rounded-md ${c.bg}`}><c.icon size={14} className={c.color} /></div>
            <div><p className="text-lg font-bold font-mono text-text-primary leading-none">{c.value ?? "—"}</p><p className="text-2xs text-text-tertiary font-mono tracking-wider mt-0.5">{c.label}</p></div>
          </div>
        ))}
      </div>

      {/* ── ACTIVE MISSIONS (horizontal scroll, SkyPro style) ──────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="label-caps">Active Missions</h3>
            <span className="text-2xs font-mono text-text-tertiary">{activeInterventions.length}</span>
          </div>
          <Link to="/interventions" className="text-2xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={10} /></Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {activeInterventions.map((intv) => (
            <MissionCard
              key={intv.id || intv._id || intv.reference}
              intv={intv}
              isSelected={(selectedDetail?.id || selectedDetail?._id) === (intv.id || intv._id)}
              onClick={() => setSelectedIntv(intv)}
            />
          ))}
          {activeInterventions.length === 0 && <div className="text-text-tertiary text-sm py-4">No active missions</div>}
        </div>
      </div>

      {/* ── MAP + DETAIL PANEL ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-3" style={{ height: "calc(100vh - 420px)", minHeight: 360 }}>
        {/* Map */}
        <div className={`${selectedDetail ? "xl:col-span-3" : "xl:col-span-4"} bg-surface-raised border border-surface-border rounded-lg overflow-hidden relative`}>
          {/* Legend */}
          <div className="absolute top-3 left-3 z-[500] bg-surface-base/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-surface-border/50">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-2xs text-text-secondary"><span className="w-2.5 h-2.5 rounded-full bg-amber-600" /> Sites</div>
              <div className="flex items-center gap-2 text-2xs text-text-secondary"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Tech available</div>
              <div className="flex items-center gap-2 text-2xs text-text-secondary"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Tech on mission</div>
            </div>
          </div>
          <ControlTowerMap
            sites={sitesRes?.data || []}
            technicians={techsRes?.data || []}
            interventions={intvsRes?.data || []}
            onSelectIntervention={setSelectedIntv}
          />
        </div>

        {/* Detail sidebar */}
        {selectedDetail && (
          <div className="xl:col-span-1">
            <DetailPanel
              intv={selectedDetail}
              onClose={() => setSelectedIntv(null)}
              onNavigate={() => navigate(`/interventions/${selectedDetail.id || selectedDetail._id}`)}
            />
          </div>
        )}
      </div>

      {/* ── RECENT COMPLETED ───────────────────────────────────────── */}
      {recentCompleted.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="label-caps">Recent Completed</h3>
            <Link to="/interventions" className="text-2xs text-primary hover:underline flex items-center gap-1">History <ArrowRight size={10} /></Link>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {recentCompleted.map((intv) => (
              <Link
                key={intv.id || intv._id}
                to={`/interventions/${intv.id || intv._id}`}
                className="bg-surface-raised border border-surface-border rounded-lg p-3 border-t-[3px] border-t-emerald-500/50 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-primary">{intv.reference}</span>
                  <span className="text-2xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">COMPLETED</span>
                </div>
                <p className="text-xs text-text-primary font-medium truncate">{intv.title || intv.site_name}</p>
                <p className="text-2xs text-text-tertiary mt-1">{intv.technician_name} / {intv.site_name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
