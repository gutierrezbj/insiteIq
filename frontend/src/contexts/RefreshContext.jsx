/**
 * RefreshContext — pulso compartido entre páginas v2 y el TopHeader.
 *
 * Cualquier página v2 (CockpitPage, EspacioOpsPage, KanbanPage) puede llamar
 * a `markRefreshing()` antes de un fetch y `markFresh()` cuando termina.
 * El TopHeader lee `isRefreshing` y `lastRefreshAt` para mostrar:
 *   - Pulse-dot verde si fresh
 *   - Pulse-dot amber si refrescando
 *   - Tooltip con "Última sincronización: hace Xs"
 *
 * No requiere reducer ni librería de state — solo useState + useCallback.
 */

import { createContext, useCallback, useContext, useState } from "react";

const RefreshCtx = createContext({
  isRefreshing: false,
  lastRefreshAt: null,
  markRefreshing: () => {},
  markFresh: () => {},
});

export function RefreshProvider({ children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState(null);

  const markRefreshing = useCallback(() => setIsRefreshing(true), []);
  const markFresh = useCallback(() => {
    setIsRefreshing(false);
    setLastRefreshAt(Date.now());
  }, []);

  return (
    <RefreshCtx.Provider value={{ isRefreshing, lastRefreshAt, markRefreshing, markFresh }}>
      {children}
    </RefreshCtx.Provider>
  );
}

export function useRefresh() {
  return useContext(RefreshCtx);
}

/* Helper para formatear "hace Xs" desde un timestamp */
export function formatAgo(timestamp) {
  if (!timestamp) return "—";
  const diffMs = Date.now() - timestamp;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) return "ahora";
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
}
