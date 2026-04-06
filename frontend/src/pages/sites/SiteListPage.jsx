import { useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { Plus, Search, MapPin } from "lucide-react";

export default function SiteListPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading } = useFetch(
    `/sites?page=${page}&per_page=20${search ? `&search=${encodeURIComponent(search)}` : ""}`,
    [page, search],
  );

  const sites = data?.data || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary font-display">Sites ({total})</h2>
        <Link
          to="/sites/new"
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark hover:shadow-glow-primary text-text-inverse px-3 py-1.5 rounded-lg text-sm transition-all duration-fast ease-out-expo"
        >
          <Plus size={16} /> Add Site
        </Link>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search sites..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full bg-surface-base border border-surface-border rounded-lg pl-9 pr-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
        />
      </div>

      <div className="space-y-2">
        {loading && <p className="text-text-tertiary text-sm">Loading...</p>}
        {sites.map((site, i) => (
          <Link
            key={site.id}
            to={`/sites/${site.id}`}
            className="block bg-surface-raised border border-surface-border rounded-lg p-4 hover:border-primary/30 accent-bar stagger-item transition-all duration-fast ease-out-expo"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-text-primary font-medium">{site.name}</h3>
                <p className="text-sm text-text-secondary mt-0.5">{site.client}</p>
                <p className="text-xs text-text-tertiary mt-1 flex items-center gap-1">
                  <MapPin size={12} />
                  {site.address || `${site.city}, ${site.country}`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-text-tertiary font-mono">{site.intervention_count} interventions</span>
                {site.tags?.length > 0 && (
                  <div className="flex gap-1 mt-1 justify-end">
                    {site.tags.slice(0, 3).map((t) => (
                      <span key={t} className="bg-surface-overlay text-text-secondary text-xs px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
        {!loading && sites.length === 0 && (
          <p className="text-text-tertiary text-sm text-center py-8">No sites found</p>
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-surface-overlay text-text-secondary rounded text-sm disabled:opacity-30 transition-all duration-fast ease-out-expo">Prev</button>
          <span className="text-text-secondary text-sm py-1">Page {page}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={sites.length < 20} className="px-3 py-1 bg-surface-overlay text-text-secondary rounded text-sm disabled:opacity-30 transition-all duration-fast ease-out-expo">Next</button>
        </div>
      )}
    </div>
  );
}
