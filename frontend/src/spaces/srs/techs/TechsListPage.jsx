/**
 * SRS Equipo · list (Iter 2.53 · grid de TechCards · paleta F).
 *
 * Layout: grid auto-fit minmax(280px, 1fr) de <TechCard />.
 * Cada card muestra avatar + dot presence + nombre + cargo + ciudad·hora.
 * Las métricas detalladas de Skill Passport viven en TechDetailPage
 * (click navega ahí · solo si el user tiene membership tech_field).
 *
 * Dictado del owner (2026-05-06): "Cargo, ciudad, hora local".
 * Update 2026-05-06: incluye SRS coordinators (Andros · Adriana) además
 * de tech_field.
 *
 * Endpoints:
 *   GET /api/users (filter local por srs_coordinators OR tech_field active)
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import { getTechTimeInfo } from "../../../lib/tz";
import TechCard from "../../../components/v2-shared/TechCard";
import { JAKARTA, MONO_CAPS } from "../../../components/v2-shared/typography";

function hasTechFieldMembership(user) {
  return (user.memberships || []).some(
    (m) => m.space === "tech_field" && m.active
  );
}

export default function TechsListPage() {
  const { data: users, loading } = useFetch("/users");
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const techs = useMemo(() => {
    return (users || []).filter((u) =>
      u.is_active !== false &&
      (u.memberships || []).some(
        (m) => m.active && (m.space === "tech_field" || m.space === "srs_coordinators")
      )
    );
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...techs].sort((a, b) =>
      (a.full_name || "").localeCompare(b.full_name || "")
    );
    return techs
      .filter((t) => {
        const hay = [t.full_name, t.email].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [techs, query]);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ paddingLeft: 16, borderLeft: "3px solid #0A1628", marginBottom: 22 }}>
        <div style={{ ...MONO_CAPS, fontSize: 11, color: "#8B95A8", marginBottom: 6 }}>
          Equipo SRS
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
          {techs.length}{" "}
          <span style={{ color: "#3D4A66", fontWeight: 600 }}>miembros operando</span>
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
          Cargo · ciudad · hora local en vivo · click en técnicos para ver Skill Passport
        </p>
      </div>

      {/* Filter bar */}
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
          <label htmlFor="q" style={filterLabelStyle}>
            Buscar
          </label>
          <input
            id="q"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="nombre o email…"
            style={{ ...filterInputStyle, width: 260 }}
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
          <span style={{ color: "#8B95A8" }}>/ {techs.length}</span>
        </div>
      </div>

      {/* Grid de cards */}
      {loading && <SkeletonGrid />}
      {!loading && filtered.length === 0 && <EmptyMsg query={query} totalTechs={techs.length} />}
      {!loading && filtered.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {filtered.map((u) => {
            const info = getTechTimeInfo(u.full_name);
            const role = info?.role || null;
            const tzLabel = info?.tzLabel || null;
            const techTime = info?.techTime || null;
            const color = info?.color || null;
            const pulse = info?.status === "onduty";
            const tooltipParts = [
              u.full_name,
              role,
              tzLabel && techTime ? `${tzLabel} ${techTime}` : null,
              info?.label,
              info?.offsetText,
            ].filter(Boolean);

            // Click navega a TechDetailPage solo si tiene membership tech_field
            // (TechDetailPage requiere Skill Passport · SRS coords no lo tienen).
            const isTech = hasTechFieldMembership(u);

            return (
              <TechCard
                key={u.id}
                name={u.full_name || u.email}
                role={role}
                tzLabel={tzLabel}
                techTime={techTime}
                color={color}
                pulse={pulse}
                title={tooltipParts.join(" · ")}
                onClick={isTech ? () => navigate(`/srs/techs/${u.id}`) : undefined}
              />
            );
          })}
        </div>
      )}
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

function SkeletonGrid() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 14,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E5EC",
            borderLeft: "3px solid #E2E5EC",
            borderRadius: 8,
            padding: 16,
            height: 92,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#F0F2F5",
              animation: "pulse 1.4s ease-in-out infinite",
            }}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ height: 12, background: "#F0F2F5", borderRadius: 4, width: "60%" }} />
            <div style={{ height: 10, background: "#F4F6F8", borderRadius: 4, width: "40%" }} />
            <div style={{ height: 9, background: "#F7F8FA", borderRadius: 4, width: "30%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyMsg({ query, totalTechs }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        borderRadius: 8,
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          ...MONO_CAPS,
          fontSize: 11,
          color: "#8B95A8",
          letterSpacing: "0.14em",
          marginBottom: 6,
        }}
      >
        — sin matches —
      </div>
      <div style={{ fontFamily: JAKARTA, fontSize: 14, color: "#3D4A66", fontWeight: 500 }}>
        {query
          ? `Ningún técnico match con "${query}"`
          : `No hay técnicos activos · total ${totalTechs}`}
      </div>
    </div>
  );
}
