/**
 * Service Agreements — contratos + Shield SLA por cliente.
 * Decision #3 Modo 1: Shield level vive en service_agreement, snapshot al
 * work_order.intake. Un cliente puede tener multiples agreements con shield
 * distintos.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";

const SHIELD_TINT = {
  bronze: "text-[#B08968]",
  bronze_plus: "text-[#C68E5B]",
  silver: "text-text-secondary",
  gold: "text-primary-light",
};

export default function AgreementsListPage() {
  const { data: agreements, loading } = useFetch("/service-agreements");
  const { data: orgs } = useFetch("/organizations");
  const { data: shieldCatalog } = useFetch("/service-agreements/shield-levels");
  const [shieldFilter, setShieldFilter] = useState("");

  const orgById = useMemo(() => {
    const m = new Map();
    for (const o of orgs || []) m.set(o.id, o);
    return m;
  }, [orgs]);

  const list = agreements || [];
  const filtered = useMemo(() => {
    if (!shieldFilter) return list;
    return list.filter((a) => a.shield_level === shieldFilter);
  }, [list, shieldFilter]);

  return (
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide">
      <div className="accent-bar pl-4 mb-6">
        <div className="label-caps">Service Agreements</div>
        <h1 className="font-display text-2xl text-text-primary leading-tight">
          {list.length} contratos activos
        </h1>
        <p className="font-body text-text-secondary text-sm mt-1">
          Shield snapshot al intake — Decision #3 Modo 1. SLA por work_order
          se fija aqui.
        </p>
      </div>

      {/* Shield catalog reference */}
      {shieldCatalog?.levels && (
        <section className="bg-surface-raised accent-bar rounded-sm p-4 mb-5">
          <div className="label-caps mb-3">Shield catalog · SLA defaults</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Object.entries(shieldCatalog.levels).map(([level, sla]) => (
              <ShieldCatalogCard key={level} level={level} sla={sla} />
            ))}
          </div>
        </section>
      )}

      {/* Filter */}
      <div className="bg-surface-raised accent-bar rounded-sm p-3 mb-4 flex items-center gap-3 flex-wrap">
        <label htmlFor="sfilter" className="label-caps">
          Shield
        </label>
        <select
          id="sfilter"
          value={shieldFilter}
          onChange={(e) => setShieldFilter(e.target.value)}
          className="bg-surface-overlay border border-surface-border rounded-sm px-3 py-1.5 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast"
        >
          <option value="">todos</option>
          <option value="bronze">bronze</option>
          <option value="bronze_plus">bronze_plus</option>
          <option value="silver">silver</option>
          <option value="gold">gold</option>
        </select>
        <div className="ml-auto font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          {filtered.length} / {list.length}
        </div>
      </div>

      {/* Agreements table */}
      <div className="bg-surface-raised accent-bar rounded-sm">
        <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-surface-border text-text-tertiary">
          <div className="col-span-4 label-caps">Contract</div>
          <div className="col-span-3 label-caps">Client</div>
          <div className="col-span-1 label-caps">Shield</div>
          <div className="col-span-2 label-caps text-right">SLA resolve</div>
          <div className="col-span-2 label-caps text-right">Threshold</div>
        </div>

        <div className="divide-y divide-surface-border">
          {loading && <Empty text="cargando…" />}
          {!loading && filtered.length === 0 && <Empty text="— nada match —" />}
          {filtered.map((a) => (
            <Link
              key={a.id}
              to={`/srs/agreements/${a.id}`}
              className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-surface-overlay/60 transition-colors duration-fast"
            >
              <div className="col-span-4 min-w-0">
                <div className="font-body text-sm text-text-primary truncate">
                  {a.title}
                </div>
                <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary truncate">
                  {a.contract_ref}
                  {a.active === false && <span className="ml-2 text-danger">· inactive</span>}
                </div>
              </div>
              <div className="col-span-3 font-body text-sm text-text-secondary truncate">
                {orgById.get(a.organization_id)?.legal_name || (
                  <span className="text-text-tertiary">—</span>
                )}
              </div>
              <div
                className={`col-span-1 font-mono text-2xs uppercase tracking-widest-srs ${
                  SHIELD_TINT[a.shield_level] || "text-text-tertiary"
                }`}
              >
                {a.shield_level}
              </div>
              <div className="col-span-2 text-right">
                <div className="font-mono text-sm text-text-primary">
                  {formatMinutes(a.sla_spec?.resolve_minutes)}
                </div>
                <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                  recv {formatMinutes(a.sla_spec?.receive_minutes)}
                </div>
              </div>
              <div className="col-span-2 text-right">
                <div className="font-mono text-sm text-text-primary">
                  ${a.parts_approval_threshold_usd?.toFixed(2) || "—"}
                </div>
                <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                  {a.currency || "USD"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShieldCatalogCard({ level, sla }) {
  return (
    <div className="bg-surface-base rounded-sm p-3">
      <div
        className={`font-mono text-2xs uppercase tracking-widest-srs mb-1 ${
          SHIELD_TINT[level] || "text-text-tertiary"
        }`}
      >
        {level}
      </div>
      <div className="font-body text-sm space-y-0.5">
        <div>
          <span className="text-text-tertiary">recv</span>{" "}
          <span className="text-text-primary font-mono">
            {formatMinutes(sla.receive_minutes)}
          </span>
        </div>
        <div>
          <span className="text-text-tertiary">resolve</span>{" "}
          <span className="text-text-primary font-mono">
            {formatMinutes(sla.resolve_minutes)}
          </span>
        </div>
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-1.5">
          {sla.coverage_247 && "· 24×7 "}
          {sla.dedicated_coordinator && "· coord dedicado "}
          {sla.client_copilot_readonly && "· copilot RO"}
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

function formatMinutes(m) {
  if (m == null) return "—";
  if (m < 60) return `${m}m`;
  const hours = m / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return `${Math.round(days)}d`;
}
