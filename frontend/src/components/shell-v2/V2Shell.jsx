/**
 * V2Shell — Wrapper del shell SRS dark completo
 *
 * Compone los 3 pilares del layout v2:
 *   - V2SidebarNav (izq, 200px)
 *   - V2TopHeader (top, variant cockpit por default)
 *   - Main content via <Outlet />
 *   - V2BottomStrip (opcional, solo cockpit · suprimible vía prop)
 *
 * Design System v1.7 §4.
 *
 * Props:
 * - headerProps: objeto pasado a V2TopHeader (title, highlight, liveCount, liveLabel)
 * - showBottomStrip: bool · default true · War Room y otras vistas lo suprimen
 * - buildSha / region: pasados al sidebar footer
 */

import { Outlet, useLocation } from "react-router-dom";
import V2SidebarNav from "./V2SidebarNav";
import V2TopHeader from "./V2TopHeader";
import V2BottomStrip from "./V2BottomStrip";
import { RefreshProvider } from "../../contexts/RefreshContext";

/**
 * Rutas v2 nativas ("cockpit-like"): mantienen header full con h1 navy del
 * V2TopHeader y muestran V2BottomStrip (técnicos en pista). Las demás rutas
 * son v1 legacy viviendo dentro del shell — ahí el header pasa a compact
 * (sin h1 izq, evita choque con el h1 amber legacy de la página) y se
 * suprime el bottom strip (estorba en Admin/Finance/Inteligencia).
 *
 * Iter 2.20 fix shell quirúrgico (2026-05-04 firma owner).
 */
const COCKPIT_LIKE_EXACT = new Set(["/srs", "/srs/", "/client", "/client/"]);
const COCKPIT_LIKE_PREFIXES = [
  "/srs/espacio-ops",
  "/srs/intervenciones",
  "/srs/rollouts",
  "/srs/ops",
  "/client/espacio-ops",
  "/client/intervenciones",
  "/client/ops",
];
function isCockpitLikeRoute(pathname) {
  if (COCKPIT_LIKE_EXACT.has(pathname)) return true;
  return COCKPIT_LIKE_PREFIXES.some((p) => pathname.startsWith(p));
}

export default function V2Shell({
  scope = "srs",
  organizationName,
  headerProps = {},
  showBottomStrip,
  buildSha,
  region,
}) {
  const location = useLocation();
  const cockpit = isCockpitLikeRoute(location.pathname);
  const finalShowBottomStrip = showBottomStrip ?? cockpit;
  const compact = !cockpit;

  return (
    <RefreshProvider>
      <div
        className="h-screen flex bg-cl-bg text-cl-text font-mono"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        <V2SidebarNav
          scope={scope}
          organizationName={organizationName}
          buildSha={buildSha}
          region={region}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <V2TopHeader compact={compact} {...headerProps} />

          <main className="flex-1 overflow-auto wr-scroll">
            <Outlet />
          </main>

          {finalShowBottomStrip && <V2BottomStrip />}
        </div>
      </div>
    </RefreshProvider>
  );
}
