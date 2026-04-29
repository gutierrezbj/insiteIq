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

import { Outlet } from "react-router-dom";
import V2SidebarNav from "./V2SidebarNav";
import V2TopHeader from "./V2TopHeader";
import V2BottomStrip from "./V2BottomStrip";
import { RefreshProvider } from "../../contexts/RefreshContext";

export default function V2Shell({
  scope = "srs",
  organizationName,
  headerProps = {},
  showBottomStrip = true,
  buildSha,
  region,
}) {
  return (
    <RefreshProvider>
      <div
        className="h-screen flex bg-wr-bg text-wr-text font-mono"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        <V2SidebarNav
          scope={scope}
          organizationName={organizationName}
          buildSha={buildSha}
          region={region}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <V2TopHeader {...headerProps} />

          <main className="flex-1 overflow-auto wr-scroll">
            <Outlet />
          </main>

          {showBottomStrip && <V2BottomStrip />}
        </div>
      </div>
    </RefreshProvider>
  );
}
