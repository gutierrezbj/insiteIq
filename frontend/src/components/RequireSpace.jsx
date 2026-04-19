/**
 * RequireSpace — route guard
 * Redirects unauthenticated users to /login, users lacking the required space
 * to their preferred landing, and users with must_change_password=true to the
 * forced rotation page before they can touch any space.
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { preferredSpaceFor, spaceToPath } from "../lib/auth";

export default function RequireSpace({ space, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force rotation before any space is allowed in.
  if (user.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  const hasIt = user.memberships?.some((m) => m.space === space);
  if (!hasIt) {
    const preferred = preferredSpaceFor(user);
    return <Navigate to={preferred ? spaceToPath(preferred) : "/no-access"} replace />;
  }

  return children;
}
