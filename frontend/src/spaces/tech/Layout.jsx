/**
 * Tech Field PWA — Layout (mobile-first, offline-capable target)
 * Foundation placeholder. Track B will define the field personality
 * (high-contrast, large touch targets, Copilot briefing first).
 */
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const nav = [
  { to: "/tech", label: "Jobs", end: true },
  { to: "/tech/briefing", label: "Briefing" },
  { to: "/tech/profile", label: "Profile" },
];

export default function TechLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-base safe-area-top safe-area-bottom">
      <header className="px-5 py-4 bg-surface-raised border-b border-surface-border accent-bar">
        <div className="label-caps">InsiteIQ · Tech Field</div>
        <div className="font-display text-base text-text-primary truncate">
          {user?.full_name || "Technician"}
        </div>
      </header>

      <main className="flex-1 overflow-auto px-5 py-5">
        <Outlet />
      </main>

      <nav className="border-t border-surface-border bg-surface-raised grid grid-cols-4">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `py-3 text-center label-caps transition-colors duration-fast ${
                isActive ? "text-primary" : "text-text-tertiary"
              }`
            }
          >
            {n.label}
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="py-3 text-center label-caps text-text-tertiary hover:text-primary"
        >
          Sign out
        </button>
      </nav>
    </div>
  );
}
