import { useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { Plus, Filter } from "lucide-react";

const statusColors = {
  created: "bg-surface-overlay text-text-secondary",
  assigned: "bg-info-muted text-info",
  accepted: "bg-info-muted text-info",
  en_route: "bg-warning-muted text-warning",
  on_site: "bg-info-muted text-info",
  in_progress: "bg-primary-muted text-primary-light",
  completed: "bg-success-muted text-success",
  cancelled: "bg-surface-overlay text-text-tertiary",
  failed: "bg-danger-muted text-danger",
};

export default function InterventionListPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading } = useFetch(
    `/interventions?page=${page}&per_page=20${statusFilter ? `&status=${statusFilter}` : ""}`,
    [page, statusFilter],
  );

  const items = data?.data || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary font-display">Interventions ({total})</h2>
        <Link
          to="/interventions/new"
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark hover:shadow-glow-primary text-text-inverse px-3 py-1.5 rounded-lg text-sm transition-all duration-fast ease-out-expo"
        >
          <Plus size={16} /> New Intervention
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Filter size={14} className="text-text-tertiary" />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-surface-base border border-surface-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
        >
          <option value="">All statuses</option>
          {Object.keys(statusColors).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {loading && <p className="text-text-tertiary text-sm">Loading...</p>}
        {items.map((iv, i) => (
          <Link
            key={iv.id}
            to={`/interventions/${iv.id}`}
            className="block bg-surface-raised border border-surface-border rounded-lg p-4 hover:border-primary/30 accent-bar stagger-item transition-all duration-fast ease-out-expo"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-text-primary font-mono text-sm font-medium">{iv.reference}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColors[iv.status] || statusColors.created}`}>{iv.status}</span>
                  <span className="text-xs text-text-tertiary">{iv.type}</span>
                </div>
                <p className="text-sm text-text-secondary mt-1">{iv.description?.slice(0, 120) || "No description"}</p>
                <p className="text-xs text-text-tertiary mt-1">{iv.site_name || iv.client || ""}{iv.technician_name ? ` — ${iv.technician_name}` : ""}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs px-1.5 py-0.5 rounded ${iv.priority === "emergency" ? "bg-danger-muted text-danger" : iv.priority === "high" ? "bg-warning-muted text-warning" : "bg-surface-overlay text-text-secondary"}`}>
                  {iv.priority}
                </span>
                {iv.sla?.breached && <p className="text-xs text-danger mt-1 font-mono">SLA BREACHED</p>}
              </div>
            </div>
          </Link>
        ))}
        {!loading && items.length === 0 && <p className="text-text-tertiary text-sm text-center py-8">No interventions found</p>}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-surface-overlay text-text-secondary rounded text-sm disabled:opacity-30 transition-all duration-fast ease-out-expo">Prev</button>
          <span className="text-text-secondary text-sm py-1">Page {page}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={items.length < 20} className="px-3 py-1 bg-surface-overlay text-text-secondary rounded text-sm disabled:opacity-30 transition-all duration-fast ease-out-expo">Next</button>
        </div>
      )}
    </div>
  );
}
