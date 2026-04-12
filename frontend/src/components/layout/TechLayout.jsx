import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ClipboardList, User, LogOut } from "lucide-react";

const NAV = [
  { to: "/tech", icon: ClipboardList, label: "Trabajos" },
  { to: "/tech/profile", icon: User, label: "Perfil" },
];

export default function TechLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-sticky bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-6 rounded-full bg-primary" />
          <span className="font-display font-semibold text-sm tracking-tight">InsiteIQ</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-mono">{user?.name}</span>
          <button
            onClick={logout}
            className="p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-fast"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-sticky bg-white border-t border-gray-200 safe-area-bottom">
        <div className="flex justify-around py-2">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/tech"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-1 rounded-md transition-colors duration-fast ${
                  isActive
                    ? "text-primary font-semibold"
                    : "text-gray-400 hover:text-gray-600"
                }`
              }
            >
              <Icon size={22} />
              <span className="text-2xs">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
