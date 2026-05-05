/**
 * SRS Tech detail · v2 paleta F (Iter 2.25).
 *
 * Migración v1 amber legacy → v2 usando v2-shared. Skill Passport con
 * skills/certs/quality marks/coverage/bio + WOs activas/recent. Edición
 * de skills/certs llega Fase 3 Admin (PATCH backend ya existe).
 *
 * Endpoints:
 *   GET /api/users (find user_id local)
 *   GET /api/techs/{id}/passport
 *   GET /api/work-orders?limit=200 (filter assigned_tech_user_id)
 */
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import { formatAge } from "../../../components/ui/Badges";
import {
  WoStatusPill,
  SeverityPill,
} from "../../../components/v2-shared/Pills";
import KpiTile from "../../../components/v2-shared/KpiTile";
import BackLinkV2 from "../../../components/v2-shared/BackLinkV2";
import SectionCard, { SectionTitle } from "../../../components/v2-shared/SectionCard";
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

export default function TechDetailPage() {
  const { user_id } = useParams();
  const { data: users } = useFetch("/users");
  const user = useMemo(
    () => (users || []).find((u) => u.id === user_id),
    [users, user_id]
  );

  const { data: passport, loading: ploading } = useFetch(
    `/techs/${user_id}/passport`,
    { deps: [user_id] }
  );

  const { data: wos } = useFetch("/work-orders?limit=200");
  const assignedWos = useMemo(
    () => (wos || []).filter((w) => w.assigned_tech_user_id === user_id),
    [wos, user_id]
  );
  const activeWos = assignedWos.filter(
    (w) => !["closed", "cancelled"].includes(w.status)
  );
  const recentClosed = assignedWos
    .filter((w) => ["closed", "cancelled"].includes(w.status))
    .slice(0, 5);

  if (ploading) return <Centered text="cargando…" />;
  if (!passport) return <Centered text="— passport no disponible —" />;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      <BackLinkV2 to="/srs/techs" label="Techs" />

      {/* Header */}
      <div style={{ paddingLeft: 16, borderLeft: "3px solid #0A1628", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#0A1628", letterSpacing: "0.16em" }}>
            Tech · Skill Passport
          </span>
          <LevelPill level={passport.level} />
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em" }}>
            · {passport.employment_type}
          </span>
        </div>
        <h1
          style={{
            fontFamily: JAKARTA,
            fontSize: 28,
            fontWeight: 800,
            color: "#0A1628",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          {user?.full_name || "—"}
        </h1>
        <p
          style={{
            fontFamily: MONO,
            fontSize: 13,
            color: "#3D4A66",
            marginTop: 6,
            fontWeight: 500,
          }}
        >
          {user?.email || "—"}
          {passport.last_active_at && (
            <span style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em", marginLeft: 10 }}>
              · activo {formatAge(passport.last_active_at)} ago
            </span>
          )}
        </p>
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <KpiTile label="Jobs done" value={passport.jobs_completed} tone="primary" />
        <KpiTile
          label="Rating avg"
          value={passport.rating_count ? passport.rating_avg.toFixed(2) : "—"}
          hint={`${passport.rating_count} rating${passport.rating_count === 1 ? "" : "s"}`}
          tone={passport.rating_count && passport.rating_avg >= 4 ? "success" : "default"}
        />
        <KpiTile label="Certs" value={passport.certifications?.length || 0} />
        <KpiTile label="Skills" value={passport.skills?.length || 0} />
      </div>

      {/* Body grid · Skills/Certs · Cobertura/Quality/Bio */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 16,
        }}
      >
        <SectionCard>
          <SectionTitle>Skills</SectionTitle>
          {(passport.skills || []).length === 0 ? (
            <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
              — sin skills registradas —
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {passport.skills.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    background: "#F4F6F8",
                    border: "1px solid #E2E5EC",
                    borderRadius: 4,
                    padding: "8px 12px",
                  }}
                >
                  <div style={{ fontFamily: JAKARTA, fontSize: 13, fontWeight: 600, color: "#0A1628" }}>
                    {s.name}
                  </div>
                  <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.12em" }}>
                    {s.tier}
                    {s.endorsed_count != null && ` · ${s.endorsed_count} endorsed`}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginTop: 18, marginBottom: 10 }}>
            Certifications
          </div>
          {(passport.certifications || []).length === 0 ? (
            <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
              — sin certs registradas —
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {passport.certifications.map((c, i) => (
                <div
                  key={i}
                  style={{
                    background: "#F4F6F8",
                    border: "1px solid #E2E5EC",
                    borderRadius: 4,
                    padding: "8px 12px",
                  }}
                >
                  <div style={{ fontFamily: JAKARTA, fontSize: 13, fontWeight: 600, color: "#0A1628" }}>
                    {c.name}
                  </div>
                  <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 2 }}>
                    {c.issuer || "—"}
                    {c.credential_id && ` · ${c.credential_id}`}
                    {c.verified_by_user_id && " · verified"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard>
          <SectionTitle>Cobertura</SectionTitle>
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 6 }}>
              Countries
            </div>
            {(passport.countries_covered || []).length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {passport.countries_covered.map((c) => (
                  <span
                    key={c}
                    style={{
                      ...MONO_CAPS,
                      background: "#E8EDF5",
                      padding: "3px 8px",
                      borderRadius: 3,
                      fontSize: 9.5,
                      color: "#0A1628",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>—</span>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 6 }}>
              Languages
            </div>
            {(passport.languages || []).length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {passport.languages.map((l) => (
                  <span
                    key={l}
                    style={{
                      ...MONO_CAPS,
                      background: "#E8EDF5",
                      padding: "3px 8px",
                      borderRadius: 3,
                      fontSize: 9.5,
                      color: "#0A1628",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {l}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>—</span>
            )}
          </div>

          <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginTop: 18, marginBottom: 8 }}>
            Quality marks
          </div>
          {(passport.quality_marks || []).length === 0 ? (
            <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
              — sin quality marks —
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {passport.quality_marks.map((q, i) => (
                <div
                  key={i}
                  style={{
                    background: "#F4F6F8",
                    border: "1px solid #E2E5EC",
                    borderRadius: 4,
                    padding: "8px 12px",
                  }}
                >
                  <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A1628", letterSpacing: "0.14em" }}>
                    {q.kind || "mark"}
                  </div>
                  {q.note && (
                    <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", marginTop: 4, fontWeight: 500 }}>
                      {q.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {passport.bio && (
            <>
              <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginTop: 18, marginBottom: 8 }}>
                Bio
              </div>
              <p
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 13,
                  color: "#0A1628",
                  whiteSpace: "pre-line",
                  lineHeight: 1.55,
                  fontWeight: 500,
                }}
              >
                {passport.bio}
              </p>
            </>
          )}
        </SectionCard>
      </div>

      {/* WOs activas */}
      <SectionCard padding={0} style={{ marginTop: 16 }}>
        <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
          <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em" }}>
            WOs activas · {activeWos.length}
          </div>
        </header>
        <div>
          {activeWos.length === 0 && (
            <div style={{ padding: "20px 18px", ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
              — sin activas —
            </div>
          )}
          {activeWos.map((w) => <WoLink key={w.id} wo={w} />)}
        </div>
      </SectionCard>

      {recentClosed.length > 0 && (
        <SectionCard padding={0} style={{ marginTop: 16 }}>
          <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
            <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em" }}>
              Histórico reciente (últimas 5)
            </div>
          </header>
          <div>
            {recentClosed.map((w) => <WoLink key={w.id} wo={w} compact />)}
          </div>
        </SectionCard>
      )}

      <p style={{ marginTop: 24, ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
        Iter 2.25 · edición de skills/certs/quality marks Fase 3 (Admin)
      </p>
    </div>
  );
}

function WoLink({ wo, compact }) {
  return (
    <Link
      to={`/srs/ops/${wo.id}`}
      style={{
        display: "block",
        padding: "12px 18px",
        borderBottom: "1px solid #F0F2F7",
        textDecoration: "none",
        transition: "background 160ms",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FA")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
              {wo.reference}
            </span>
            {!compact && <SeverityPill severity={wo.severity} />}
          </div>
          <div
            style={{
              fontFamily: JAKARTA,
              fontSize: 13,
              fontWeight: 600,
              color: "#0A1628",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {wo.title}
          </div>
        </div>
        <WoStatusPill status={wo.status} />
      </div>
    </Link>
  );
}

function Centered({ text }) {
  return (
    <div
      style={{
        padding: "60px 32px",
        textAlign: "center",
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
