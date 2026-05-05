/**
 * SRS Service Agreements · list (Iter 2.23 · paleta F NAVEGANTE).
 *
 * Migración v1 amber legacy → v2 paleta F usando v2-shared.
 * Decision #3 Modo 1: Shield level vive en service_agreement, snapshot al
 * work_order.intake. Un cliente puede tener múltiples agreements con
 * shield distintos.
 *
 * Endpoints:
 *   GET /api/service-agreements
 *   GET /api/service-agreements/shield-levels (catalog)
 *   GET /api/organizations
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../../../lib/useFetch";
import { ShieldPill } from "../../../components/v2-shared/Pills";
import { JAKARTA, MONO_CAPS } from "../../../components/v2-shared/typography";

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
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      {/* Header */}
      <div
        style={{
          paddingLeft: 16,
          borderLeft: "3px solid #0A1628",
          marginBottom: 22,
        }}
      >
        <div style={{ ...MONO_CAPS, fontSize: 11, color: "#8B95A8", marginBottom: 6 }}>
          Service Agreements
        </div>
        <h1
          style={{
            fontFamily: JAKARTA,
            fontSize: 28,
            fontWeight: 800,
            color: "#0A1628",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {list.length} <span style={{ color: "#3D4A66", fontWeight: 600 }}>contratos activos</span>
        </h1>
        <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", marginTop: 6, fontWeight: 500 }}>
          Shield snapshot al intake — Decision #3 Modo 1. SLA por work_order se fija acá.
        </p>
      </div>

      {/* Shield catalog reference */}
      {shieldCatalog?.levels && (
        <section
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E5EC",
            borderLeft: "3px solid #0A1628",
            borderRadius: 6,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 14 }}>
            Shield catalog · SLA defaults
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {Object.entries(shieldCatalog.levels).map(([level, sla]) => (
              <ShieldCatalogCard key={level} level={level} sla={sla} />
            ))}
          </div>
        </section>
      )}

      {/* Filter */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E5EC",
          borderLeft: "3px solid #0A1628",
          borderRadius: 6,
          padding: 14,
          marginBottom: 16,
          display: "flex",
          alignItems: "flex-end",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <label
            htmlFor="sfilter"
            style={{ ...MONO_CAPS, display: "block", fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}
          >
            Shield
          </label>
          <select
            id="sfilter"
            value={shieldFilter}
            onChange={(e) => setShieldFilter(e.target.value)}
            style={{
              height: 32,
              border: "1px solid #C8CDD8",
              borderRadius: 6,
              padding: "0 10px",
              fontFamily: JAKARTA,
              fontSize: 13,
              fontWeight: 500,
              color: "#0A1628",
              background: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">todos</option>
            <option value="bronze">bronze</option>
            <option value="bronze_plus">bronze_plus</option>
            <option value="silver">silver</option>
            <option value="gold">gold</option>
          </select>
        </div>
        <div
          style={{
            marginLeft: "auto",
            ...MONO_CAPS,
            fontSize: 11,
            color: "#0A1628",
            letterSpacing: "0.14em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span style={{ fontWeight: 800 }}>{filtered.length}</span>{" "}
          <span style={{ color: "#8B95A8" }}>/ {list.length}</span>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E5EC",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(10, 22, 40, 0.05)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "4fr 3fr 2fr 2fr 2fr",
            gap: 12,
            padding: "12px 18px",
            background: "#F4F6F8",
            borderBottom: "1px solid #E2E5EC",
            ...MONO_CAPS,
            fontSize: 10,
            color: "#3D4A66",
            letterSpacing: "0.14em",
          }}
        >
          <div>Contract</div>
          <div>Client</div>
          <div>Shield</div>
          <div style={{ textAlign: "right" }}>SLA resolve</div>
          <div style={{ textAlign: "right" }}>Threshold</div>
        </div>

        {loading && <Empty text="cargando…" />}
        {!loading && filtered.length === 0 && <Empty text="— nada match —" />}
        {filtered.map((a) => (
          <Link
            key={a.id}
            to={`/srs/agreements/${a.id}`}
            style={{
              display: "grid",
              gridTemplateColumns: "4fr 3fr 2fr 2fr 2fr",
              gap: 12,
              padding: "14px 18px",
              borderBottom: "1px solid #E2E5EC",
              alignItems: "center",
              textDecoration: "none",
              transition: "background 160ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FA")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0A1628",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {a.title}
              </div>
              <div
                style={{
                  ...MONO_CAPS,
                  fontSize: 9.5,
                  color: "#8B95A8",
                  letterSpacing: "0.12em",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {a.contract_ref}
                {a.active === false && (
                  <span style={{ marginLeft: 8, color: "#DC2626" }}>· inactive</span>
                )}
              </div>
            </div>
            <div
              style={{
                fontFamily: JAKARTA,
                fontSize: 13,
                color: "#3D4A66",
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {orgById.get(a.organization_id)?.legal_name || (
                <span style={{ color: "#8B95A8" }}>—</span>
              )}
            </div>
            <div>
              <ShieldPill level={a.shield_level} />
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0A1628",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatMinutes(a.sla_spec?.resolve_minutes)}
              </div>
              <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em" }}>
                recv {formatMinutes(a.sla_spec?.receive_minutes)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0A1628",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ${a.parts_approval_threshold_usd?.toFixed(2) || "—"}
              </div>
              <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em" }}>
                {a.currency || "USD"}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ShieldCatalogCard({ level, sla }) {
  return (
    <div
      style={{
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        padding: 12,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <ShieldPill level={level} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em" }}>recv</span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
              color: "#0A1628",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatMinutes(sla.receive_minutes)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em" }}>resolve</span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
              color: "#0A1628",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatMinutes(sla.resolve_minutes)}
          </span>
        </div>
      </div>
      <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 8 }}>
        {sla.coverage_247 && "· 24×7 "}
        {sla.dedicated_coordinator && "· coord ded "}
        {sla.client_copilot_readonly && "· copilot RO"}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={{ padding: "20px 18px", ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
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
