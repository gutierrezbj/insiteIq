/**
 * SRS Sites · list page (Iter 2.22 · paleta F NAVEGANTE).
 *
 * Migración v1 amber legacy → v2 paleta F usando v2-shared (Pills,
 * typography). Filters inline (search + country select) + tabla.
 *
 * Endpoint: GET /api/sites → [{ id, code, name, country, city, address,
 *   lat, lng, site_type, status, has_physical_resident, ... }]
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import CreateSiteAction from "../../../components/admin/CreateSiteAction";
import { SiteStatusPill } from "../../../components/v2-shared/Pills";
import { JAKARTA, MONO_CAPS } from "../../../components/v2-shared/typography";

export default function SitesListPage() {
  const { data: sites, loading, reload } = useFetch("/sites");
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
            {list.length} <span style={{ color: "#3D4A66", fontWeight: 600 }}>sites registrados</span>
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
        <div>
          <label
            htmlFor="q"
            style={{
              ...MONO_CAPS,
              display: "block",
              fontSize: 9.5,
              color: "#3D4A66",
              letterSpacing: "0.14em",
              marginBottom: 4,
            }}
          >
            Buscar
          </label>
          <input
            id="q"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="nombre, code, ciudad, address…"
            style={{
              width: 280,
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
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = "1.5px solid #0A1628";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10, 22, 40, 0.10)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = "1px solid #C8CDD8";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
        <div>
          <label
            htmlFor="c"
            style={{
              ...MONO_CAPS,
              display: "block",
              fontSize: 9.5,
              color: "#3D4A66",
              letterSpacing: "0.14em",
              marginBottom: 4,
            }}
          >
            País
          </label>
          <select
            id="c"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={{
              height: 32,
              border: "1px solid #C8CDD8",
              borderRadius: 6,
              padding: "0 10px",
              fontFamily: JAKARTA,
              fontSize: 13,
              fontWeight: 500,
              color: "#0A1628",
              background: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">todos</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div
          style={{
            marginLeft: "auto",
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
            gridTemplateColumns: "4fr 2fr 3fr 2fr 1fr",
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
          <div>Country</div>
          <div>City</div>
          <div>Residente</div>
          <div style={{ textAlign: "right" }}>Status</div>
        </div>

        {/* Rows */}
        {loading && <EmptyRow text="cargando…" />}
        {!loading && filtered.length === 0 && <EmptyRow text="— nada match —" />}
        {filtered.map((s) => (
          <Link
            key={s.id}
            to={`/srs/sites/${s.id}`}
            style={{
              display: "grid",
              gridTemplateColumns: "4fr 2fr 3fr 2fr 1fr",
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
            <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em" }}>
              {s.country || "—"}
            </div>
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
            <div style={{ ...MONO_CAPS, fontSize: 9.5, letterSpacing: "0.14em" }}>
              {s.has_physical_resident ? (
                <span style={{ color: "#1E3A8A" }}>· residente</span>
              ) : (
                <span style={{ color: "#8B95A8" }}>NOC remoto</span>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <SiteStatusPill status={s.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
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
