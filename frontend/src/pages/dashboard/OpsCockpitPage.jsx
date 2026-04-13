import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useOpsData } from "../../hooks/useOpsData";
import { Activity, CheckCircle, AlertTriangle, MapPin, Users, Wrench, Navigation, Clock, ChevronRight, Zap, Shield, ArrowRight, Maximize2, Map as MapIcon } from "lucide-react";
import ControlTowerMap from "../../components/maps/ControlTowerMap";
import OpsSidebar from "../../components/ops/OpsSidebar";

/* ── Live tick ────────────────────────────────────────────────────── */
function useTick() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return now;
}

/* ── Status / Priority ────────────────────────────────────────────── */
const ST = {
  assigned:    { label: "ASSIGNED",    text: "text-gray-400",   bg: "bg-gray-500/10",   border: "border-gray-500/30" },
  accepted:    { label: "ACCEPTED",    text: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30" },
  en_route:    { label: "EN ROUTE",    text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  on_site:     { label: "ON SITE",     text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  in_progress: { label: "IN PROGRESS", text: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30" },
};
const PR_BORDER = { emergency: "border-t-red-500", high: "border-t-amber-500", normal: "border-t-primary/40", low: "border-t-stone-600" };

/* ── SLA helpers ──────────────────────────────────────────────────── */
function slaInfo(sla) {
  if (!sla?.resolution_minutes || !sla?.started_at) return null;
  const started = new Date(sla.started_at).getTime();
  const budget = sla.resolution_minutes * 60000;
  const el = Date.now() - started;
  const pct = Math.min(150, (el / budget) * 100);
  const rem = started + budget - Date.now();
  return { pct, remaining: rem, isBreached: rem < 0, isCritical: pct >= 90 && rem >= 0, isWarning: pct >= 75 && pct < 90 };
}

function fmtRemaining(ms) {
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000), m = Math.floor((abs % 3600000) / 60000), s = Math.floor((abs % 60000) / 1000);
  return h > 0 ? `${ms < 0 ? "+" : ""}${h}h ${String(m).padStart(2, "0")}m` : `${ms < 0 ? "+" : ""}${m}m ${String(s).padStart(2, "0")}s`;
}

/* ── SLA Bar (compact) ────────────────────────────────────────────── */
function SLABar({ sla }) {
  useTick();
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

/* ── Mission Card ─────────────────────────────────────────────────── */
function MissionCard({ intv, isSelected, onClick }) {
  const st = ST[intv.status] || ST.assigned;
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-[260px] h-full text-left rounded-lg border-t-[3px] ${PR_BORDER[intv.priority] || PR_BORDER.normal} border border-surface-border p-3 transition-all duration-fast hover:border-primary/30 flex flex-col ${isSelected ? "bg-primary/10 border-primary/40 ring-1 ring-primary/30" : "bg-surface-raised"}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono font-bold text-primary">{intv.reference}</span>
        <span className={`text-2xs font-mono font-bold px-1.5 py-0.5 rounded ${st.bg} ${st.border} border ${st.text}`}>{st.label}</span>
      </div>
      <p className="text-xs text-text-primary font-medium truncate mb-1.5">{intv.title || intv.description?.slice(0, 50) || "—"}</p>
      <div className="flex items-center gap-1.5 text-2xs text-text-tertiary"><Wrench size={9} /><span className="truncate">{intv.technician_name || "Unassigned"}</span></div>
      <div className="flex items-center gap-1.5 text-2xs text-text-tertiary mt-0.5"><MapPin size={9} /><span className="truncate">{intv.site_name || "—"}</span></div>
      <SLABar sla={intv.sla} />
    </button>
  );
}

/* ── Detail Panel (for selected mission) ──────────────────────────── */
function SelectedDetail({ intv, onClose, onNavigate }) {
  useTick();
  const st = ST[intv.status] || ST.assigned;
  const info = slaInfo(intv.sla);
  return (
    <div className="bg-surface-raised border border-primary/30 rounded-lg p-3 mb-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-mono font-bold text-primary">{intv.reference}</span>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary text-lg leading-none">&times;</button>
      </div>
      {intv.title && <p className="text-xs font-semibold text-text-primary mb-2">{intv.title}</p>}
      <span className={`inline-block text-2xs font-mono font-bold px-2 py-0.5 rounded ${st.bg} ${st.border} border ${st.text} mb-2`}>{st.label}</span>
      {intv.description && <p className="text-2xs text-text-secondary mb-3 leading-relaxed line-clamp-3">{intv.description}</p>}
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs mb-3">
        <span className="text-text-tertiary font-mono text-2xs">SITE</span><span className="text-text-primary">{intv.site_name}</span>
        <span className="text-text-tertiary font-mono text-2xs">TECH</span><span className="text-text-primary">{intv.technician_name || "—"}</span>
        <span className="text-text-tertiary font-mono text-2xs">TYPE</span><span className="text-text-primary capitalize">{intv.type}</span>
        <span className="text-text-tertiary font-mono text-2xs">PRIO</span><span className={`uppercase font-bold ${intv.priority === "emergency" ? "text-red-400" : intv.priority === "high" ? "text-amber-400" : "text-text-primary"}`}>{intv.priority}</span>
      </div>
      {info && (
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className={`text-2xs font-mono font-bold ${info.isBreached ? "text-red-400" : info.isCritical ? "text-red-400" : info.isWarning ? "text-amber-400" : "text-emerald-400"}`}>
              {info.isBreached ? "SLA BREACHED" : info.isCritical ? "CRITICAL" : info.isWarning ? "AT RISK" : "ON TRACK"}
            </span>
            <span className={`text-2xs font-mono tabular-nums font-bold ${info.isBreached ? "text-red-400" : "text-text-primary"}`}>{fmtRemaining(info.remaining)}</span>
          </div>
          <div className="w-full h-1.5 bg-surface-overlay rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${info.isBreached ? "bg-red-500" : info.isCritical ? "bg-red-500" : info.isWarning ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, info.pct)}%` }} />
          </div>
        </div>
      )}
      {intv.timeline?.length > 0 && (
        <div className="mb-3">
          <p className="text-2xs font-mono text-text-tertiary uppercase tracking-wider mb-1">Timeline</p>
          {intv.timeline.slice().reverse().slice(0, 4).map((ev, i) => (
            <div key={i} className="flex gap-2 text-2xs py-0.5">
              <span className="font-mono tabular-nums text-text-tertiary w-10 flex-shrink-0">{new Date(ev.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
              <span className={`w-14 flex-shrink-0 uppercase font-mono font-bold ${ST[ev.event]?.text || "text-text-tertiary"}`}>{ev.event}</span>
              <span className="text-text-secondary truncate">{ev.note || ""}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={onNavigate} className="w-full py-1.5 text-xs font-semibold text-primary border border-primary/40 rounded-md hover:bg-primary/10 transition-all flex items-center justify-center gap-1.5">
        Full Detail <ArrowRight size={11} />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN: Operations Cockpit
   ══════════════════════════════════════════════════════════════════════ */
export default function OpsCockpitPage() {
  const navigate = useNavigate();
  const now = useTick();
  const [selectedIntv, setSelectedIntv] = useState(null);

  const ops = useOpsData();
  const { today, stats, sla, workforce, compliance, activeInterventions, completedInterventions, escalation, sites, technicians, interventions } = ops;

  const d = new Date(now);
  const clock = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;

  const selectedDetail = useMemo(() => {
    if (!selectedIntv) return null;
    const id = selectedIntv.id || selectedIntv._id;
    return interventions.find((i) => (i.id || i._id) === id) || selectedIntv;
  }, [selectedIntv, interventions]);

  // Stats row data
  const byStatus = today?.by_status || {};
  const enCampo = (byStatus.on_site || 0) + (byStatus.in_progress || 0);
  const enRuta = byStatus.en_route || 0;
  const planificadas = (byStatus.assigned || 0) + (byStatus.accepted || 0);
  const techsActivos = workforce?.counts?.busy || 0;
  const techsDisponibles = workforce?.counts?.available || 0;

  return (
    <div className="space-y-3 -m-6 p-4">
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-text-primary font-display tracking-tight uppercase">Cockpit de Operaciones</h2>
          {escalation.breach > 0 && <span className="flex items-center gap-1 text-2xs font-mono font-bold text-red-400 bg-red-500/15 px-2 py-1 rounded-md border border-red-500/30 animate-pulse"><Zap size={10} /> {escalation.breach} BREACH</span>}
          {escalation.crit > 0 && <span className="flex items-center gap-1 text-2xs font-mono font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20"><AlertTriangle size={10} /> {escalation.crit} CRIT</span>}
          {escalation.risk > 0 && <span className="flex items-center gap-1 text-2xs font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20"><Shield size={10} /> {escalation.risk} RISK</span>}
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-text-secondary tabular-nums">{clock} <span className="text-text-tertiary">UTC</span></span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /><span className="text-2xs font-mono text-green-500">{activeInterventions.length} live</span></span>
          <Link to="/ops-map" className="flex items-center gap-1.5 text-2xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg border border-primary/30 transition-all">
            <MapIcon size={12} /> Espacio OPS
          </Link>
        </div>
      </div>

      {/* ── STATS ROW ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-2 flex-shrink-0">
        {[
          { label: "EN CAMPO", value: enCampo, icon: Wrench, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "EN RUTA", value: enRuta, icon: Navigation, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "PLANIFICADAS", value: planificadas, icon: Clock, color: "text-gray-400", bg: "bg-gray-500/10" },
          { label: "TECHS ACTIVOS", value: techsActivos, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", sub: `de ${workforce?.counts?.total || "—"}` },
          { label: "DISPONIBLES", value: techsDisponibles, icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "FIX RATE", value: stats?.fix_rate ? `${stats.fix_rate}%` : "—", icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10" },
        ].map((c) => (
          <div key={c.label} className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2 flex items-center gap-2.5">
            <div className={`p-1.5 rounded-md ${c.bg}`}><c.icon size={14} className={c.color} /></div>
            <div>
              <p className="text-xl font-bold font-mono text-text-primary leading-none">{c.value ?? "—"}</p>
              <p className="text-2xs text-text-tertiary font-mono tracking-wider mt-0.5">{c.label}</p>
              {c.sub && <p className="text-2xs text-text-tertiary">{c.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT: Left (missions + map) | Right (sidebar) ──── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
        {/* LEFT — 3/4 */}
        <div className="xl:col-span-3 space-y-3">
          {/* Active Missions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="label-caps">Active Missions</span>
                <span className="text-2xs font-mono text-text-tertiary">{activeInterventions.length}</span>
              </div>
              <Link to="/interventions" className="text-2xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={10} /></Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin" style={{ minHeight: 160 }}>
              {activeInterventions.map((intv) => (
                <MissionCard
                  key={intv.id || intv._id || intv.reference}
                  intv={intv}
                  isSelected={(selectedDetail?.id || selectedDetail?._id) === (intv.id || intv._id)}
                  onClick={() => setSelectedIntv(intv)}
                />
              ))}
              {activeInterventions.length === 0 && <div className="text-text-tertiary text-sm py-8 w-full text-center">No active missions</div>}
            </div>
          </div>

          {/* Map */}
          <div className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden relative" style={{ height: "calc(100vh - 480px)", minHeight: 300 }}>
            <Link to="/ops-map" className="absolute top-3 right-3 z-[500] bg-surface-base/90 backdrop-blur-sm rounded-lg p-2 border border-surface-border/50 hover:border-primary/40 transition-all" title="Expand to Ops Map">
              <Maximize2 size={14} className="text-text-secondary" />
            </Link>
            <div className="absolute top-3 left-3 z-[500] bg-surface-base/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-surface-border/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-2xs text-text-secondary"><span className="w-2 h-2 rounded-full bg-amber-600" /> Sites</div>
                <div className="flex items-center gap-1.5 text-2xs text-text-secondary"><span className="w-2 h-2 rounded-full bg-green-500" /> Available</div>
                <div className="flex items-center gap-1.5 text-2xs text-text-secondary"><span className="w-2 h-2 rounded-full bg-blue-500" /> On mission</div>
              </div>
            </div>
            <ControlTowerMap
              sites={sites}
              technicians={technicians}
              interventions={interventions}
              onSelectIntervention={setSelectedIntv}
            />
          </div>

          {/* Recent Completed */}
          {completedInterventions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="label-caps">Recent Completed</span>
                <Link to="/interventions" className="text-2xs text-primary hover:underline flex items-center gap-1">History <ArrowRight size={10} /></Link>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                {completedInterventions.slice(0, 4).map((intv) => (
                  <Link key={intv.id || intv._id} to={`/interventions/${intv.id || intv._id}`} className="bg-surface-raised border border-surface-border rounded-lg p-2.5 border-t-[3px] border-t-emerald-500/40 hover:border-primary/30 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xs font-mono font-bold text-primary">{intv.reference}</span>
                      <span className="text-2xs font-mono font-bold text-emerald-400">DONE</span>
                    </div>
                    <p className="text-2xs text-text-primary truncate">{intv.title || intv.site_name}</p>
                    <p className="text-2xs text-text-tertiary mt-0.5">{intv.technician_name}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR — 1/4 (always visible) */}
        <div className="xl:col-span-1">
          <OpsSidebar
            activeInterventions={activeInterventions}
            workforce={workforce}
            compliance={compliance}
            today={today}
            stats={stats}
          >
            {selectedDetail && (
              <SelectedDetail
                intv={selectedDetail}
                onClose={() => setSelectedIntv(null)}
                onNavigate={() => navigate(`/interventions/${selectedDetail.id || selectedDetail._id}`)}
              />
            )}
          </OpsSidebar>
        </div>
      </div>
    </div>
  );
}
