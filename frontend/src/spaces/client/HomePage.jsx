/**
 * Client Home · v2 paleta F (Iter 2.40).
 *
 * Hotel 5 estrellas personality: clean, professional, zero internal noise.
 * No audit_log, no internal threads, no coordinator details. Solo output.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useFetch } from "../../lib/useFetch";
import {
  ProjectStatusPill,
  WoStatusPill,
} from "../../components/v2-shared/Pills";
import { JAKARTA, MONO_CAPS } from "../../components/v2-shared/typography";

export default function ClientHome() {
  const { user } = useAuth();
  const { data: projects } = useFetch("/projects");
  const { data: workOrders } = useFetch("/work-orders?limit=100");

  const projs = projects || [];
  const wos = workOrders || [];

  const activeWOs = useMemo(
    () => wos.filter((w) => !["closed", "cancelled"].includes(w.status)),
    [wos]
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
      <div style={{ paddingLeft: 16, borderLeft: "3px solid #0A1628", marginBottom: 32 }}>
        <div style={{ ...MONO_CAPS, fontSize: 11, color: "#8B95A8", marginBottom: 6 }}>
          Status
        </div>
        <h1
          style={{
            fontFamily: JAKARTA,
            fontSize: 32,
            fontWeight: 800,
            color: "#0A1628",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {user?.full_name?.split(" ")[0] || "Cliente"}
        </h1>
        <p
          style={{
            fontFamily: JAKARTA,
            fontSize: 13.5,
            color: "#3D4A66",
            marginTop: 8,
            fontWeight: 500,
          }}
        >
          Tus engagements con SRS · updates en tiempo real
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <SnapshotCard label="Proyectos activos" value={projs.length} />
        <SnapshotCard label="Intervenciones activas" value={activeWOs.length} />
        <SnapshotCard
          label="Acciones pendientes"
          value={
            wos.filter(
              (w) => w.ball_in_court?.side === "client" && w.status === "resolved"
            ).length
          }
          hint="esperando tu sign-off"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 24,
        }}
      >
        <section>
          <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 12 }}>
            Proyectos
          </div>
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E5EC",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {projs.length === 0 && (
              <div style={{ padding: "20px 16px", ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
                — sin proyectos activos —
              </div>
            )}
            {projs.map((p, i) => (
              <div
                key={p.id}
                style={{
                  padding: "12px 16px",
                  borderBottom: i < projs.length - 1 ? "1px solid #F0F2F7" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
                      {p.code}
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
                      {p.title}
                    </div>
                  </div>
                  <ProjectStatusPill status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 12 }}>
            Intervenciones recientes
          </div>
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E5EC",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {wos.length === 0 && (
              <div style={{ padding: "20px 16px", ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
                — ninguna registrada —
              </div>
            )}
            {wos.slice(0, 10).map((w, i, arr) => (
              <Link
                key={w.id}
                to={`/client/ops/${w.id}`}
                style={{
                  display: "block",
                  padding: "12px 16px",
                  borderBottom: i < arr.length - 1 ? "1px solid #F0F2F7" : "none",
                  textDecoration: "none",
                  transition: "background 160ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FA")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
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
        </section>
      </div>

      <p style={{ marginTop: 32, ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
        Vista cliente · detalles operativos internos no se exponen acá
      </p>
    </div>
  );
}

function SnapshotCard({ label, value, hint }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        borderLeft: "3px solid #0A1628",
        borderRadius: 8,
        padding: "16px 20px",
      }}
    >
      <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 8 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: JAKARTA,
          fontSize: 36,
          fontWeight: 800,
          color: "#0A1628",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {hint && (
        <div
          style={{
            fontFamily: JAKARTA,
            fontSize: 12,
            color: "#8B95A8",
            marginTop: 8,
            fontWeight: 500,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
