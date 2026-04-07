import { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { Search, BookOpen } from "lucide-react";

export default function KBPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const { data, loading } = useFetch(
    `/kb?${search ? `search=${encodeURIComponent(search)}&` : ""}${category ? `category=${category}` : ""}`,
    [search, category],
  );

  const entries = data?.data || [];

  const categoryColors = {
    network: "bg-info-muted text-info",
    networking: "bg-info-muted text-info",
    hardware: "bg-primary-muted text-primary-light",
    software: "bg-info-muted text-info",
    cabling: "bg-success-muted text-success",
    power: "bg-danger-muted text-danger",
    access: "bg-warning-muted text-warning",
    security: "bg-warning-muted text-warning",
    other: "bg-surface-overlay text-text-secondary",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
        <BookOpen size={20} /> Knowledge Base ({data?.total || 0})
      </h2>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search problems & solutions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-base border border-surface-border rounded-lg pl-9 pr-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-surface-base border border-surface-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
        >
          <option value="">All categories</option>
          <option value="networking">Networking</option>
          <option value="hardware">Hardware</option>
          <option value="software">Software</option>
          <option value="cabling">Cabling</option>
          <option value="power">Power</option>
          <option value="access">Access</option>
          <option value="security">Security</option>
          <option value="other">Other</option>
        </select>
      </div>

      {loading && <p className="text-text-tertiary text-sm">Loading...</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {entries.map((e, i) => (
          <div
            key={e.id}
            className="bg-surface-raised border border-surface-border rounded-lg p-3 accent-bar stagger-item flex flex-col gap-2 hover:border-primary/40 hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex flex-wrap items-center gap-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wide ${categoryColors[e.category] || categoryColors.other}`}>
                {e.category}
              </span>
              {e.tags?.slice(0, 3).map((t) => (
                <span key={t} className="text-[10px] bg-surface-overlay text-text-secondary px-1.5 py-0.5 rounded">{t}</span>
              ))}
            </div>
            <div>
              <p className="label-caps mb-0.5">Problem</p>
              <p className="text-xs text-danger leading-snug line-clamp-3">{e.problem}</p>
            </div>
            <div>
              <p className="label-caps mb-0.5">Solution</p>
              <p className="text-xs text-success leading-snug line-clamp-4">{e.solution}</p>
            </div>
          </div>
        ))}
      </div>
      {!loading && entries.length === 0 && (
        <p className="text-text-tertiary text-sm text-center py-8">No knowledge base entries yet</p>
      )}
    </div>
  );
}
