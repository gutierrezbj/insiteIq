import { useFetch } from "../../hooks/useFetch";
import { Activity, CheckCircle, AlertTriangle, MapPin, Users, ClipboardList } from "lucide-react";

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
  const { data: today } = useFetch("/dashboard/today");
  const { data: stats } = useFetch("/dashboard/stats");
  const { data: sla } = useFetch("/dashboard/sla");

  const t = today?.data || {};
  const s = stats?.data || {};
  const sl = sla?.data || {};

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-text-primary font-display">Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Now" value={t.active} icon={Activity} color="primary" index={0} />
        <StatCard label="Completed Today" value={t.completed_today} icon={CheckCircle} color="success" index={1} />
        <StatCard label="Total Sites" value={s.total_sites} icon={MapPin} color="info" index={2} />
        <StatCard label="Technicians" value={s.total_technicians} icon={Users} color="primary" index={3} />
      </div>

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
