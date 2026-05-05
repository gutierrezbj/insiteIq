/**
 * Tech Profile · v2 paleta F (Iter 2.40).
 *
 * Mi propio Skill Passport. Mobile-first. Big KPIs (Level/Rating/Jobs/Certs)
 * + Skills + Certs + Cobertura + Quality marks.
 */
import { useAuth } from "../../contexts/AuthContext";
import { useFetch } from "../../lib/useFetch";
import { formatAge } from "../../components/ui/Badges";
import { JAKARTA, MONO_CAPS } from "../../components/v2-shared/typography";

const LEVEL_STYLES = {
  bronze:  { dot: "#A16207", color: "#A16207" },
  silver:  { dot: "#94A3B8", color: "#3D4A66" },
  gold:    { dot: "#CA8A04", color: "#CA8A04" },
  unrated: { dot: "#C8CDD8", color: "#8B95A8" },
};

export default function TechProfilePage() {
  const { user } = useAuth();
  const { data: passport, loading } = useFetch("/techs/me/passport");

  if (loading) return <Centered text="cargando…" />;
  if (!passport) return <Centered text="— passport no disponible —" />;

  const lvl = LEVEL_STYLES[passport.level] || LEVEL_STYLES.unrated;

  return (
    <div>
      <div style={{ paddingLeft: 12, borderLeft: "3px solid #0A1628", marginBottom: 20 }}>
        <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.16em", marginBottom: 4 }}>
          Mi perfil
        </div>
        <h1
          style={{
            fontFamily: JAKARTA,
            fontSize: 22,
            fontWeight: 800,
            color: "#0A1628",
            letterSpacing: "-0.015em",
            lineHeight: 1.1,
          }}
        >
          {user?.full_name?.split(" ")[0] || "Tech"}
        </h1>
        <p style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 6 }}>
          {passport.employment_type}
          {passport.last_active_at && <> · activo {formatAge(passport.last_active_at)} ago</>}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Level" value={passport.level} valueColor={lvl.color} />
        <KpiCard
          label="Rating"
          value={passport.rating_count ? passport.rating_avg.toFixed(2) : "—"}
          hint={
            passport.rating_count > 0
              ? `${passport.rating_count} rating${passport.rating_count === 1 ? "" : "s"}`
              : null
          }
        />
        <KpiCard label="Jobs done" value={passport.jobs_completed} />
        <KpiCard label="Certs" value={passport.certifications?.length || 0} />
      </div>

      {(passport.skills || []).length > 0 && (
        <Section title="Skills">
          {passport.skills.map((s, i) => (
            <ItemCard
              key={i}
              left={s.name}
              right={`${s.tier}${s.endorsed_count != null ? ` · ${s.endorsed_count} endorsed` : ""}`}
            />
          ))}
        </Section>
      )}

      {(passport.certifications || []).length > 0 && (
        <Section title="Certifications">
          {passport.certifications.map((c, i) => (
            <div
              key={i}
              style={{
                background: "#F4F6F8",
                border: "1px solid #E2E5EC",
                borderRadius: 4,
                padding: "10px 12px",
              }}
            >
              <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", fontWeight: 600 }}>
                {c.name}
              </div>
              <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 2 }}>
                {c.issuer || "—"}
                {c.credential_id && <> · {c.credential_id}</>}
              </div>
            </div>
          ))}
        </Section>
      )}

      {((passport.countries_covered || []).length > 0 ||
        (passport.languages || []).length > 0) && (
        <Section title="Cobertura">
          {(passport.countries_covered || []).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em", marginBottom: 6 }}>
                Countries
              </div>
              <Chips items={passport.countries_covered} />
            </div>
          )}
          {(passport.languages || []).length > 0 && (
            <div>
              <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em", marginBottom: 6 }}>
                Languages
              </div>
              <Chips items={passport.languages} />
            </div>
          )}
        </Section>
      )}

      {(passport.quality_marks || []).length > 0 && (
        <Section title="Quality marks">
          {passport.quality_marks.map((q, i) => (
            <div
              key={i}
              style={{
                background: "#F4F6F8",
                border: "1px solid #E2E5EC",
                borderRadius: 4,
                padding: "10px 12px",
              }}
            >
              <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A1628", letterSpacing: "0.14em", fontWeight: 800 }}>
                {q.kind || "mark"}
              </div>
              {q.note && (
                <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", marginTop: 4, fontWeight: 500 }}>
                  {q.note}
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      <p style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 16 }}>
        Edición pasa por SRS · Fase 3 Admin
      </p>
    </div>
  );
}

function KpiCard({ label, value, valueColor = "#0A1628", hint }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        borderLeft: "3px solid #0A1628",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: JAKARTA,
          fontSize: 24,
          fontWeight: 800,
          color: valueColor,
          letterSpacing: "-0.01em",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        borderLeft: "3px solid #0A1628",
        borderRadius: 8,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </section>
  );
}

function ItemCard({ left, right }) {
  return (
    <div
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
      <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", fontWeight: 600 }}>
        {left}
      </div>
      <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em" }}>{right}</div>
    </div>
  );
}

function Chips({ items }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((item) => (
        <span
          key={item}
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
          {item}
        </span>
      ))}
    </div>
  );
}

function Centered({ text }) {
  return (
    <div
      style={{
        padding: "48px 16px",
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
