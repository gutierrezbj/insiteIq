/**
 * Client Coordinator — Layout
 * Foundation placeholder. Track B will define the client-facing personality
 * (clean, professional, confidence-inspiring, ZERO internal noise).
 */
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const nav = [
  { to: "/client", label: "Status", end: true },
  { to: "/client/tickets", label: "Tickets" },
  { to: "/client/deliverables", label: "Deliverables" },
];

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
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
