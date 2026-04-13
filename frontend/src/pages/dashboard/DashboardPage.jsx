import { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { Activity, CheckCircle, AlertTriangle, MapPin, Users, ClipboardList, Map, BarChart3 } from "lucide-react";
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

export default function DashboardPage() {
  const [view, setView] = useState("map"); // "map" | "stats"
  const { data: today } = useFetch("/dashboard/today");
  const { data: stats } = useFetch("/dashboard/stats");
  const { data: sla } = useFetch("/dashboard/sla");
  const { data: sitesRes } = useFetch("/sites");
  const { data: techsRes } = useFetch("/technicians");
  const { data: intvsRes } = useFetch("/interventions");

  const t = today?.data || {};
  const s = stats?.data || {};
  const sl = sla?.data || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary font-display">Control Tower</h2>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Now" value={t.active} icon={Activity} color="primary" index={0} />
        <StatCard label="Completed Today" value={t.completed_today} icon={CheckCircle} color="success" index={1} />
        <StatCard label="Total Sites" value={s.total_sites} icon={MapPin} color="info" index={2} />
        <StatCard label="Technicians" value={s.total_technicians} icon={Users} color="primary" index={3} />
      </div>

      {view === "map" && (
        <div className="bg-surface-raised border border-surface-border rounded-lg p-3 accent-bar">
          <div className="flex items-center justify-between mb-3">
            <h3 className="label-caps">Global Operations</h3>
            <div className="flex items-center gap-4 text-2xs text-text-tertiary">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" /> Sites</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" /> Techs (free)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Techs (active)</span>
            </div>
          </div>
          <ControlTowerMap
            sites={sitesRes?.data || []}
            technicians={techsRes?.data || []}
            interventions={intvsRes?.data || []}
          />
        </div>
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
