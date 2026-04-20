/**
 * InsiteIQ v1 Foundation — API client
 * Thin fetch wrapper. Injects JWT, parses JSON, surfaces errors uniformly.
 * No axios dep — native fetch keeps the bundle tight for the PWA.
 */

import { getAccessToken, clearTokens } from "./auth";

const BASE_URL = import.meta.env.VITE_API_BASE || "/api";

async function request(path, { method = "GET", body, headers = {}, auth = true } = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const h = { "Content-Type": "application/json", ...headers };
  if (auth) {
    const tok = getAccessToken();
    if (tok) h.Authorization = `Bearer ${tok}`;
  }

  const res = await fetch(url, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    clearTokens();
    window.dispatchEvent(new CustomEvent("iiq:unauthorized"));
  }

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const msg = isJson && payload?.detail ? payload.detail : `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, payload);
  }
  return payload;
}

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  patch: (path, body, opts) => request(path, { ...opts, method: "PATCH", body }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};

/**
 * uploadFile — multipart/form-data, JWT-authed.
 * Returns server payload: { id, url, filename, size_bytes, mime_type, kind }.
 * Use the returned `url` (e.g. "/api/uploads/:id") to reference the asset;
 * GET to that URL requires the same auth token.
 */
export async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const tok = getAccessToken();
  const res = await fetch(`${BASE_URL}/uploads`, {
    method: "POST",
    headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    body: fd,
  });
  if (res.status === 401) {
    clearTokens();
    window.dispatchEvent(new CustomEvent("iiq:unauthorized"));
  }
  const isJson = (res.headers.get("content-type") || "").includes(
    "application/json"
  );
  const payload = isJson ? await res.json().catch(() => null) : await res.text();
  if (!res.ok) {
    const msg = isJson && payload?.detail ? payload.detail : `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, payload);
  }
  return payload;
}
