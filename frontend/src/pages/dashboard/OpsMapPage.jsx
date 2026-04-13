import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Layers, ChevronRight, Clock, User, MapPin, Zap, AlertTriangle, Shield, X } from "lucide-react";
import { useOpsData } from "../../hooks/useOpsData";
import ControlTowerMap from "../../components/maps/ControlTowerMap";

/* ── Status config ────────────────────────────────────────────────── */
const ST = {
  assigned:    { label: "Assigned",    color: "text-gray-400",   bg: "bg-gray-500/20" },
  accepted:    { label: "Accepted",    color: "text-cyan-400",   bg: "bg-cyan-500/20" },
  en_route:    { label: "En Route",    color: "text-yellow-400", bg: "bg-yellow-500/20" },
  on_site:     { label: "On Site",     color: "text-purple-400", bg: "bg-purple-500/20" },
  in_progress: { label: "In Progress", color: "text-amber-400",  bg: "bg-amber-500/20" },
  completed:   { label: "Completed",   color: "text-emerald-400", bg: "bg-emerald-500/20" },
};

const PRI = {
  emergency: { label: "EMERGENCY", color: "text-red-400", dot: "bg-red-500" },
  high:      { label: "HIGH",      color: "text-orange-400", dot: "bg-orange-500" },
  normal:    { label: "NORMAL",    color: "text-blue-400", dot: "bg-blue-500" },
  low:       { label: "LOW",       color: "text-gray-400", dot: "bg-gray-500" },
};

/* ── SLA helper ───────────────────────────────────────────────────── */
function slaPercent(sla) {
  if (!sla?.resolution_minutes || !sla?.started_at) return 0;
  return ((Date.now() - new Date(sla.started_at).getTime()) / (sla.resolution_minutes * 60000)) * 100;
}

