/**
 * SRS Site detail — read-only Fase 2 plumbing.
 * Fase 5 suma Site Bible completo (Domain 10 Knowledge).
 */
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import {
  BallBadge,
  SeverityBadge,
  StatusBadge,
} from "../../../components/ui/Badges";

export default function SiteDetailPage() {
  const { site_id } = useParams();

  const { data: site, loading, error } = useFetch(`/sites/${site_id}`, {
    deps: [site_id],
  });
  const { data: wos } = useFetch("/work-orders?limit=200");

  const siteWos = useMemo(() => {
    if (!wos) return [];
    return wos.filter((w) => w.site_id === site_id);
  }, [wos, site_id]);

  const activeWos = siteWos.filter(
    (w) => !["closed", "cancelled"].includes(w.status)
  );
  const recentClosed = siteWos
    .filter((w) => ["closed", "cancelled"].includes(w.status))
    .slice(0, 5);

  if (loading) return <CenteredMessage text="cargando…" />;
  if (error) return <CenteredMessage text={`error: ${error.message}`} />;
  if (!site) return <CenteredMessage text="—" />;

  return (
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide">
      <Link
        to="/srs/sites"
        className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary hover:text-primary-light inline-block mb-3"
      >
        ← Sites
      </Link>

      <div className="accent-bar pl-4 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="label-caps">Site</span>
          {site.code && (
            <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              {site.code}
            </span>
          )}
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-secondary">
            · {site.country || "—"}
          </span>
          {site.status !== "active" && (
            <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              · {site.status}
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          {site.name}
        </h1>
        {site.address && (
          <p className="font-body text-text-secondary mt-1">
            {site.address}
            {site.city && <>, {site.city}</>}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Metadata */}
        <section className="bg-surface-raised accent-bar rounded-sm p-4">
          <div className="label-caps mb-3">Location + cierre</div>
          <dl className="font-body text-sm divide-y divide-surface-border">
            <Row label="Country" value={site.country || "—"} />
            <Row label="City" value={site.city || "—"} />
            <Row label="Timezone" value={site.timezone || "—"} />
            <Row
              label="Cierre model"
              value={
                site.has_physical_resident
                  ? "Residente fisico (DC/24x7)"
                  : "NOC remoto (default)"
              }
            />
            {site.default_noc_operator_user_id && (
              <Row
                label="Default NOC"
                value={short(site.default_noc_operator_user_id)}
              />
            )}
          </dl>
        </section>

        {/* Contact + access */}
        <section className="bg-surface-raised accent-bar rounded-sm p-4">
          <div className="label-caps mb-3">Contacto onsite + acceso</div>
          {site.onsite_contact ? (
            <div className="mb-3 bg-surface-base rounded-sm p-3">
              <div className="font-display text-base text-text-primary leading-tight">
                {site.onsite_contact.name}
              </div>
              {site.onsite_contact.role && (
                <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-0.5">
                  {site.onsite_contact.role}
                </div>
              )}
              {site.onsite_contact.email && (
                <div className="font-body text-sm text-text-secondary mt-1">
                  {site.onsite_contact.email}
                </div>
              )}
              {site.onsite_contact.phone && (
                <div className="font-mono text-sm text-text-primary mt-0.5">
                  {site.onsite_contact.phone}
                </div>
              )}
            </div>
          ) : (
            <div className="font-body text-sm text-text-tertiary mb-3">
              — sin contacto onsite registrado —
            </div>
          )}

          <div className="label-caps mb-1.5">Access notes</div>
          {site.access_notes ? (
            <p className="font-body text-sm text-text-primary whitespace-pre-line">
              {site.access_notes}
            </p>
          ) : (
            <p className="font-body text-sm text-text-tertiary">
              — sin notas de acceso — Site Bible en Fase 5 expandirá esto (parking,
              QR locks, horarios, contactos de respaldo, fotos).
            </p>
          )}
        </section>
      </div>

      {site.notes && (
        <section className="bg-surface-raised accent-bar rounded-sm p-4 mt-4">
          <div className="label-caps mb-2">Notas</div>
          <p className="font-body text-sm text-text-primary whitespace-pre-line">
            {site.notes}
          </p>
        </section>
      )}

      {/* WOs del site */}
      <section className="bg-surface-raised accent-bar rounded-sm mt-4">
        <header className="px-4 py-3 border-b border-surface-border">
          <div className="label-caps">Work orders · activas</div>
          <h2 className="font-display text-base text-text-primary">
            {activeWos.length} abiertas
          </h2>
        </header>
        <div className="divide-y divide-surface-border">
          {activeWos.length === 0 && (
            <div className="px-4 py-6 font-body text-sm text-text-tertiary">
              — sin WOs activas —
            </div>
          )}
          {activeWos.map((w) => (
            <Link
              key={w.id}
              to={`/srs/ops/${w.id}`}
              className="block px-4 py-3 hover:bg-surface-overlay/60 transition-colors duration-fast"
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                      {w.reference}
                    </span>
                    <SeverityBadge severity={w.severity} />
                  </div>
                  <div className="font-body text-sm text-text-primary truncate">
                    {w.title}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <StatusBadge status={w.status} />
                  <BallBadge
                    side={w.ball_in_court?.side}
                    sinceIso={w.ball_in_court?.since}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {recentClosed.length > 0 && (
        <section className="bg-surface-raised accent-bar rounded-sm mt-4">
          <header className="px-4 py-3 border-b border-surface-border">
            <div className="label-caps">Historico reciente (últimos 5)</div>
          </header>
          <div className="divide-y divide-surface-border">
            {recentClosed.map((w) => (
              <Link
                key={w.id}
                to={`/srs/ops/${w.id}`}
                className="block px-4 py-2.5 hover:bg-surface-overlay/60 transition-colors duration-fast"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                      {w.reference}
                    </div>
                    <div className="font-body text-sm text-text-primary truncate">
                      {w.title}
                    </div>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 text-text-tertiary font-mono text-2xs uppercase tracking-widest-srs">
        Fase 2 plumbing · Site Bible completo · Fase 5 (Domain 10)
      </p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary flex-shrink-0">
        {label}
      </span>
      <span className="font-body text-sm text-text-primary truncate max-w-[60%] text-right">
        {value}
      </span>
    </div>
  );
}

function CenteredMessage({ text }) {
  return (
    <div className="px-8 py-16 text-center font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
      {text}
    </div>
  );
}

function short(id) {
  if (!id) return "—";
  if (id.length > 14) return `${id.slice(0, 6)}…${id.slice(-4)}`;
  return id;
}
