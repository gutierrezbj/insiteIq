/**
 * Service Agreement detail — Shield + SLA completo + WOs bajo contrato.
 */
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import {
  BallBadge,
  SeverityBadge,
  StatusBadge,
} from "../../../components/ui/Badges";

const SHIELD_TINT = {
  bronze: "text-[#B08968]",
  bronze_plus: "text-[#C68E5B]",
  silver: "text-text-secondary",
  gold: "text-primary-light",
};

export default function AgreementDetailPage() {
  const { agreement_id } = useParams();
  const { data: agreement, loading, error } = useFetch(
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

  const active = boundWos.filter(
    (w) => !["closed", "cancelled"].includes(w.status)
  );
  const recent = boundWos
    .filter((w) => ["closed", "cancelled"].includes(w.status))
    .slice(0, 5);

  if (loading) return <Centered text="cargando…" />;
  if (error)
    return <Centered text={`error · ${error.message}`} />;
  if (!agreement) return <Centered text="—" />;

  const sla = agreement.sla_spec || {};

  return (
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide">
      <Link
        to="/srs/agreements"
        className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary hover:text-primary-light inline-block mb-3"
      >
        ← Service Agreements
      </Link>

      <div className="accent-bar pl-4 mb-6">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <span className="label-caps">Agreement</span>
          <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            {agreement.contract_ref}
          </span>
          <span
            className={`font-mono text-2xs uppercase tracking-widest-srs ${
              SHIELD_TINT[agreement.shield_level] || "text-text-tertiary"
            }`}
          >
            · shield {agreement.shield_level}
          </span>
          {agreement.active === false && (
            <span className="font-mono text-2xs uppercase tracking-widest-srs text-danger">
              · inactive
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          {agreement.title}
        </h1>
        <p className="font-body text-text-secondary text-sm mt-1">
          {org?.legal_name || agreement.organization_id}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SLA spec */}
        <section className="bg-surface-raised accent-bar rounded-sm p-4">
          <div className="label-caps mb-3">SLA spec (snapshot al intake)</div>
          <dl className="font-body text-sm divide-y divide-surface-border">
            <Row label="Receive (time to ack)" value={formatMinutes(sla.receive_minutes)} />
            <Row
              label="Resolve (time to fix)"
              value={formatMinutes(sla.resolve_minutes)}
            />
            <Row label="Photos required" value={sla.photos_required || "—"} />
            <Row
              label="Escalation role"
              value={sla.escalation_role || "—"}
            />
            <Row
              label="Escalation trigger"
              value={
                sla.escalation_minutes != null
                  ? formatMinutes(sla.escalation_minutes) + " sin movimiento"
                  : "—"
              }
            />
            <Row label="24×7" value={sla.coverage_247 ? "yes" : "no"} />
            <Row
              label="Coordinator dedicado"
              value={sla.dedicated_coordinator ? "yes" : "no"}
            />
            <Row
              label="Client Copilot read-only"
              value={sla.client_copilot_readonly ? "yes" : "no"}
            />
          </dl>
        </section>

        {/* Contract meta */}
        <section className="bg-surface-raised accent-bar rounded-sm p-4">
          <div className="label-caps mb-3">Contract meta</div>
          <dl className="font-body text-sm divide-y divide-surface-border">
            <Row label="Contract ref" value={agreement.contract_ref || "—"} />
            <Row
              label="Client org"
              value={
                org ? (
                  <Link
                    to={`/srs/admin`}
                    className="text-primary-light hover:text-primary underline decoration-dotted"
                  >
                    {org.legal_name}
                  </Link>
                ) : (
                  agreement.organization_id
                )
              }
            />
            <Row
              label="SRS entity"
              value={agreement.srs_entity_id || "—"}
            />
            <Row label="Currency" value={agreement.currency || "USD"} />
            <Row
              label="Parts threshold USD"
              value={`$${agreement.parts_approval_threshold_usd?.toFixed(2) || "—"}`}
            />
            <Row
              label="Starts"
              value={agreement.starts_at || "—"}
            />
            <Row
              label="Ends"
              value={agreement.ends_at || "— open-ended —"}
            />
          </dl>
          {agreement.notes && (
            <>
              <div className="label-caps mt-4 mb-1.5">Notas</div>
              <p className="font-body text-sm text-text-primary whitespace-pre-line">
                {agreement.notes}
              </p>
            </>
          )}
        </section>
      </div>

      {/* Active WOs bajo este contrato */}
      <section className="bg-surface-raised accent-bar rounded-sm mt-4">
        <header className="px-4 py-3 border-b border-surface-border">
          <div className="label-caps">WOs activas · {active.length}</div>
        </header>
        <div className="divide-y divide-surface-border">
          {active.length === 0 && <Empty text="— sin activas —" />}
          {active.map((w) => (
            <WoLink key={w.id} wo={w} />
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="bg-surface-raised accent-bar rounded-sm mt-4">
          <header className="px-4 py-3 border-b border-surface-border">
            <div className="label-caps">Historico reciente (últimas 5)</div>
          </header>
          <div className="divide-y divide-surface-border">
            {recent.map((w) => (
              <WoLink key={w.id} wo={w} compact />
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 text-text-tertiary font-mono text-2xs uppercase tracking-widest-srs">
        Fase 2 plumbing · edicion de agreements via Admin Fase 3
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
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <StatusBadge status={wo.status} />
          {!compact && (
            <BallBadge
              side={wo.ball_in_court?.side}
              sinceIso={wo.ball_in_court?.since}
            />
          )}
        </div>
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

function formatMinutes(m) {
  if (m == null) return "—";
  if (m < 60) return `${m}m`;
  const hours = m / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return `${Math.round(days)}d`;
}
