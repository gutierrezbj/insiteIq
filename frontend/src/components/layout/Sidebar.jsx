import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  Users,
  ClipboardList,
  BookOpen,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/sites", icon: MapPin, label: "Sites" },
  { to: "/technicians", icon: Users, label: "Technicians" },
  { to: "/interventions", icon: ClipboardList, label: "Interventions" },
  { to: "/kb", icon: BookOpen, label: "Knowledge Base" },
  { to: "/ai-ops", icon: Sparkles, label: "AI Operations" },
];

export default function Sidebar() {
  const { logout, user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-surface-raised border-r border-surface-border flex flex-col">
      <div className="p-4 border-b border-surface-border">
        <h1 className="text-lg font-bold text-text-primary font-display tracking-tight">InsiteIQ</h1>
        <p className="label-caps mt-0.5">{user?.name || "Coordinator"}</p>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-fast ease-out-expo ${
                isActive
                  ? "bg-primary-muted text-primary-light accent-bar"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-overlay"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-surface-border">
        <button
          onClick={logout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-text-secondary hover:text-danger hover:bg-surface-overlay w-full transition-all duration-fast ease-out-expo"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
