/**
 * SRS Sites — listado (Fase 2 plumbing).
 * Read-only vista over /api/sites. Site Bible completo llega en Fase 5.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";

export default function SitesListPage() {
  const { data: sites, loading } = useFetch("/sites");
  const [country, setCountry] = useState("");
  const [query, setQuery] = useState("");

  const list = sites || [];

  const countries = useMemo(() => {
    const set = new Set();
    for (const s of list) if (s.country) set.add(s.country);
    return [...set].sort();
  }, [list]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((s) => {
      if (country && s.country !== country) return false;
      if (q) {
        const hay = [s.name, s.code, s.city, s.address]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [list, country, query]);

  return (
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide">
      <div className="accent-bar pl-4 mb-6">
        <div className="label-caps">Sites</div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          {list.length} sites registrados
        </h1>
        <p className="font-body text-text-secondary text-sm mt-1">
          Fase 2 plumbing · Site Bible completo aterriza en Fase 5 (Domain 10 Knowledge)
        </p>
      </div>

      {/* Filters */}
      <div className="bg-surface-raised accent-bar rounded-sm p-3 mb-4 flex flex-wrap gap-3">
        <div>
          <label htmlFor="q" className="label-caps block mb-1">
            Buscar
          </label>
          <input
            id="q"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="nombre, code, ciudad, address…"
            className="bg-surface-overlay border border-surface-border rounded-sm px-3 py-1.5 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast w-64"
          />
        </div>
        <div>
          <label htmlFor="c" className="label-caps block mb-1">
            País
          </label>
          <select
            id="c"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="bg-surface-overlay border border-surface-border rounded-sm px-3 py-1.5 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast"
          >
            <option value="">todos</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto self-end font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          {filtered.length} / {list.length}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-raised accent-bar rounded-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-surface-border text-text-tertiary">
          <div className="col-span-4 label-caps">Site</div>
          <div className="col-span-2 label-caps">Country</div>
          <div className="col-span-3 label-caps">City</div>
          <div className="col-span-2 label-caps">Residente</div>
          <div className="col-span-1 label-caps text-right">Status</div>
        </div>

        <div className="divide-y divide-surface-border">
          {loading && <EmptyRow text="cargando…" />}
          {!loading && filtered.length === 0 && (
            <EmptyRow text="— nada match —" />
          )}
          {filtered.map((s) => (
            <Link
              key={s.id}
              to={`/srs/sites/${s.id}`}
              className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-surface-overlay/60 transition-colors duration-fast"
            >
              <div className="col-span-4 min-w-0">
                {s.code && (
                  <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                    {s.code}
                  </div>
                )}
                <div className="font-body text-sm text-text-primary truncate">
                  {s.name}
                </div>
              </div>
              <div className="col-span-2 font-mono text-2xs uppercase tracking-widest-srs text-text-secondary">
                {s.country || "—"}
              </div>
              <div className="col-span-3 font-body text-sm text-text-secondary truncate">
                {s.city || "—"}
              </div>
              <div className="col-span-2 font-mono text-2xs uppercase tracking-widest-srs">
                {s.has_physical_resident ? (
                  <span className="text-info">· residente</span>
                ) : (
                  <span className="text-text-tertiary">NOC remoto</span>
                )}
              </div>
              <div className="col-span-1 text-right">
                <StatusPill status={s.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const isActive = status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-widest-srs ${
        isActive ? "text-success" : "text-text-tertiary"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? "bg-success" : "bg-text-tertiary"
        }`}
      />
      {status || "—"}
    </span>
  );
}

function EmptyRow({ text }) {
  return (
    <div className="px-4 py-6 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}
