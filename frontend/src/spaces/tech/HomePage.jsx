/**
 * Tech Home · v2 paleta F (Iter 2.40).
 *
 * PWA mobile-first. Lista de WOs asignadas activas + histórico reciente.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useFetch } from "../../lib/useFetch";
import { WoStatusPill, SeverityPill } from "../../components/v2-shared/Pills";
import { JAKARTA, MONO_CAPS } from "../../components/v2-shared/typography";
import i18n from "../../i18n";

export default function TechHome() {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const { data: wos, loading } = useFetch("/work-orders?limit=100");

  const myWos = useMemo(() => {
    if (!wos) return { active: [], done: [] };
    const mine = wos.filter((w) => w.assigned_tech_user_id === user?.id);
    const active = mine.filter((w) => !["closed", "cancelled"].includes(w.status));
    const done = mine.filter((w) => ["closed", "cancelled"].includes(w.status));
    return { active, done };
  }, [wos, user]);

  return (
    <div>
      <div style={{ paddingLeft: 12, borderLeft: "3px solid #0A1628", marginBottom: 20 }}>
        <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.16em", marginBottom: 4 }}>
          {t("page_tech.home_kicker")}
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
          {myWos.active.length}{" "}
          <span style={{ color: "#3D4A66", fontWeight: 600 }}>
            {t(myWos.active.length === 1 ? "page_tech.home_count_suffix_one" : "page_tech.home_count_suffix_other")}
          </span>
        </h1>
      </div>

      {myWos.active.length === 0 && !loading && (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E5EC",
            borderRadius: 8,
            padding: "20px",
            fontFamily: JAKARTA,
            fontSize: 13.5,
            color: "#3D4A66",
            fontWeight: 500,
          }}
        >
          {t("page_tech.home_empty")}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {myWos.active.map((w) => <ActiveJobCard key={w.id} wo={w} />)}
      </div>

      {myWos.done.length > 0 && (
        <section>
          <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 8 }}>
            {t("page_tech.home_section_recent")}
          </div>
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E5EC",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {myWos.done.slice(0, 5).map((w, i, arr) => (
              <div
                key={w.id}
                style={{
                  padding: "10px 14px",
                  borderBottom: i < arr.length - 1 ? "1px solid #F0F2F7" : "none",
                }}
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
              </div>
            ))}
          </div>
        </section>
      )}

      <p style={{ marginTop: 24, ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em" }}>
        {t("page_tech.home_footer")}
      </p>
    </div>
  );
}

function ActiveJobCard({ wo }) {
  const { t } = useTranslation("common");
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
        <span style={{ ...MONO_CAPS, fontSize: 12, color: "#0A1628", letterSpacing: "0.12em", flexShrink: 0, fontWeight: 800 }}>
          →
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <WoStatusPill status={wo.status} />
        {wo.deadline_resolve_at && (
          <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
            {t("page_tech.home_resolve_in", { time: formatDeadline(wo.deadline_resolve_at) })}
          </span>
        )}
      </div>
    </Link>
  );
}

function formatDeadline(iso) {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return "—";
  const delta = ts - Date.now();
  const past = delta < 0;
  const abs = Math.abs(delta);
  const hours = Math.floor(abs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (past) return days > 0 ? i18n.t("page_tech.deadline_overdue_days", { days }) : i18n.t("page_tech.deadline_overdue");
  if (hours < 24) return i18n.t("page_tech.deadline_hours", { hours });
  return i18n.t("page_tech.deadline_days", { days });
}
