/**
 * RequireSpace — route guard
 * Redirects unauthenticated users to /login, and users lacking the required
 * space to their preferred landing space (or to /no-access if none).
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

  const hasIt = user.memberships?.some((m) => m.space === space);
  if (!hasIt) {
    const preferred = preferredSpaceFor(user);
    return <Navigate to={preferred ? spaceToPath(preferred) : "/no-access"} replace />;
  }

  return children;
}
