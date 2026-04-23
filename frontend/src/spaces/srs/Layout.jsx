/**
 * SRS Coordinators — Layout (desktop, war-room feel)
 * Foundation placeholder. Track B (Identity Sprint by space) will define the
 * full SRS personality — this is just the scaffolding that proves routing
 * and RBAC work end-to-end.
 */
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

// Nav v2 · Juan Z-e · vocabulario operacional
// Grupos visuales mantenidos en orden (el separator se dibuja por CSS)
const nav = [
  { to: "/srs",            label: "Operaciones",    end: true, accent: true },
  { to: "/srs/ops",        label: "Intervenciones" },
  { to: "/srs/projects",   label: "Proyectos" },
  { to: "/srs/sites",      label: "Sitios" },
  { to: "/srs/techs",      label: "Tecnicos" },
  { to: "/srs/agreements", label: "Contratos" },
  { to: "/srs/insights",   label: "Inteligencia" },
  { to: "/srs/finance",    label: "Finanzas" },
  { to: "/srs/admin",      label: "Admin" },
  { to: "/srs/overview",   label: "Overview clasico", muted: true },
];

export default function SrsLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen flex bg-surface-base">
      {/* Sidebar */}
      <aside className="w-56 bg-surface-raised border-r border-surface-border flex flex-col">
        <div className="px-5 py-5 accent-bar">
          <div className="label-caps">InsiteIQ</div>
          <div className="font-display text-lg text-text-primary">SRS Coordinators</div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => {
                const base =
                  "block px-3 py-2 rounded-sm font-body text-sm transition-all duration-fast ease-out-expo";
                if (isActive) {
                  return n.accent
                    ? `${base} bg-primary/10 text-primary-light border-l-2 border-primary pl-2.5`
                    : `${base} bg-surface-overlay text-text-primary`;
                }
                const color = n.muted
                  ? "text-text-tertiary hover:text-text-secondary"
                  : n.accent
                  ? "text-text-primary hover:text-primary-light"
                  : "text-text-secondary hover:text-text-primary";
                return `${base} ${color} hover:bg-surface-overlay/60`;
              }}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-surface-border">
          <div className="label-caps mb-0.5">Signed in</div>
          <div className="text-text-primary text-sm font-body truncate">
            {user?.full_name || user?.email}
          </div>
          <button
            onClick={() => navigate("/change-password")}
            className="mt-3 w-full text-left label-caps text-text-tertiary hover:text-primary"
          >
            Rotar password
          </button>
          <button
            onClick={handleLogout}
            className="mt-2 w-full text-left label-caps hover:text-primary"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
