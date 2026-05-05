/**
 * Tech Briefings today · v2 paleta F (Iter 2.40).
 *
 * Vista consolidada: estado por WO activo (sin briefing / assembled-pendiente
 * ack / acknowledged). Tap → WO detail para leer + ack.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatAge } from "../../components/ui/Badges";
import { WoStatusPill, SeverityPill } from "../../components/v2-shared/Pills";
import { JAKARTA, MONO_CAPS } from "../../components/v2-shared/typography";

export default function BriefingTodayPage() {
  const { user } = useAuth();
  const { data: wos, loading } = useFetch("/work-orders?limit=200");
  const [briefings, setBriefings] = useState({});
  const [loadingBriefings, setLoadingBriefings] = useState(false);

  const myActive = useMemo(() => {
    if (!wos) return [];
    return wos.filter(
      (w) =>
        w.assigned_tech_user_id === user?.id &&
        !["closed", "cancelled"].includes(w.status)
    );
  }, [wos, user]);

  useEffect(() => {
    if (!myActive.length) return;
    let alive = true;
    setLoadingBriefings(true);
    Promise.all(
      myActive.map((w) =>
        api
          .get(`/work-orders/${w.id}/briefing`)
          .then((b) => [w.id, b])
          .catch(() => [w.id, null])
      )
    ).then((entries) => {
      if (!alive) return;
      const m = {};
      for (const [k, v] of entries) m[k] = v;
      setBriefings(m);
      setLoadingBriefings(false);
    });
    return () => { alive = false; };
  }, [myActive]);

  return (
    <div>
      <div style={{ paddingLeft: 12, borderLeft: "3px solid #0A1628", marginBottom: 20 }}>
        <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.16em", marginBottom: 4 }}>
          Briefings
        </div>
        <h1
          style={{
            fontFamily: JAKARTA,
            fontSize: 22,
            fontWeight: 800,
            color: "#0A1628",
            letterSpacing: "-0.015em",
            lineHeight: 1.1,
          }}
        >
          Hoy · {myActive.length}{" "}
          <span style={{ color: "#3D4A66", fontWeight: 600 }}>
            activa{myActive.length === 1 ? "" : "s"}
          </span>
        </h1>
        <p style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 6 }}>
          Leer antes de en_route · Decision #8
        </p>
      </div>

      {loading && <Empty text="cargando…" />}
      {!loading && myActive.length === 0 && <Empty text="— sin trabajos activos —" />}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {myActive.map((w) => (
          <BriefingCard
            key={w.id}
            wo={w}
            briefing={briefings[w.id]}
            loading={loadingBriefings}
          />
        ))}
      </div>
    </div>
  );
}

function BriefingCard({ wo, briefing, loading }) {
  const exists = briefing?.exists;
  const acked = exists && briefing.status === "acknowledged";
  const assembled = exists && briefing.status === "assembled";

  const statusStyle = loading
    ? { dot: "#C8CDD8", color: "#8B95A8", label: "..." }
    : !exists
    ? { dot: "#C8CDD8", color: "#8B95A8", label: "sin briefing" }
    : acked
    ? { dot: "#16A34A", color: "#0A6131", label: "acknowledged" }
    : { dot: "#E8A33D", color: "#7E5212", label: "read + ack pendiente" };

  return (
    <Link
      to={`/tech/ops/${wo.id}`}
      style={{
        display: "block",
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        borderLeft: "3px solid #0A1628",
        borderRadius: 8,
        padding: 16,
        textDecoration: "none",
        transition: "background 160ms",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FA")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
              {wo.reference}
            </span>
            <SeverityPill severity={wo.severity} />
          </div>
          <div
            style={{
              fontFamily: JAKARTA,
              fontSize: 15,
              fontWeight: 700,
              color: "#0A1628",
              lineHeight: 1.2,
            }}
          >
            {wo.title}
          </div>
        </div>
        <span
          style={{
            ...MONO_CAPS,
            fontSize: 12,
            color: "#0A1628",
            letterSpacing: "0.12em",
            flexShrink: 0,
            fontWeight: 800,
          }}
        >
          →
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <WoStatusPill status={wo.status} />
        <span
          style={{
            ...MONO_CAPS,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 9.5,
            color: statusStyle.color,
            letterSpacing: "0.12em",
            fontWeight: 800,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusStyle.dot }} />
          {statusStyle.label}
        </span>
        {assembled && briefing.assembled_at && (
          <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em" }}>
            · assembled {formatAge(briefing.assembled_at)} ago
          </span>
        )}
        {acked && briefing.acknowledged_at && (
          <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em" }}>
            · acked {formatAge(briefing.acknowledged_at)} ago
          </span>
        )}
      </div>

      {assembled && briefing.coordinator_notes && (
        <div
          style={{
            marginTop: 10,
            background: "#F4F6F8",
            border: "1px solid #E2E5EC",
            borderRadius: 4,
            padding: "8px 12px",
          }}
        >
          <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginBottom: 4 }}>
            Nota del coord
          </div>
          <div
            style={{
              fontFamily: JAKARTA,
              fontSize: 13,
              color: "#0A1628",
              fontWeight: 500,
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {briefing.coordinator_notes}
          </div>
        </div>
      )}
    </Link>
  );
}

function Empty({ text }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        borderRadius: 8,
        padding: 20,
        fontFamily: JAKARTA,
        fontSize: 13.5,
        color: "#3D4A66",
        textAlign: "center",
        fontWeight: 500,
      }}
    >
      {text}
    </div>
  );
}
