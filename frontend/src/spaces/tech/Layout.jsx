/**
 * Tech Field PWA · Layout · v2 paleta F (Iter 2.40).
 *
 * Mobile-first. Header con brand + user · main con Outlet · bottom nav 4 tabs
 * (Jobs/Briefing/Profile/Sign out). Touch targets generosos.
 */
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const JAKARTA = "'Plus Jakarta Sans', sans-serif";
const MONO_CAPS = {
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#F4F6F8",
      }}
      className="safe-area-top safe-area-bottom"
    >
      <header
        style={{
          padding: "16px 20px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E5EC",
          borderLeft: "3px solid #0A1628",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.16em", marginBottom: 4 }}>
            InsiteIQ · Tech Field
          </div>
          <div
            style={{
              fontFamily: JAKARTA,
              fontSize: 16,
              fontWeight: 700,
              color: "#0A1628",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {user?.full_name || "Technician"}
          </div>
        </div>
        <button
          onClick={() => navigate("/change-password")}
          style={{
            ...MONO_CAPS,
            fontSize: 9.5,
            color: "#3D4A66",
            background: "transparent",
            border: "none",
            padding: "4px 0",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "color 160ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#0A1628")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#3D4A66")}
        >
          Rotar pwd
        </button>
      </header>

      <main style={{ flex: 1, overflow: "auto", padding: "20px" }}>
        <Outlet />
      </main>

      <nav
        style={{
          borderTop: "1px solid #E2E5EC",
          background: "#FFFFFF",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
        }}
      >
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            style={({ isActive }) => ({
              padding: "14px 4px",
              textAlign: "center",
              ...MONO_CAPS,
              fontSize: 10,
              color: isActive ? "#0A1628" : "#8B95A8",
              textDecoration: "none",
              borderTop: isActive ? "2px solid #0A1628" : "2px solid transparent",
              fontWeight: isActive ? 800 : 700,
              transition: "color 160ms, border-color 160ms",
            })}
          >
            {n.label}
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          style={{
            padding: "14px 4px",
            textAlign: "center",
            ...MONO_CAPS,
            fontSize: 10,
            color: "#8B95A8",
            background: "transparent",
            border: "none",
            borderTop: "2px solid transparent",
            cursor: "pointer",
            transition: "color 160ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#991B1B")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8B95A8")}
        >
          Sign out
        </button>
      </nav>
    </div>
  );
}
