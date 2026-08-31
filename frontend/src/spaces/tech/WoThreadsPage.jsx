/**
 * Tech WO Threads · chat con SRS desde la PWA (2026-06-08).
 *
 * Ruta /tech/ops/:wo_id/threads — el botón "Chat con SRS" del WoDetailPage
 * apuntaba aquí desde Iter 2.63h pero la ruta nunca se montó (link roto ·
 * redirigía a home). Es el canal WhatsApp-killer del tech: sin esto el tech
 * vuelve al chat externo.
 *
 * Reúsa ThreadsSection (misma pieza que el desktop SRS). El tech solo ve
 * el tab "shared" (internal es SRS-only por diseño · canSeeInternal=isSrs).
 */
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useFetch } from "../../lib/useFetch";
import ThreadsSection from "../../components/workorder/ThreadsSection";
import { JAKARTA, MONO_CAPS } from "../../components/v2-shared/typography";
import { formatWoCode } from "../../lib/woCode";

const NAVY = "#0A1628";
const BORDER = "#C8CDD8";

export default function WoThreadsPage() {
  const { t } = useTranslation("common");
  const { wo_id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: wo, loading, error } = useFetch(`/work-orders/${wo_id}`, {
    deps: [wo_id],
  });

  if (loading) return <Centered text={t("common.loading")} />;
  if (error) return <Centered text={`Error: ${error.message || error}`} danger />;
  if (!wo) return <Centered text="Work Order no encontrada" danger />;

  const isAssignedTech =
    !!user?.memberships?.some((m) => m.space === "tech_field") &&
    wo.assigned_tech_user_id === user?.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 40 }}>
      {/* Back + contexto del WO */}
      <button
        type="button"
        onClick={() => navigate(`/tech/ops/${wo_id}`)}
        style={{
          alignSelf: "flex-start",
          fontFamily: JAKARTA,
          fontSize: 13,
          fontWeight: 700,
          color: NAVY,
          background: "#FFFFFF",
          border: `1.5px solid ${BORDER}`,
          borderRadius: 8,
          padding: "8px 14px",
          cursor: "pointer",
        }}
      >
        ← {t("page_wo_detail.back_my_work")}
      </button>

      <div>
        <div style={{ ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
          {formatWoCode(wo)}
        </div>
        <h1
          style={{
            fontFamily: JAKARTA,
            fontSize: 19,
            fontWeight: 800,
            color: NAVY,
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
            margin: "4px 0 0 0",
          }}
        >
          {wo.title}
        </h1>
      </div>

      {/* Chat · shared thread con SRS (internal queda oculto · SRS-only) */}
      <ThreadsSection
        wo={wo}
        isSrs={false}
        isClient={false}
        isAssignedTech={isAssignedTech}
      />
    </div>
  );
}

function Centered({ text, danger }) {
  return (
    <div
      style={{
        minHeight: "50vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: JAKARTA,
        fontSize: 14,
        fontWeight: 600,
        color: danger ? "#DC2626" : "#8B95A8",
        textAlign: "center",
        padding: 24,
      }}
    >
      {text}
    </div>
  );
}
