/**
 * V2TopHeader — Header del Cockpit (variant "cockpit")
 *
 * Extraído 1:1 de `mocks/insiteiq_cockpit_srs_dark_v2_static.html`.
 * Design System v1.7 §4.1.
 *
 * Estructura:
 * - Izq: título "COCKPIT DE <HIGHLIGHT>" con la palabra highlight en amber
 * - Der: fecha+hora live + pill verde con counter live
 *
 * Props:
 * - title: primera parte del título ("COCKPIT DE")
 * - highlight: segunda parte en amber ("OPERACIONES")
 * - liveCount: número del pill live (default 0)
 * - liveLabel: label del pill (default "activas")
 */

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { VIEWER_TZ, VIEWER_TZ_LABEL } from "../../lib/tz";
import { useRefresh, formatAgo } from "../../contexts/RefreshContext";
import { useAuth } from "../../contexts/AuthContext";
import { Icon, ICONS } from "../../lib/icons";

function formatDateTime() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("es-ES", {
    timeZone: VIEWER_TZ,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  // Es-ES devuelve "vie, 24 abr, 18:32" → ajustamos separador final a " · "
  return fmt.replace(/,\s*(\d{2}:\d{2})$/, " · $1");
}

/**
 * Decide title + highlight según ruta. El highlight es la palabra que va en
 * amber dentro del título.
 */
function getTitleForPath(pathname) {
  if (pathname.startsWith("/srs/espacio-ops"))    return { title: "ESPACIO",        highlight: "OPS" };
  if (pathname.startsWith("/srs/ops"))            return { title: "",               highlight: "INTERVENCIONES" };
  if (pathname.startsWith("/srs/intervenciones")) return { title: "",               highlight: "INTERVENCIONES" };
  if (pathname.startsWith("/srs/projects"))       return { title: "",               highlight: "PROYECTOS" };
  if (pathname.startsWith("/srs/sites"))          return { title: "",               highlight: "SITIOS" };
  if (pathname.startsWith("/srs/techs"))          return { title: "",               highlight: "TÉCNICOS" };
  if (pathname.startsWith("/srs/agreements"))     return { title: "",               highlight: "CONTRATOS" };
  if (pathname.startsWith("/srs/insights"))       return { title: "",               highlight: "INTELIGENCIA" };
  if (pathname.startsWith("/srs/finance"))        return { title: "",               highlight: "FINANZAS" };
  if (pathname.startsWith("/srs/admin"))          return { title: "",               highlight: "ADMIN" };
  return { title: "COCKPIT DE", highlight: "OPERACIONES" };
}

export default function V2TopHeader({
  title,
  highlight,
  liveCount = 0,
  liveLabel = "activas",
  compact = false,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const auto = getTitleForPath(location.pathname);
  // Props explícitas tienen prioridad. Si no, deriva de la ruta.
  const finalTitle = title ?? auto.title;
  const finalHighlight = highlight ?? auto.highlight;
  const [dateTime, setDateTime] = useState(formatDateTime());
  const { isRefreshing, lastRefreshAt } = useRefresh();
  const { user, logout } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => setDateTime(formatDateTime()), 30000);
    return () => clearInterval(interval);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  // Display name: prefer full_name, fallback al local-part del email.
  const displayName = user?.full_name || user?.email?.split("@")[0] || "—";

  return (
    // Header band: bg blanco con gradient sutil + border-bottom navy strong 2px PRESENCIA
    // Replicates mock F: linear-gradient(180deg, #FFFFFF 0%, #F7F8FA 100%) + bottom border navy 2px.
    <header
      className="px-6 py-4 flex items-center justify-between flex-shrink-0"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #F7F8FA 100%)",
        borderBottom: "2px solid #0A1628",
      }}
    >
      {compact ? (
        // Modo compact: en rutas v1 legacy la página interna pinta su propio h1.
        // V2TopHeader cede el lado izq (spacer) para evitar el choque visual.
        <div />
      ) : (
        <div className="flex items-center gap-5">
          {/* Highlight ahora navy strong (no amber) — autoridad serena, paleta F */}
          <h1
            className="font-jakarta text-[18px] font-semibold"
            style={{ letterSpacing: "0.02em", color: "#0A1628" }}
          >
            {finalTitle && (
              <span style={{ color: "#3D4A66", fontWeight: 500 }}>{finalTitle} </span>
            )}
            <span style={{ color: "#0A1628", fontWeight: 800 }}>{finalHighlight}</span>
          </h1>
        </div>
      )}

      <div className="flex items-center gap-4 text-[12px] text-cl-text-mid">
        <span className="font-mono" style={{ color: "#3D4A66", fontWeight: 500 }}>{dateTime}</span>
        {/* Pill live: weight bold + texto navy strong, no amber */}
        <span
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border"
          style={{
            borderColor: isRefreshing ? "#E8A33D" : "#16A34A",
            background: isRefreshing ? "#FCF1DC" : "#D9F1E5",
            transition: "border-color 280ms ease, background 280ms ease",
          }}
          title={
            isRefreshing
              ? "Sincronizando con servidor…"
              : `Última sincronización: ${formatAgo(lastRefreshAt)}`
          }
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
            style={{
              background: isRefreshing ? "#E8A33D" : "#16A34A",
              transition: "background 280ms ease",
            }}
          />
          <span
            className="font-jakarta font-bold"
            style={{
              color: isRefreshing ? "#7E5212" : "#0A6131",
              fontSize: 12,
              transition: "color 280ms ease",
            }}
          >
            {liveCount} {liveLabel}
          </span>
        </span>

        {/* User identity + logout · presencia navy strong, hover orange (acento escaso) */}
        <div className="flex items-center gap-2 pl-3 border-l border-cl-border-strong">
          <span
            className="font-jakarta text-[12px]"
            title={user?.email || ""}
            style={{ color: "#0A1628", fontWeight: 600, letterSpacing: "0.01em" }}
          >
            {displayName}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            className="inline-flex items-center justify-center w-8 h-8 rounded-sm border transition"
            style={{
              background: "#FFFFFF",
              borderColor: "#C8CDD8",
              color: "#3D4A66",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#FFE5DA";
              e.currentTarget.style.borderColor = "#FF6B35";
              e.currentTarget.style.color = "#FF6B35";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#FFFFFF";
              e.currentTarget.style.borderColor = "#C8CDD8";
              e.currentTarget.style.color = "#3D4A66";
            }}
          >
            <Icon icon={ICONS.logout} size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
