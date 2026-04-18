/**
 * Simple useFetch hook on top of lib/api.
 * Returns { data, loading, error, reload }.
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export function useFetch(path, { auto = true, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(auto);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.get(path);
      setData(r);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  useEffect(() => {
    if (auto) load();
  }, [auto, load]);

  return { data, loading, error, reload: load };
}
