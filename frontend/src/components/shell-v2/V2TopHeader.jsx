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
    <header className="px-6 py-4 border-b border-wr-border flex items-center justify-between flex-shrink-0 bg-wr-bg">
      <div className="flex items-center gap-5">
        <h1
          className="font-display text-[18px] font-semibold text-wr-text"
          style={{ letterSpacing: "0.02em" }}
        >
          {finalTitle && <span>{finalTitle} </span>}
          <span style={{ color: "#F59E0B" }}>{finalHighlight}</span>
        </h1>
      </div>

      <div className="flex items-center gap-4 text-[12px] text-wr-text-mid">
        <span className="font-mono">{dateTime}</span>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border"
          style={{
            borderColor: isRefreshing ? "rgba(245, 158, 11, 0.4)" : "rgba(34, 197, 94, 0.4)",
            background: isRefreshing ? "rgba(245, 158, 11, 0.10)" : "rgba(34, 197, 94, 0.10)",
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
              background: isRefreshing ? "#F59E0B" : "#22C55E",
              transition: "background 280ms ease",
            }}
          />
          <span
            className="font-mono font-semibold"
            style={{
              color: isRefreshing ? "#F59E0B" : "#22C55E",
              transition: "color 280ms ease",
            }}
          >
            {liveCount} {liveLabel}
          </span>
        </span>

        {/* User identity + logout · destrabar "logines que no son" */}
        <div className="flex items-center gap-2 pl-3 border-l border-wr-border">
          <span
            className="font-mono text-[11px] text-wr-text-mid"
            title={user?.email || ""}
            style={{ letterSpacing: "0.04em" }}
          >
            {displayName}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            className="inline-flex items-center justify-center w-7 h-7 rounded-sm border border-wr-border text-wr-text-mid hover:text-wr-amber hover:border-wr-amber transition"
          >
            <Icon icon={ICONS.logout} size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
