/**
 * InsiteIQ v1 Foundation — Auth context
 * Hydrates from localStorage on boot, listens to unauthorized events from the
 * API client, exposes login/logout + space helpers.
 */
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  clearTokens,
  getStoredUser,
  setTokens,
} from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    const handler = () => setUser(null);
    window.addEventListener("iiq:unauthorized", handler);
    return () => window.removeEventListener("iiq:unauthorized", handler);
  }, []);

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password }, { auth: false });
    setTokens(res);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    clearTokens();
    setUser(null);
  }

  const value = {
    user,
    ready,
    login,
    logout,
    hasSpace: (s) => !!user?.memberships?.some((m) => m.space === s),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
