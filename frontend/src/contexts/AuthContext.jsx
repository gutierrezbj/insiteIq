/**
 * InsiteIQ v1 Foundation — Auth context
 * Hydrates from localStorage on boot, listens to unauthorized events from the
 * API client, exposes login/logout + space helpers.
 *
 * must_change_password flag comes from /auth/me after login. The app uses it
 * to force a rotation page before letting the user touch any space.
 */
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  clearTokens,
  getStoredUser,
  setTokens,
  setStoredUser,
} from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // On boot, if we already have a user in storage, re-fetch /me so
    // must_change_password + full_name stay in sync with the server.
    let alive = true;
    async function hydrate() {
      const stored = getStoredUser();
      if (stored) {
        try {
          const me = await api.get("/auth/me");
          if (!alive) return;
          const merged = { ...stored, ...me };
          setStoredUser(merged);
          setUser(merged);
        } catch {
          // token invalid — api.js will already have cleared it
        }
      }
      if (alive) setReady(true);
    }
    hydrate();

    const handler = () => setUser(null);
    window.addEventListener("iiq:unauthorized", handler);
    return () => {
      alive = false;
      window.removeEventListener("iiq:unauthorized", handler);
    };
  }, []);

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password }, { auth: false });
    setTokens(res);
    // /login returns the trimmed profile; follow up with /me to pull flags
    // like must_change_password that are not in the login payload.
    let full = res.user;
    try {
      const me = await api.get("/auth/me");
      full = { ...res.user, ...me };
      setStoredUser(full);
    } catch {
      // Non-fatal; stick with the login payload
    }
    setUser(full);
    return full;
  }

  function logout() {
    clearTokens();
    setUser(null);
  }

  async function changePassword(current_password, new_password) {
    await api.post("/auth/change-password", { current_password, new_password });
    // Refresh /me so must_change_password flips to false in the UI
    try {
      const me = await api.get("/auth/me");
      const merged = { ...(user || {}), ...me };
      setStoredUser(merged);
      setUser(merged);
    } catch {
      // ignore
    }
  }

  const value = {
    user,
    ready,
    login,
    logout,
    changePassword,
    hasSpace: (s) => !!user?.memberships?.some((m) => m.space === s),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