function fmtElapsed(startedAt) {
  if (!startedAt) return "--";
  const ms = Date.now() - new Date(startedAt).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

/* ══════════════════════════════════════════════════════════════════════
   FULL-SCREEN OPS MAP — "Espacio OPS"
   SkyPro-style: map fills viewport, click a marker to see detail panel
   ══════════════════════════════════════════════════════════════════════ */
export default function OpsMapPage() {
  const navigate = useNavigate();
  const { sites, technicians, interventions, activeInterventions, loading, lastRefresh, refresh } = useOpsData();
  const [selected, setSelected] = useState(null);
  const [showList, setShowList] = useState(true);

  const handleSelect = useCallback((intv) => {
    setSelected(intv);
  }, []);

  const utc = new Date().toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="h-[calc(100vh-0px)] flex flex-col bg-surface-base -m-6">
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-raised border-b border-surface-border z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-xs transition-colors">
            <ArrowLeft size={14} />
            <span>Cockpit</span>
          </Link>
          <div className="w-px h-4 bg-surface-border" />
          <h1 className="label-caps text-primary-light flex items-center gap-2">
            <Layers size={13} />
            ESPACIO OPS
          </h1>
          <span className="text-2xs font-mono text-text-tertiary">{activeInterventions.length} live</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xs font-mono text-text-tertiary">UTC {utc}</span>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 text-2xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────────────── */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Mission list panel (left) */}
        {showList && (
          <div className="w-72 flex-shrink-0 bg-surface-raised border-r border-surface-border overflow-y-auto z-10 scrollbar-thin">
            <div className="p-3 border-b border-surface-border">
              <h3 className="label-caps text-text-tertiary">Active Missions</h3>
            </div>
            <div className="divide-y divide-surface-border">
              {activeInterventions.map((intv) => {
                const st = ST[intv.status] || ST.assigned;
                const pri = PRI[intv.priority] || PRI.normal;
                const pct = slaPercent(intv.sla);
                const isSelected = selected && (selected.id === intv.id || selected._id === intv._id);

                return (
                  <button
                    key={intv.id || intv._id}
                    onClick={() => setSelected(intv)}
                    className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-surface-overlay ${
                      isSelected ? "bg-primary-muted/30 border-l-2 border-primary-light" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-text-primary">{intv.reference}</span>
                      <span className={`text-2xs font-bold uppercase ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-2xs text-text-tertiary truncate">{intv.site_name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`text-2xs font-bold ${pri.color}`}>{pri.label}</span>
                      {pct > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1 bg-surface-overlay rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-2xs font-mono text-text-tertiary">{Math.round(pct)}%</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
              {activeInterventions.length === 0 && (
                <div className="p-4 text-text-tertiary text-xs text-center">No active missions</div>
              )}
            </div>
          </div>
        )}

        {/* Toggle list button */}
        <button
          onClick={() => setShowList((p) => !p)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-surface-raised border border-surface-border rounded-r-lg px-1 py-3 text-text-secondary hover:text-text-primary transition-colors"
          style={{ left: showList ? "288px" : "0px" }}
        >
          <ChevronRight size={14} className={`transition-transform ${showList ? "rotate-180" : ""}`} />
        </button>

        {/* Map (fills remaining space) */}
        <div className="flex-1 relative">
          <ControlTowerMap
            sites={sites}
            technicians={technicians}
            interventions={interventions}
            onSelectIntervention={handleSelect}
          />
        </div>

        {/* Detail panel (right) — appears when mission selected */}
        {selected && (
          <DetailPanel
            intv={selected}
            onClose={() => setSelected(null)}
            onNavigate={(id) => navigate(`/interventions/${id}`)}
          />
        )}
      </div>
    </div>
  );
}

/* ── Detail side panel ────────────────────────────────────────────── */
function DetailPanel({ intv, onClose, onNavigate }) {
  const st = ST[intv.status] || ST.assigned;
  const pri = PRI[intv.priority] || PRI.normal;
  const pct = slaPercent(intv.sla);
  const elapsed = fmtElapsed(intv.sla?.started_at);
  const budget = intv.sla?.resolution_minutes
    ? `${Math.floor(intv.sla.resolution_minutes / 60)}h ${intv.sla.resolution_minutes % 60}m`
    : "--";

  return (
    <div className="w-80 flex-shrink-0 bg-surface-raised border-l border-surface-border overflow-y-auto z-10 scrollbar-thin animate-slide-in">
      {/* Header */}
      <div className="p-4 border-b border-surface-border">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-sm font-bold text-primary-light">{intv.reference}</span>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xs font-bold uppercase px-2 py-0.5 rounded ${st.bg} ${st.color}`}>{st.label}</span>
          <span className={`text-2xs font-bold ${pri.color}`}>{pri.label}</span>
        </div>
        {intv.title && <p className="text-xs text-text-primary mt-2 font-medium">{intv.title}</p>}
      </div>

      {/* SLA Bar */}
      {pct > 0 && (
        <div className="px-4 py-3 border-b border-surface-border">
          <div className="flex items-center justify-between text-2xs mb-1.5">
            <span className="text-text-tertiary">SLA Progress</span>
            <span className={`font-mono font-bold ${pct >= 100 ? "text-red-400" : pct >= 75 ? "text-amber-400" : "text-emerald-400"}`}>
              {Math.round(pct)}%
            </span>
          </div>
          <div className="w-full h-2 bg-surface-overlay rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct >= 100 ? "bg-red-500 animate-pulse" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-2xs mt-1.5 text-text-tertiary">
            <span>Elapsed: <span className="font-mono text-text-secondary">{elapsed}</span></span>
            <span>Budget: <span className="font-mono text-text-secondary">{budget}</span></span>
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="px-4 py-3 border-b border-surface-border space-y-2.5">
        <InfoRow icon={<MapPin size={12} />} label="Site" value={intv.site_name || "--"} />
        <InfoRow icon={<User size={12} />} label="Technician" value={intv.technician_name || "Unassigned"} />
        <InfoRow icon={<Clock size={12} />} label="Created" value={intv.created_at ? new Date(intv.created_at).toLocaleDateString() : "--"} />
        {intv.type && <InfoRow icon={<Layers size={12} />} label="Type" value={intv.type} />}
      </div>

      {/* Description */}
      {intv.description && (
        <div className="px-4 py-3 border-b border-surface-border">
          <p className="label-caps mb-1.5">Description</p>
          <p className="text-xs text-text-secondary leading-relaxed">{intv.description}</p>
        </div>
      )}

      {/* Timeline */}
      {intv.timeline?.length > 0 && (
        <div className="px-4 py-3 border-b border-surface-border">
          <p className="label-caps mb-2">Timeline</p>
          <div className="space-y-2">
            {intv.timeline.slice(-5).reverse().map((ev, i) => (
              <div key={i} className="flex items-start gap-2 text-2xs">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-light mt-1 flex-shrink-0" />
                <div>
                  <span className="text-text-primary font-medium">{ev.event || ev.status}</span>
                  {ev.note && <p className="text-text-tertiary mt-0.5">{ev.note}</p>}
                  {ev.timestamp && (
                    <span className="text-text-tertiary font-mono">
                      {new Date(ev.timestamp).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      <div className="p-4">
        <button
          onClick={() => onNavigate(intv.id || intv._id)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-muted text-primary-light rounded-lg text-xs font-medium hover:bg-primary-light/20 transition-colors active:scale-[0.97]"
        >
          Full Detail
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ── Info row ─────────────────────────────────────────────────────── */
function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-text-tertiary flex-shrink-0">{icon}</span>
      <span className="text-text-tertiary w-20 flex-shrink-0">{label}</span>
      <span className="text-text-primary truncate">{value}</span>
    </div>
  );
}
