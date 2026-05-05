/**
 * SRS Service Agreement detail · v2 paleta F (Iter 2.23).
 *
 * Migración v1 amber legacy → v2 usando v2-shared. RateCardSection (X-a)
 * preservada v1 — sprint propio para migrar.
 *
 * Endpoints:
 *   GET /api/service-agreements/{id}
 *   GET /api/organizations
 *   GET /api/work-orders?limit=200 (filtra client-side por agreement_id)
 */
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import { useAuth } from "../../../contexts/AuthContext";
import RateCardSection from "../../../components/agreement/RateCardSection";
import {
  ShieldPill,
  WoStatusPill,
  SeverityPill,
  BallPill,
} from "../../../components/v2-shared/Pills";
import BackLinkV2 from "../../../components/v2-shared/BackLinkV2";
import SectionCard, { SectionTitle } from "../../../components/v2-shared/SectionCard";
import MetaRow from "../../../components/v2-shared/MetaRow";
import { JAKARTA, MONO_CAPS } from "../../../components/v2-shared/typography";

export default function AgreementDetailPage() {
  const { agreement_id } = useParams();
  const { user } = useAuth();
  const srsMem = user?.memberships?.find((m) => m.space === "srs_coordinators");
  const isSrsAdmin = !!srsMem && ["owner", "director"].includes(srsMem.authority_level);

  const { data: agreement, loading, error, reload } = useFetch(
    `/service-agreements/${agreement_id}`,
    { deps: [agreement_id] }
  );
  const { data: orgs } = useFetch("/organizations");
  const { data: wos } = useFetch("/work-orders?limit=200");

  const org = useMemo(() => {
    if (!agreement || !orgs) return null;
    return orgs.find((o) => o.id === agreement.organization_id);
  }, [agreement, orgs]);

  const boundWos = useMemo(() => {
    if (!wos || !agreement) return [];
    return wos.filter((w) => w.service_agreement_id === agreement_id);
  }, [wos, agreement, agreement_id]);

  const active = boundWos.filter((w) => !["closed", "cancelled"].includes(w.status));
  const recent = boundWos
    .filter((w) => ["closed", "cancelled"].includes(w.status))
    .slice(0, 5);

  if (loading) return <Centered text="cargando…" />;
  if (error) return <Centered text={`error · ${error.message}`} />;
  if (!agreement) return <Centered text="—" />;

  const sla = agreement.sla_spec || {};

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      <BackLinkV2 to="/srs/agreements" label="Service Agreements" />

      <div style={{ paddingLeft: 16, borderLeft: "3px solid #0A1628", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#0A1628", letterSpacing: "0.16em" }}>
            Agreement
          </span>
          <span style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.12em" }}>
            {agreement.contract_ref}
          </span>
          <ShieldPill level={agreement.shield_level} />
          {agreement.active === false && (
            <span style={{ ...MONO_CAPS, fontSize: 10, color: "#DC2626", letterSpacing: "0.14em" }}>
              · inactive
            </span>
          )}
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
          {agreement.title}
        </h1>
        <p style={{ fontFamily: JAKARTA, fontSize: 13.5, color: "#3D4A66", marginTop: 8, fontWeight: 500 }}>
          {org?.legal_name || agreement.organization_id}
        </p>
      </div>

      {/* Body grid · SLA spec + Contract meta */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 16,
        }}
      >
        <SectionCard>
          <SectionTitle>SLA spec (snapshot al intake)</SectionTitle>
          <dl style={{ display: "flex", flexDirection: "column" }}>
            <MetaRow label="Receive (time to ack)" value={formatMinutes(sla.receive_minutes)} />
            <MetaRow label="Resolve (time to fix)" value={formatMinutes(sla.resolve_minutes)} />
            <MetaRow label="Photos required" value={sla.photos_required || "—"} />
            <MetaRow label="Escalation role" value={sla.escalation_role || "—"} />
            <MetaRow
              label="Escalation trigger"
              value={
                sla.escalation_minutes != null
                  ? formatMinutes(sla.escalation_minutes) + " sin movimiento"
                  : "—"
              }
            />
            <MetaRow label="24×7" value={sla.coverage_247 ? "yes" : "no"} />
            <MetaRow label="Coordinator dedicado" value={sla.dedicated_coordinator ? "yes" : "no"} />
            <MetaRow label="Client Copilot read-only" value={sla.client_copilot_readonly ? "yes" : "no"} />
          </dl>
        </SectionCard>

        <SectionCard>
          <SectionTitle>Contract meta</SectionTitle>
          <dl style={{ display: "flex", flexDirection: "column" }}>
            <MetaRow label="Contract ref" value={agreement.contract_ref || "—"} />
            <MetaRow
              label="Client org"
              value={
                org ? (
                  <Link
                    to="/srs/admin"
                    style={{
                      color: "#0A1628",
                      textDecoration: "underline",
                      textDecorationStyle: "dotted",
                      fontWeight: 700,
                    }}
                  >
                    {org.legal_name}
                  </Link>
                ) : (
                  agreement.organization_id
                )
              }
            />
            <MetaRow label="SRS entity" value={agreement.srs_entity_id || "—"} />
            <MetaRow label="Currency" value={agreement.currency || "USD"} />
            <MetaRow
              label="Parts threshold USD"
              value={`$${agreement.parts_approval_threshold_usd?.toFixed(2) || "—"}`}
            />
            <MetaRow label="Starts" value={agreement.starts_at || "—"} />
            <MetaRow label="Ends" value={agreement.ends_at || "— open-ended —"} />
          </dl>
          {agreement.notes && (
            <>
              <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginTop: 16, marginBottom: 6 }}>
                Notas
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
                {agreement.notes}
              </p>
            </>
          )}
        </SectionCard>
      </div>

      {/* Rate card (X-a · preservado v1, sprint propio para migrar) */}
      <RateCardSection agreement={agreement} isSrs={isSrsAdmin} reload={reload} />

      {/* Active WOs */}
      <SectionCard padding={0} style={{ marginTop: 16 }}>
        <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
          <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em" }}>
            WOs activas · {active.length}
          </div>
        </header>
        <div>
          {active.length === 0 && (
            <div style={{ padding: "20px 18px", ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
              — sin activas —
            </div>
          )}
          {active.map((w) => <WoLink key={w.id} wo={w} />)}
        </div>
      </SectionCard>

      {recent.length > 0 && (
        <SectionCard padding={0} style={{ marginTop: 16 }}>
          <header style={{ padding: "14px 18px", borderBottom: "1px solid #E2E5EC" }}>
            <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em" }}>
              Histórico reciente (últimas 5)
            </div>
          </header>
          <div>
            {recent.map((w) => <WoLink key={w.id} wo={w} compact />)}
          </div>
        </SectionCard>
      )}

      <p style={{ marginTop: 24, ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
        Iter 2.23 · edición de agreements via Admin Fase 3
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <WoStatusPill status={wo.status} />
          {!compact && <BallPill side={wo.ball_in_court?.side} />}
        </div>
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

function formatMinutes(m) {
  if (m == null) return "—";
  if (m < 60) return `${m}m`;
  const hours = m / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return `${Math.round(days)}d`;
}
