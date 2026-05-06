/**
 * SRS Sites · list page (Iter 2.51 · multi-filter).
 *
 * Filters: cliente (organization), tipo de sitio, país, status, búsqueda libre.
 * Tabla: Site | Cliente | Country | City | Tipo | Residente | Status.
 *
 * Endpoints:
 *   GET /api/sites          → [{ id, code, name, country, city, address,
 *                                 lat, lng, site_type, status,
 *                                 has_physical_resident, organization_id, ... }]
 *   GET /api/organizations  → [{ id, display_name, legal_name, ... }]
 *
 * Filter persistence: localStorage `sites-filters-v1` (TTL implicit · cross-session).
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import CreateSiteAction from "../../../components/admin/CreateSiteAction";
import { SiteStatusPill } from "../../../components/v2-shared/Pills";
import { JAKARTA, MONO_CAPS } from "../../../components/v2-shared/typography";

const SITE_TYPES = [
  { value: "retail", label: "Retail" },
  { value: "dc", label: "DC" },
  { value: "office", label: "Office" },
  { value: "warehouse", label: "Warehouse" },
  { value: "branch", label: "Branch" },
  { value: "other", label: "Other" },
];

const FILTERS_KEY = "sites-filters-v1";

function loadFilters() {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveFilters(f) {
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(f));
  } catch {
    // ignore
  }
}

export default function SitesListPage() {
  const { data: sites, loading, reload } = useFetch("/sites");
  const { data: orgs } = useFetch("/organizations");

  const persisted = loadFilters() || {};
  const [query, setQuery] = useState(persisted.query || "");
  const [country, setCountry] = useState(persisted.country || "");
  const [orgId, setOrgId] = useState(persisted.orgId || "");
  const [siteType, setSiteType] = useState(persisted.siteType || "");
  const [onlyActive, setOnlyActive] = useState(
    persisted.onlyActive !== undefined ? persisted.onlyActive : true
  );

  // Persist filters across sessions
  useEffect(() => {
    saveFilters({ query, country, orgId, siteType, onlyActive });
  }, [query, country, orgId, siteType, onlyActive]);

  const list = sites || [];
  const orgsList = orgs || [];

  // Map org_id → display label
  const orgsById = useMemo(() => {
    const m = new Map();
    for (const o of orgsList) {
      m.set(o.id, o.display_name || o.legal_name || "—");
    }
    return m;
  }, [orgsList]);

  // Compute unique countries + orgs that actually have sites
  const countries = useMemo(() => {
    const set = new Set();
    for (const s of list) if (s.country) set.add(s.country);
    return [...set].sort();
  }, [list]);

  const orgsWithSites = useMemo(() => {
    const set = new Set();
    for (const s of list) if (s.organization_id) set.add(s.organization_id);
    return [...set]
      .map((id) => ({ id, label: orgsById.get(id) || id.slice(-6) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [list, orgsById]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((s) => {
      if (orgId && s.organization_id !== orgId) return false;
      if (country && s.country !== country) return false;
      if (siteType && (s.site_type || "retail") !== siteType) return false;
      if (onlyActive && s.status === "decommissioned") return false;
      if (q) {
        const hay = [s.name, s.code, s.city, s.address]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [list, orgId, country, siteType, onlyActive, query]);

  const anyFilterActive = orgId || country || siteType || query.trim() || !onlyActive;

  function clearAll() {
    setQuery("");
    setCountry("");
    setOrgId("");
    setSiteType("");
    setOnlyActive(true);
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      {/* Header */}
      <div
        style={{
          paddingLeft: 16,
          borderLeft: "3px solid #0A1628",
          marginBottom: 22,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ ...MONO_CAPS, fontSize: 11, color: "#8B95A8", marginBottom: 6 }}>
            Sites
          </div>
          <h1
            style={{
              fontFamily: JAKARTA,
              fontSize: 28,
              fontWeight: 800,
              color: "#0A1628",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {list.length}{" "}
            <span style={{ color: "#3D4A66", fontWeight: 600 }}>sites registrados</span>
          </h1>
          <p
            style={{
              fontFamily: JAKARTA,
              fontSize: 13,
              color: "#3D4A66",
              marginTop: 6,
              fontWeight: 500,
            }}
          >
            Fase 2 plumbing · Site Bible completo aterriza en Fase 5 (Domain 10)
          </p>
        </div>
        <CreateSiteAction onCreated={() => reload()} />
      </div>

      {/* Filters */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E5EC",
          borderLeft: "3px solid #0A1628",
          borderRadius: 6,
          padding: 14,
          marginBottom: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "flex-end",
        }}
      >
        {/* Búsqueda libre */}
        <div>
          <label htmlFor="q" style={filterLabelStyle}>Buscar</label>
          <input
            id="q"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="nombre, code, ciudad, address…"
            style={{ ...filterInputStyle, width: 240 }}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        {/* Cliente */}
        <div>
          <label htmlFor="org" style={filterLabelStyle}>Cliente</label>
          <select
            id="org"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={{ ...filterSelectStyle, width: 200 }}
          >
            <option value="">todos</option>
            {orgsWithSites.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* País */}
        <div>
          <label htmlFor="c" style={filterLabelStyle}>País</label>
          <select
            id="c"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={{ ...filterSelectStyle, width: 110 }}
          >
            <option value="">todos</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo (pills) */}
        <div>
          <label style={filterLabelStyle}>Tipo</label>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {SITE_TYPES.map((t) => {
              const active = siteType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setSiteType(active ? "" : t.value)}
                  style={{
                    height: 32,
                    padding: "0 10px",
                    border: active ? "1.5px solid #0A1628" : "1px solid #C8CDD8",
                    borderRadius: 6,
                    background: active ? "#0A1628" : "#FFFFFF",
                    color: active ? "#FFFFFF" : "#3D4A66",
                    fontFamily: JAKARTA,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 120ms",
                    letterSpacing: "0.02em",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggle solo activos */}
        <div>
          <label style={filterLabelStyle}>Status</label>
          <button
            type="button"
            onClick={() => setOnlyActive(!onlyActive)}
            style={{
              height: 32,
              padding: "0 12px",
              border: onlyActive ? "1.5px solid #16a34a" : "1px solid #C8CDD8",
              borderRadius: 6,
              background: onlyActive ? "#16a34a10" : "#FFFFFF",
              color: onlyActive ? "#15803d" : "#3D4A66",
              fontFamily: JAKARTA,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 120ms",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: onlyActive ? "#16a34a" : "#C8CDD8",
              }}
            />
            {onlyActive ? "Solo activos" : "Todos los status"}
          </button>
        </div>

        {/* Counter + clear */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {anyFilterActive && (
            <button
              type="button"
              onClick={clearAll}
              style={{
                ...MONO_CAPS,
                fontSize: 10,
                color: "#8B95A8",
                background: "transparent",
                border: "1px solid #C8CDD8",
                borderRadius: 6,
                padding: "6px 10px",
                cursor: "pointer",
                letterSpacing: "0.14em",
              }}
            >
              limpiar
            </button>
          )}
          <div
            style={{
              ...MONO_CAPS,
              fontSize: 11,
              color: "#0A1628",
              letterSpacing: "0.14em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ fontWeight: 800 }}>{filtered.length}</span>{" "}
            <span style={{ color: "#8B95A8" }}>/ {list.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E5EC",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(10, 22, 40, 0.05)",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 2fr 1fr 2fr 1fr 1.4fr 1fr",
            gap: 12,
            padding: "12px 18px",
            background: "#F4F6F8",
            borderBottom: "1px solid #E2E5EC",
            ...MONO_CAPS,
            fontSize: 10,
            color: "#3D4A66",
            letterSpacing: "0.14em",
          }}
        >
          <div>Site</div>
          <div>Cliente</div>
          <div>Country</div>
          <div>City</div>
          <div>Tipo</div>
          <div>Residente</div>
          <div style={{ textAlign: "right" }}>Status</div>
        </div>

        {/* Rows */}
        {loading && <EmptyRow text="cargando…" />}
        {!loading && filtered.length === 0 && <EmptyRow text="— nada match —" />}
        {filtered.map((s) => {
          const orgLabel = orgsById.get(s.organization_id) || "—";
          const stype = s.site_type || "retail";
          return (
            <Link
              key={s.id}
              to={`/srs/sites/${s.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "3fr 2fr 1fr 2fr 1fr 1.4fr 1fr",
                gap: 12,
                padding: "14px 18px",
                borderBottom: "1px solid #E2E5EC",
                alignItems: "center",
                textDecoration: "none",
                transition: "background 160ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FA")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {/* Site */}
              <div style={{ minWidth: 0 }}>
                {s.code && (
                  <div
                    style={{
                      ...MONO_CAPS,
                      fontSize: 9.5,
                      color: "#8B95A8",
                      letterSpacing: "0.12em",
                      marginBottom: 2,
                    }}
                  >
                    {s.code}
                  </div>
                )}
                <div
                  style={{
                    fontFamily: JAKARTA,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0A1628",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.name}
                </div>
              </div>

              {/* Cliente */}
              <div
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 12.5,
                  color: "#0A1628",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {orgLabel}
              </div>

              {/* Country */}
              <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em" }}>
                {s.country || "—"}
              </div>

              {/* City */}
              <div
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 13,
                  color: "#3D4A66",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {s.city || "—"}
              </div>

              {/* Tipo */}
              <div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: typeBackground(stype),
                    color: typeColor(stype),
                    fontFamily: JAKARTA,
                    fontSize: 10.5,
                    fontWeight: 600,
                    textTransform: "capitalize",
                    letterSpacing: "0.02em",
                  }}
                >
                  {stype}
                </span>
              </div>

              {/* Residente */}
              <div style={{ ...MONO_CAPS, fontSize: 9.5, letterSpacing: "0.14em" }}>
                {s.has_physical_resident ? (
                  <span style={{ color: "#1E3A8A" }}>· residente</span>
                ) : (
                  <span style={{ color: "#8B95A8" }}>NOC remoto</span>
                )}
              </div>

              {/* Status */}
              <div style={{ textAlign: "right" }}>
                <SiteStatusPill status={s.status} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ---- helpers ----

const filterLabelStyle = {
  ...MONO_CAPS,
  display: "block",
  fontSize: 9.5,
  color: "#3D4A66",
  letterSpacing: "0.14em",
  marginBottom: 4,
};

const filterInputStyle = {
  height: 32,
  border: "1px solid #C8CDD8",
  borderRadius: 6,
  padding: "0 10px",
  fontFamily: JAKARTA,
  fontSize: 13,
  fontWeight: 500,
  color: "#0A1628",
  outline: "none",
  transition: "all 160ms",
};

const filterSelectStyle = {
  ...filterInputStyle,
  background: "#FFFFFF",
  cursor: "pointer",
};

function onFocus(e) {
  e.currentTarget.style.border = "1.5px solid #0A1628";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10, 22, 40, 0.10)";
}
function onBlur(e) {
  e.currentTarget.style.border = "1px solid #C8CDD8";
  e.currentTarget.style.boxShadow = "none";
}

const TYPE_PALETTE = {
  retail:    { bg: "#F0F4F8", fg: "#0A1628" },
  dc:        { bg: "#FEF3C7", fg: "#92400E" },
  office:    { bg: "#DBEAFE", fg: "#1E40AF" },
  warehouse: { bg: "#FAE8FF", fg: "#86198F" },
  branch:    { bg: "#D1FAE5", fg: "#065F46" },
  other:     { bg: "#F4F6F8", fg: "#3D4A66" },
};
function typeBackground(t) {
  return (TYPE_PALETTE[t] || TYPE_PALETTE.other).bg;
}
function typeColor(t) {
  return (TYPE_PALETTE[t] || TYPE_PALETTE.other).fg;
}

function EmptyRow({ text }) {
  return (
    <div
      style={{
        padding: "24px 18px",
        ...MONO_CAPS,
        fontSize: 11,
        color: "#8B95A8",
        letterSpacing: "0.14em",
      }}
    >
      {text}
    </div>
  );
}
