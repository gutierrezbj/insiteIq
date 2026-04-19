/**
 * SRS Tech detail — Skill Passport + recent ratings + recent WOs.
 * Fase 2 plumbing. Editar certs/skills/quality_marks PATCH existe en backend
 * pero editor UI aterriza en Fase 3 (Admin).
 */
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import { formatAge, StatusBadge, SeverityBadge } from "../../../components/ui/Badges";

const LEVEL_TINT = {
  bronze: "text-[#B08968]",
  silver: "text-text-secondary",
  gold: "text-primary-light",
};

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

  // Pull all WOs assigned to this tech via the list endpoint
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
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide">
      <Link
        to="/srs/techs"
        className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary hover:text-primary-light inline-block mb-3"
      >
        ← Techs
      </Link>

      <div className="accent-bar pl-4 mb-6">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <span className="label-caps">Tech · Skill Passport</span>
          <span
            className={`font-mono text-2xs uppercase tracking-widest-srs ${
              LEVEL_TINT[passport.level] || "text-text-tertiary"
            }`}
          >
            {passport.level}
          </span>
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            · {passport.employment_type}
          </span>
        </div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          {user?.full_name || "—"}
        </h1>
        <p className="font-body text-text-secondary text-sm mt-1">
          {user?.email || "—"}
          {passport.last_active_at && (
            <>
              {" "}
              · activo {formatAge(passport.last_active_at)} ago
            </>
          )}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi label="Jobs done" value={passport.jobs_completed} />
        <Kpi
          label="Rating avg"
          value={
            passport.rating_count
              ? passport.rating_avg.toFixed(2)
              : "—"
          }
          hint={`${passport.rating_count} rating${passport.rating_count === 1 ? "" : "s"}`}
        />
        <Kpi
          label="Certs"
          value={passport.certifications?.length || 0}
        />
        <Kpi
          label="Skills"
          value={passport.skills?.length || 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Skills + certs */}
        <section className="bg-surface-raised accent-bar rounded-sm p-4">
          <div className="label-caps mb-3">Skills</div>
          {(passport.skills || []).length === 0 ? (
            <div className="font-body text-sm text-text-tertiary">
              — sin skills registradas —
            </div>
          ) : (
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
          )}

          <div className="label-caps mt-4 mb-3">Certifications</div>
          {(passport.certifications || []).length === 0 ? (
            <div className="font-body text-sm text-text-tertiary">
              — sin certs registradas —
            </div>
          ) : (
            <div className="space-y-1.5">
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
                    {c.verified_by_user_id && (
                      <> · verified</>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Coverage + quality marks + bio */}
        <section className="bg-surface-raised accent-bar rounded-sm p-4">
          <div className="label-caps mb-3">Cobertura</div>
          <div className="mb-3">
            <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mb-1">
              Countries
            </div>
            {(passport.countries_covered || []).length > 0 ? (
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
            ) : (
              <span className="font-body text-sm text-text-tertiary">—</span>
            )}
          </div>

          <div className="mb-3">
            <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mb-1">
              Languages
            </div>
            {(passport.languages || []).length > 0 ? (
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
            ) : (
              <span className="font-body text-sm text-text-tertiary">—</span>
            )}
          </div>

          <div className="label-caps mt-4 mb-2">Quality marks</div>
          {(passport.quality_marks || []).length === 0 ? (
            <div className="font-body text-sm text-text-tertiary">
              — sin quality marks —
            </div>
          ) : (
            <div className="space-y-1.5">
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
          )}

          {passport.bio && (
            <>
              <div className="label-caps mt-4 mb-2">Bio</div>
              <p className="font-body text-sm text-text-primary whitespace-pre-line">
                {passport.bio}
              </p>
            </>
          )}
        </section>
      </div>

      {/* WOs activas + recent */}
      <section className="bg-surface-raised accent-bar rounded-sm mt-4">
        <header className="px-4 py-3 border-b border-surface-border">
          <div className="label-caps">WOs activas · {activeWos.length}</div>
        </header>
        <div className="divide-y divide-surface-border">
          {activeWos.length === 0 && <Empty text="— sin activas —" />}
          {activeWos.map((w) => (
            <WoLink key={w.id} wo={w} />
          ))}
        </div>
      </section>

      {recentClosed.length > 0 && (
        <section className="bg-surface-raised accent-bar rounded-sm mt-4">
          <header className="px-4 py-3 border-b border-surface-border">
            <div className="label-caps">Historico reciente (últimas 5)</div>
          </header>
          <div className="divide-y divide-surface-border">
            {recentClosed.map((w) => (
              <WoLink key={w.id} wo={w} compact />
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 text-text-tertiary font-mono text-2xs uppercase tracking-widest-srs">
        Fase 2 plumbing · edicion de skills/certs/quality marks Fase 3 (Admin)
      </p>
    </div>
  );
}

function Kpi({ label, value, hint }) {
  return (
    <div className="bg-surface-raised accent-bar rounded-sm px-4 py-3">
      <div className="label-caps mb-0.5">{label}</div>
      <div className="font-display text-2xl text-text-primary leading-none">
        {value}
      </div>
      {hint && (
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-1.5">
          {hint}
        </div>
      )}
    </div>
  );
}

function WoLink({ wo, compact }) {
  return (
    <Link
      to={`/srs/ops/${wo.id}`}
      className="block px-4 py-2.5 hover:bg-surface-overlay/60 transition-colors duration-fast"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              {wo.reference}
            </span>
            {!compact && <SeverityBadge severity={wo.severity} />}
          </div>
          <div className="font-body text-sm text-text-primary truncate">
            {wo.title}
          </div>
        </div>
        <StatusBadge status={wo.status} />
      </div>
    </Link>
  );
}

function Empty({ text }) {
  return (
    <div className="px-4 py-6 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}

function Centered({ text }) {
  return (
    <div className="px-8 py-16 text-center font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}
