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

      {loading && <p className="text-text-tertiary text-sm">Loading...</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((iv, i) => (
          <Link
            key={iv.id}
            to={`/interventions/${iv.id}`}
            className="block bg-surface-raised border border-surface-border rounded-lg p-3 hover:border-primary/40 hover:shadow-glow-primary accent-bar stagger-item transition-all duration-fast ease-out-expo flex flex-col gap-2"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-primary font-mono text-xs font-medium truncate">{iv.reference}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wide flex-shrink-0 ${iv.priority === "emergency" ? "bg-danger-muted text-danger" : iv.priority === "high" ? "bg-warning-muted text-warning" : "bg-surface-overlay text-text-secondary"}`}>
                {iv.priority}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wide ${statusColors[iv.status] || statusColors.created}`}>{iv.status}</span>
              <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-wide">{iv.type}</span>
            </div>
            <p className="text-xs text-text-secondary leading-snug line-clamp-2">{iv.description || "No description"}</p>
            <div className="pt-1 border-t border-surface-border-subtle mt-auto">
              <p className="text-[11px] text-text-tertiary truncate">{iv.site_name || iv.client || "—"}</p>
              {iv.technician_name && <p className="text-[11px] text-text-tertiary truncate">→ {iv.technician_name}</p>}
              {iv.sla?.breached && <p className="text-[10px] text-danger mt-1 font-mono uppercase tracking-wide">SLA breached</p>}
            </div>
          </Link>
        ))}
      </div>
      {!loading && items.length === 0 && <p className="text-text-tertiary text-sm text-center py-8">No interventions found</p>}

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
