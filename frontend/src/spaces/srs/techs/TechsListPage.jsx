/**
 * SRS Techs — listado con Skill Passport resumido.
 * Decision #4 Modo 1 visible: quien sabe que, rating, jobs_completed, level.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../lib/api";
import { useFetch } from "../../../lib/useFetch";

const LEVEL_TINT = {
  bronze: "text-[#B08968]",
  silver: "text-text-secondary",
  gold: "text-primary-light",
  unrated: "text-text-tertiary",
};

export default function TechsListPage() {
  const { data: users, loading } = useFetch("/users");
  const [passports, setPassports] = useState({});
  const [loadingPassports, setLoadingPassports] = useState(false);

  const techs = useMemo(() => {
    return (users || []).filter((u) =>
      (u.memberships || []).some(
        (m) => m.space === "tech_field" && m.active
      )
    );
  }, [users]);

  // Fetch each passport in parallel. Pragmatic N+1; OK for tenant scale.
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
    return () => {
      alive = false;
    };
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
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide">
      <div className="accent-bar pl-4 mb-6">
        <div className="label-caps">Techs · Skill Passports</div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          {techs.length} techs operando
        </h1>
        <p className="font-body text-text-secondary text-sm mt-1">
          Decision #4 Modo 1 · jobs + rating + level + quality marks
        </p>
      </div>

      <div className="bg-surface-raised accent-bar rounded-sm">
        <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-surface-border text-text-tertiary">
          <div className="col-span-3 label-caps">Tech</div>
          <div className="col-span-2 label-caps">Level</div>
          <div className="col-span-1 label-caps text-right">Jobs</div>
          <div className="col-span-2 label-caps text-right">Rating</div>
          <div className="col-span-2 label-caps">Employment</div>
          <div className="col-span-2 label-caps text-right">Countries</div>
        </div>

        <div className="divide-y divide-surface-border">
          {(loading || loadingPassports) && (
            <Empty text="cargando…" />
          )}
          {!loading && rows.length === 0 && <Empty text="— sin techs —" />}
          {rows.map(({ user: t, passport: p }) => (
            <Link
              key={t.id}
              to={`/srs/techs/${t.id}`}
              className="grid grid-cols-12 gap-3 px-4 py-3 items-start hover:bg-surface-overlay/60 transition-colors duration-fast"
            >
              <div className="col-span-3 min-w-0">
                <div className="font-body text-sm text-text-primary truncate">
                  {t.full_name || "—"}
                </div>
                <div className="font-mono text-2xs text-text-tertiary truncate">
                  {t.email}
                </div>
              </div>
              <div
                className={`col-span-2 font-mono text-2xs uppercase tracking-widest-srs ${
                  LEVEL_TINT[p?.level || "unrated"]
                }`}
              >
                {p?.level || "—"}
              </div>
              <div className="col-span-1 text-right">
                <div className="font-display text-base text-text-primary leading-none">
                  {p?.jobs_completed ?? "—"}
                </div>
              </div>
              <div className="col-span-2 text-right">
                {p?.rating_count ? (
                  <>
                    <div className="font-display text-base text-text-primary leading-none">
                      {p.rating_avg.toFixed(2)}
                    </div>
                    <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-0.5">
                      · {p.rating_count} rating{p.rating_count === 1 ? "" : "s"}
                    </div>
                  </>
                ) : (
                  <span className="font-mono text-2xs text-text-tertiary">
                    sin ratings
                  </span>
                )}
              </div>
              <div className="col-span-2 font-mono text-2xs uppercase tracking-widest-srs text-text-secondary">
                {p?.employment_type || t.employment_type || "—"}
              </div>
              <div className="col-span-2 text-right font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                {(p?.countries_covered || []).length > 0
                  ? p.countries_covered.join(" · ")
                  : "—"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="px-4 py-6 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}
