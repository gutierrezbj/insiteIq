/**
 * Tech Profile — mi propio Skill Passport.
 * Cirujano de campo personality: alto contraste, metricas grandes,
 * todo a la mano. Motivación intrínseca: ve tu rating + progreso.
 */
import { useAuth } from "../../contexts/AuthContext";
import { useFetch } from "../../lib/useFetch";
import { formatAge } from "../../components/ui/Badges";

const LEVEL_TINT = {
  bronze: "text-[#B08968]",
  silver: "text-text-secondary",
  gold: "text-primary-light",
};

export default function TechProfilePage() {
  const { user, logout } = useAuth();
  const { data: passport, loading } = useFetch("/techs/me/passport");

  if (loading) return <Centered text="cargando…" />;
  if (!passport) return <Centered text="— passport no disponible —" />;

  return (
    <div>
      <div className="accent-bar pl-3 mb-5">
        <div className="label-caps text-text-secondary">Mi perfil</div>
        <h1 className="font-display text-xl text-text-primary leading-tight">
          {user?.full_name?.split(" ")[0] || "Tech"}
        </h1>
        <p className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-1">
          {passport.employment_type}
          {passport.last_active_at && (
            <> · activo {formatAge(passport.last_active_at)} ago</>
          )}
        </p>
      </div>

      {/* Big KPIs — tech quiere ver esto */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-surface-raised accent-bar rounded-md p-4">
          <div className="label-caps mb-1">Level</div>
          <div
            className={`font-display text-2xl leading-none ${
              LEVEL_TINT[passport.level] || "text-text-primary"
            }`}
          >
            {passport.level}
          </div>
        </div>
        <div className="bg-surface-raised accent-bar rounded-md p-4">
          <div className="label-caps mb-1">Rating</div>
          <div className="font-display text-2xl text-text-primary leading-none">
            {passport.rating_count
              ? passport.rating_avg.toFixed(2)
              : "—"}
          </div>
          {passport.rating_count > 0 && (
            <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-1">
              {passport.rating_count} rating{passport.rating_count === 1 ? "" : "s"}
            </div>
          )}
        </div>
        <div className="bg-surface-raised accent-bar rounded-md p-4">
          <div className="label-caps mb-1">Jobs done</div>
          <div className="font-display text-2xl text-text-primary leading-none">
            {passport.jobs_completed}
          </div>
        </div>
        <div className="bg-surface-raised accent-bar rounded-md p-4">
          <div className="label-caps mb-1">Certs</div>
          <div className="font-display text-2xl text-text-primary leading-none">
            {passport.certifications?.length || 0}
          </div>
        </div>
      </div>

      {/* Skills */}
      {(passport.skills || []).length > 0 && (
        <section className="bg-surface-raised accent-bar rounded-md p-4 mb-4">
          <div className="label-caps mb-3">Skills</div>
          <div className="space-y-2">
            {passport.skills.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 bg-surface-base rounded-sm px-3 py-2"
              >
                <div className="font-body text-sm text-text-primary">
                  {s.name}
                </div>
                <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                  {s.tier}
                  {s.endorsed_count != null && (
                    <> · {s.endorsed_count} endorsed</>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certs */}
      {(passport.certifications || []).length > 0 && (
        <section className="bg-surface-raised accent-bar rounded-md p-4 mb-4">
          <div className="label-caps mb-3">Certifications</div>
          <div className="space-y-2">
            {passport.certifications.map((c, i) => (
              <div
                key={i}
                className="bg-surface-base rounded-sm px-3 py-2"
              >
                <div className="font-body text-sm text-text-primary">
                  {c.name}
                </div>
                <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                  {c.issuer || "—"}
                  {c.credential_id && <> · {c.credential_id}</>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Coverage */}
      {((passport.countries_covered || []).length > 0 ||
        (passport.languages || []).length > 0) && (
        <section className="bg-surface-raised accent-bar rounded-md p-4 mb-4">
          <div className="label-caps mb-3">Cobertura</div>
          {(passport.countries_covered || []).length > 0 && (
            <div className="mb-3">
              <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mb-1">
                Countries
              </div>
              <div className="flex flex-wrap gap-1.5">
                {passport.countries_covered.map((c) => (
                  <span
                    key={c}
                    className="bg-surface-base rounded-sm px-2 py-0.5 font-mono text-2xs uppercase tracking-widest-srs text-text-primary"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(passport.languages || []).length > 0 && (
            <div>
              <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mb-1">
                Languages
              </div>
              <div className="flex flex-wrap gap-1.5">
                {passport.languages.map((l) => (
                  <span
                    key={l}
                    className="bg-surface-base rounded-sm px-2 py-0.5 font-mono text-2xs uppercase tracking-widest-srs text-text-primary"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Quality marks */}
      {(passport.quality_marks || []).length > 0 && (
        <section className="bg-surface-raised accent-bar rounded-md p-4 mb-4">
          <div className="label-caps mb-3">Quality marks</div>
          <div className="space-y-2">
            {passport.quality_marks.map((q, i) => (
              <div key={i} className="bg-surface-base rounded-sm px-3 py-2">
                <div className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light">
                  {q.kind || "mark"}
                </div>
                {q.note && (
                  <div className="font-body text-sm text-text-primary mt-0.5">
                    {q.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
        Edicion pasa por SRS · Fase 3 Admin
      </p>
    </div>
  );
}

function Centered({ text }) {
  return (
    <div className="px-4 py-12 text-center font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}
