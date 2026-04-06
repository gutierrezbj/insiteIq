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

      <div className="space-y-2">
        {loading && <p className="text-text-tertiary text-sm">Loading...</p>}
        {techs.map((tech, i) => (
          <div key={tech.id} className="bg-surface-raised border border-surface-border rounded-lg p-4 hover:border-primary/30 accent-bar stagger-item transition-all duration-fast ease-out-expo" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="bg-surface-overlay rounded-full p-2.5">
                  <User size={18} className="text-text-secondary" />
                </div>
                <div>
                  <h3 className="text-text-primary font-medium">{tech.name}</h3>
                  <p className="text-sm text-text-secondary">{tech.email}</p>
                  <p className="text-xs text-text-tertiary mt-1">{tech.city}, {tech.country}</p>
                  {tech.skills?.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {tech.skills.map((s) => (
                        <span key={s} className="bg-primary-muted text-primary-light text-xs px-1.5 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right space-y-1">
                <span className={`text-xs px-2 py-0.5 rounded ${availColors[tech.availability] || availColors.offline}`}>
                  {tech.availability}
                </span>
                {tech.rating?.average > 0 && (
                  <div className="flex items-center gap-1 justify-end">
                    <Star size={12} className="text-warning" />
                    <span className="text-sm text-warning font-mono">{tech.rating.average.toFixed(1)}</span>
                  </div>
                )}
                <p className="text-xs text-text-tertiary font-mono">{tech.stats?.total_jobs || 0} jobs</p>
              </div>
            </div>
          </div>
        ))}
        {!loading && techs.length === 0 && <p className="text-text-tertiary text-sm text-center py-8">No technicians found</p>}
      </div>
    </div>
  );
}
