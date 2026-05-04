/**
 * SRS Site detail · v2 paleta F (Iter 2.22).
 *
 * Migración v1 amber legacy → v2 usando v2-shared (Pills, KpiTile,
 * BackLinkV2, SectionCard, MetaRow, typography).
 *
 * Endpoints:
 *   GET /api/sites/{id}
 *   GET /api/work-orders?limit=200 (filtra client-side por site_id)
 */
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import {
  WoStatusPill,
  SeverityPill,
  BallPill,
  SiteStatusPill,
} from "../../../components/v2-shared/Pills";
import BackLinkV2 from "../../../components/v2-shared/BackLinkV2";
import SectionCard, { SectionTitle } from "../../../components/v2-shared/SectionCard";
import MetaRow from "../../../components/v2-shared/MetaRow";
import { JAKARTA, MONO_CAPS } from "../../../components/v2-shared/typography";

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
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      <BackLinkV2 to="/srs/sites" label="Sites" />

      {/* Header */}
      <div
        style={{
          paddingLeft: 16,
          borderLeft: "3px solid #0A1628",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#0A1628", letterSpacing: "0.16em" }}>
            Site
          </span>
          {site.code && (
            <span style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.12em" }}>
              {site.code}
            </span>
          )}
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em" }}>
            · {site.country || "—"}
          </span>
          <SiteStatusPill status={site.status} />
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
          {site.name}
        </h1>
        {site.address && (
          <p
            style={{
              fontFamily: JAKARTA,
              fontSize: 13.5,
              color: "#3D4A66",
              marginTop: 8,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {site.address}
            {site.city && <>, {site.city}</>}
          </p>
        )}
      </div>

      {/* Body grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 16,
        }}
      >
        {/* Location + cierre */}
        <SectionCard>
          <SectionTitle>Location + cierre</SectionTitle>
          <dl style={{ display: "flex", flexDirection: "column" }}>
            <MetaRow label="Country" value={site.country || "—"} />
            <MetaRow label="City" value={site.city || "—"} />
            <MetaRow label="Timezone" value={site.timezone || "—"} />
            <MetaRow
              label="Cierre model"
              value={
                site.has_physical_resident
                  ? "Residente físico (DC/24x7)"
                  : "NOC remoto (default)"
              }
            />
            {site.default_noc_operator_user_id && (
              <MetaRow label="Default NOC" value={short(site.default_noc_operator_user_id)} />
            )}
            {site.lat != null && site.lng != null && (
              <MetaRow
                label="Lat / Lng"
                value={`${site.lat.toFixed(5)} · ${site.lng.toFixed(5)}`}
              />
            )}
            {site.site_type && <MetaRow label="Site type" value={site.site_type} />}
          </dl>
        </SectionCard>

        {/* Contact + access */}
        <SectionCard>
          <SectionTitle>Contacto onsite + acceso</SectionTitle>
          {site.onsite_contact ? (
            <div
              style={{
                background: "#F4F6F8",
                border: "1px solid #E2E5EC",
                borderRadius: 4,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0A1628",
                  lineHeight: 1.2,
                }}
              >
                {site.onsite_contact.name}
              </div>
              {site.onsite_contact.role && (
                <div
                  style={{
                    ...MONO_CAPS,
                    fontSize: 9.5,
                    color: "#8B95A8",
                    letterSpacing: "0.12em",
                    marginTop: 2,
                  }}
                >
                  {site.onsite_contact.role}
                </div>
              )}
              {site.onsite_contact.email && (
                <div
                  style={{
                    fontFamily: JAKARTA,
                    fontSize: 13,
                    color: "#3D4A66",
                    marginTop: 6,
                    fontWeight: 500,
                  }}
                >
                  {site.onsite_contact.email}
                </div>
              )}
              {site.onsite_contact.phone && (
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    color: "#0A1628",
                    marginTop: 2,
                    fontWeight: 600,
                  }}
                >
                  {site.onsite_contact.phone}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                ...MONO_CAPS,
                fontSize: 10,
                color: "#8B95A8",
                letterSpacing: "0.14em",
                marginBottom: 12,
              }}
            >
              — sin contacto onsite registrado —
            </div>
          )}

          <div
            style={{
              ...MONO_CAPS,
              fontSize: 9.5,
              color: "#3D4A66",
              letterSpacing: "0.14em",
              marginBottom: 4,
            }}
          >
            Access notes
          </div>
          {site.access_notes ? (
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
              {site.access_notes}
            </p>
          ) : (
            <p
              style={{
                fontFamily: JAKARTA,
                fontSize: 13,
                color: "#8B95A8",
                lineHeight: 1.55,
                fontWeight: 500,
              }}
            >
              — sin notas de acceso — Site Bible en Fase 5 expandirá esto (parking,
              QR locks, horarios, contactos de respaldo, fotos).
            </p>
          )}
        </SectionCard>
      </div>

      {/* Notes */}
      {site.notes && (
        <SectionCard style={{ marginTop: 16 }}>
          <SectionTitle marginBottom={8}>Notas</SectionTitle>
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
            {site.notes}
          </p>
        </SectionCard>
      )}

      {/* WOs activas */}
      <SectionCard padding={0} style={{ marginTop: 16 }}>
        <header
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #E2E5EC",
          }}
        >
          <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 2 }}>
            Work orders · activas
          </div>
          <div
            style={{
              fontFamily: JAKARTA,
              fontSize: 16,
              fontWeight: 700,
              color: "#0A1628",
            }}
          >
            {activeWos.length} <span style={{ color: "#3D4A66", fontWeight: 500 }}>abiertas</span>
          </div>
        </header>
        <div>
          {activeWos.length === 0 && (
            <div
              style={{
                padding: "20px 18px",
                ...MONO_CAPS,
                fontSize: 10,
                color: "#8B95A8",
                letterSpacing: "0.14em",
              }}
            >
              — sin WOs activas —
            </div>
          )}
          {activeWos.map((w) => (
            <Link
              key={w.id}
              to={`/srs/ops/${w.id}`}
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
                      {w.reference}
                    </span>
                    <SeverityPill severity={w.severity} />
                  </div>
                  <div
                    style={{
                      fontFamily: JAKARTA,
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#0A1628",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {w.title}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  <WoStatusPill status={w.status} />
                  <BallPill side={w.ball_in_court?.side} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>

      {/* Histórico reciente */}
      {recentClosed.length > 0 && (
        <SectionCard padding={0} style={{ marginTop: 16 }}>
          <header
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid #E2E5EC",
            }}
          >
            <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em" }}>
              Histórico reciente (últimos 5)
            </div>
          </header>
          <div>
            {recentClosed.map((w) => (
              <Link
                key={w.id}
                to={`/srs/ops/${w.id}`}
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
                    <div
                      style={{
                        ...MONO_CAPS,
                        fontSize: 9.5,
                        color: "#8B95A8",
                        letterSpacing: "0.12em",
                      }}
                    >
                      {w.reference}
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
                      {w.title}
                    </div>
                  </div>
                  <WoStatusPill status={w.status} />
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      <p
        style={{
          marginTop: 24,
          ...MONO_CAPS,
          fontSize: 10,
          color: "#8B95A8",
          letterSpacing: "0.14em",
        }}
      >
        Fase 2 plumbing · Site Bible completo · Fase 5 (Domain 10)
      </p>
    </div>
  );
}

function CenteredMessage({ text }) {
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

function short(id) {
  if (!id) return "—";
  if (id.length > 14) return `${id.slice(0, 6)}…${id.slice(-4)}`;
  return id;
}
