/**
 * AuthImage — renders an image from an authed API endpoint.
 *
 * Browsers can't attach Authorization headers to <img src> loads. Since our
 * /api/uploads/:id requires a Bearer token, we fetch the bytes programmatically,
 * create an object URL, and use that as the img src. Revokes the URL on unmount
 * to avoid memory leaks.
 *
 * Usage:
 *   <AuthImage src="/api/uploads/abc" alt="..." className="..." />
 *
 * Accepts `thumb` boolean for small previews, otherwise renders full.
 */
import { useEffect, useState } from "react";
import { getAccessToken } from "../../lib/auth";

const BASE_URL = import.meta.env.VITE_API_BASE || "/api";

export default function AuthImage({
  src,
  alt,
  className = "",
  thumb = false,
  onClick,
}) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let createdUrl = null;

    async function load() {
      if (!src) return;
      setLoading(true);
      setError(null);
      try {
        // src may be absolute (/api/...) or path after BASE_URL. Normalize:
        const url = src.startsWith("http")
          ? src
          : src.startsWith("/api/")
          ? src // already full path — use as-is
          : `${BASE_URL}${src.startsWith("/") ? src : `/${src}`}`;
        const tok = getAccessToken();
        const res = await fetch(url, {
          headers: tok ? { Authorization: `Bearer ${tok}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (!alive) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      } catch (err) {
        if (alive) setError(err.message || "load failed");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src]);

  if (loading) {
    return (
      <div
        className={`bg-surface-overlay animate-pulse flex items-center justify-center font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary ${className}`}
      >
        …
      </div>
    );
  }
  if (error) {
    return (
      <div
        className={`bg-surface-overlay flex items-center justify-center font-mono text-2xs uppercase tracking-widest-srs text-danger ${className}`}
      >
        {error}
      </div>
    );
  }
  return (
    <img
      src={blobUrl}
      alt={alt || ""}
      onClick={onClick}
      className={`${className} ${onClick ? "cursor-pointer" : ""}`}
      loading={thumb ? "lazy" : undefined}
    />
  );
}
