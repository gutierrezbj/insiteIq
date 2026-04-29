/**
 * Client Coordinator — Layout
 *
 * Soporta dos shells:
 *   - v1 (legacy): header horizontal con nav inline (placeholder original)
 *   - v2 (DS v1.7 scope=client): V2Shell dark con sidebar + páginas v2
 *
 * Toggle:
 *   - env var: VITE_V2_SHELL=1
 *   - query param: ?v2=1
 *
 * Default v1 hasta que Rackel/Adrian valide v2.
 */
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import V2Shell from "../../components/shell-v2/V2Shell";
import { getClientOrgId } from "../../lib/scope";

// Nav client v2 · Cockpit-first (principio #1 refined)
// OPERATIVO transparente · COMERCIAL opaco
const nav = [
  { to: "/client",              label: "Operaciones", end: true },
  { to: "/client/status",       label: "Status clasico" },
  { to: "/client/tickets",      label: "Tickets" },
  { to: "/client/deliverables", label: "Entregables" },
];

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  // v2 toggle (mismo patrón que SrsLayout)
  const envV2 = import.meta.env.VITE_V2_SHELL === "1";
  const queryV2 = new URLSearchParams(location.search).get("v2") === "1";
  // Las rutas /client/espacio-ops y /client/intervenciones son v2-only.
  // Si el viewer está ahí, fuerza v2 shell aunque no haya ?v2=1.
  const isV2OnlyRoute =
    location.pathname.startsWith("/client/espacio-ops") ||
    location.pathname.startsWith("/client/intervenciones");
  const useV2Shell = envV2 || queryV2 || isV2OnlyRoute;

  if (useV2Shell) {
    // El nombre de la organización del client coordinator. Si no podemos
    // derivarlo del user, usamos el placeholder.
    const orgId = getClientOrgId(user);
    const orgName = user?.organization_name || (orgId ? "Workspace" : "Cliente");
    return (
      <V2Shell
        scope="client"
        organizationName={orgName}
        headerProps={{ liveCount: 0, liveLabel: "activas" }}
        showBottomStrip={false}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <header className="border-b border-surface-border bg-surface-raised">
        <div className="max-w-wide mx-auto flex items-center px-6 py-4">
          <div className="accent-bar pl-3">
            <div className="label-caps">InsiteIQ · Client</div>
            <div className="font-display text-lg text-text-primary">
              {user?.memberships?.find((m) => m.space === "client_coordinator")?.organization_id
                ? "Your workspace"
                : "Client Portal"}
            </div>
          </div>

          <nav className="ml-10 flex gap-5">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `font-body text-sm pb-1 border-b-2 transition-colors duration-fast ${
                    isActive
                      ? "text-text-primary border-primary"
                      : "text-text-secondary border-transparent hover:text-text-primary"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <div className="label-caps">Signed in</div>
              <div className="text-text-primary text-sm font-body">
                {user?.full_name || user?.email}
              </div>
            </div>
            <button
              onClick={() => navigate("/change-password")}
              className="label-caps text-text-tertiary hover:text-primary"
            >
              Rotar pwd
            </button>
            <button onClick={handleLogout} className="label-caps hover:text-primary">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-wide mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
