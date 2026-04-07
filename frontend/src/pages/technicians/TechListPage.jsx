import { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { Search, User, Star } from "lucide-react";

export default function TechListPage() {
  const [country, setCountry] = useState("");
  const [skills, setSkills] = useState("");
  const { data, loading } = useFetch(
    `/technicians?page=1&per_page=50${country ? `&country=${encodeURIComponent(country)}` : ""}${skills ? `&skills=${encodeURIComponent(skills)}` : ""}`,
    [country, skills],
  );

  const techs = data?.data || [];
  const total = data?.total || 0;

  const availColors = { available: "bg-success-muted text-success", busy: "bg-warning-muted text-warning", offline: "bg-surface-overlay text-text-secondary" };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-text-primary font-display">Technicians ({total})</h2>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Filter by country..."
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full bg-surface-base border border-surface-border rounded-lg pl-9 pr-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
          />
        </div>
        <input
          type="text"
          placeholder="Skills (e.g. networking,hardware)"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          className="bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary w-64 transition-all duration-fast ease-out-expo"
        />
      </div>

      {loading && <p className="text-text-tertiary text-sm">Loading...</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {techs.map((tech, i) => (
          <div
            key={tech.id}
            className="bg-surface-raised border border-surface-border rounded-lg p-3 hover:border-primary/40 hover:shadow-glow-primary accent-bar stagger-item transition-all duration-fast ease-out-expo flex flex-col gap-2"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start gap-2">
              <div className="bg-surface-overlay rounded-full p-2 flex-shrink-0">
                <User size={16} className="text-text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-text-primary font-medium text-sm leading-tight truncate">{tech.name}</h3>
                <p className="text-[11px] text-text-tertiary truncate">{tech.city}, {tech.country}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wide flex-shrink-0 ${availColors[tech.availability] || availColors.offline}`}>
                {tech.availability}
              </span>
            </div>
            {tech.skills?.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {tech.skills.slice(0, 4).map((s) => (
                  <span key={s} className="bg-primary-muted text-primary-light text-[10px] px-1.5 py-0.5 rounded">{s}</span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-surface-border-subtle mt-auto">
              <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wide">{tech.stats?.total_jobs || 0} jobs</p>
              {tech.rating?.average > 0 && (
                <div className="flex items-center gap-1">
                  <Star size={11} className="text-warning" />
                  <span className="text-xs text-warning font-mono">{tech.rating.average.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {!loading && techs.length === 0 && <p className="text-text-tertiary text-sm text-center py-8">No technicians found</p>}
    </div>
  );
}
