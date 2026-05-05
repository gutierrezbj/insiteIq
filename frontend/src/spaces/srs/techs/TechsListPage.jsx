/**
 * SRS Techs · list (Iter 2.25 · paleta F NAVEGANTE).
 *
 * Migración v1 amber legacy → v2 paleta F usando v2-shared.
 * Decision #4 Modo 1: Skill Passport visible (level + jobs + rating +
 * countries). Sort por rating_avg desc → jobs_completed desc.
 *
 * Endpoints:
 *   GET /api/users (filter local por memberships.space === "tech_field")
 *   GET /api/techs/{id}/passport (N+1 paralelo, OK para tenant scale)
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../lib/api";
import { useFetch } from "../../../lib/useFetch";
import { JAKARTA, MONO, MONO_CAPS } from "../../../components/v2-shared/typography";

const LEVEL_STYLES = {
  bronze:  { dot: "#A16207", label: "BRONZE" },
  silver:  { dot: "#94A3B8", label: "SILVER" },
  gold:    { dot: "#CA8A04", label: "GOLD" },
  unrated: { dot: "#C8CDD8", label: "UNRATED" },
};

function LevelPill({ level }) {
  const s = LEVEL_STYLES[level] || LEVEL_STYLES.unrated;
  return (
    <span style={{ ...MONO_CAPS, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 9.5, color: "#3D4A66" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  );
}

export default function TechsListPage() {
  const { data: users, loading } = useFetch("/users");
  const [passports, setPassports] = useState({});
  const [loadingPassports, setLoadingPassports] = useState(false);

  const techs = useMemo(() => {
    return (users || []).filter((u) =>
      (u.memberships || []).some((m) => m.space === "tech_field" && m.active)
    );
  }, [users]);

  useEffect(() => {
    if (!techs.length) return;
    let alive = true;
    setLoadingPassports(true);
    Promise.all(
      techs.map((t) =>
        api
          .get(`/techs/${t.id}/passport`)
          .then((p) => [t.id, p])
          .catch(() => [t.id, null])
      )
    ).then((entries) => {
      if (!alive) return;
      const map = {};
      for (const [k, v] of entries) if (v) map[k] = v;
      setPassports(map);
      setLoadingPassports(false);
    });
    return () => { alive = false; };
  }, [techs]);

  const rows = techs
    .map((t) => ({ user: t, passport: passports[t.id] }))
    .sort((a, b) => {
      const ar = a.passport?.rating_avg || 0;
      const br = b.passport?.rating_avg || 0;
      if (br !== ar) return br - ar;
      return (b.passport?.jobs_completed || 0) - (a.passport?.jobs_completed || 0);
    });

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ paddingLeft: 16, borderLeft: "3px solid #0A1628", marginBottom: 22 }}>
        <div style={{ ...MONO_CAPS, fontSize: 11, color: "#8B95A8", marginBottom: 6 }}>
          Techs · Skill Passports
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
          {techs.length} <span style={{ color: "#3D4A66", fontWeight: 600 }}>techs operando</span>
        </h1>
        <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", marginTop: 6, fontWeight: 500 }}>
          Decision #4 Modo 1 · jobs + rating + level + quality marks
        </p>
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 2fr 1fr 2fr 2fr 2fr",
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
          <div>Tech</div>
          <div>Level</div>
          <div style={{ textAlign: "right" }}>Jobs</div>
          <div style={{ textAlign: "right" }}>Rating</div>
          <div>Employment</div>
          <div style={{ textAlign: "right" }}>Countries</div>
        </div>

        {(loading || loadingPassports) && <Empty text="cargando…" />}
        {!loading && rows.length === 0 && <Empty text="— sin techs —" />}
        {rows.map(({ user: t, passport: p }) => (
          <Link
            key={t.id}
            to={`/srs/techs/${t.id}`}
            style={{
              display: "grid",
              gridTemplateColumns: "3fr 2fr 1fr 2fr 2fr 2fr",
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
                {t.full_name || "—"}
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  color: "#8B95A8",
                  fontWeight: 500,
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.email}
              </div>
            </div>
            <div>
              <LevelPill level={p?.level || "unrated"} />
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#0A1628",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                {p?.jobs_completed ?? "—"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              {p?.rating_count ? (
                <>
                  <div
                    style={{
                      fontFamily: JAKARTA,
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#0A1628",
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1,
                    }}
                  >
                    {p.rating_avg.toFixed(2)}
                  </div>
                  <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 3 }}>
                    · {p.rating_count} rating{p.rating_count === 1 ? "" : "s"}
                  </div>
                </>
              ) : (
                <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em" }}>
                  sin ratings
                </span>
              )}
            </div>
            <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em" }}>
              {p?.employment_type || t.employment_type || "—"}
            </div>
            <div
              style={{
                textAlign: "right",
                ...MONO_CAPS,
                fontSize: 9.5,
                color: "#3D4A66",
                letterSpacing: "0.14em",
              }}
            >
              {(p?.countries_covered || []).length > 0
                ? p.countries_covered.join(" · ")
                : "—"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={{ padding: "24px 18px", ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
      {text}
    </div>
  );
}
