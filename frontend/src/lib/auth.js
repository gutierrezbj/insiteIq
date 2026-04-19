/**
 * InsiteIQ v1 Foundation — Auth token storage
 * Tokens in localStorage. Minimal helpers, no JWT decode on the client —
 * the /auth/me endpoint is the source of truth for membership & authority.
 */

const ACCESS_KEY = "iiq:access";
const REFRESH_KEY = "iiq:refresh";
const USER_KEY = "iiq:user";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setTokens({ access_token, refresh_token, user }) {
  if (access_token) localStorage.setItem(ACCESS_KEY, access_token);
  if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Persist the user profile blob only (keeps tokens untouched). */
export function setStoredUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Pick the preferred landing space for a user.
 * SRS > Tech > Client (priority reflects how often each role lands on the home).
 */
export function preferredSpaceFor(user) {
  if (!user?.memberships?.length) return null;
  const spaces = user.memberships.map((m) => m.space);
  if (spaces.includes("srs_coordinators")) return "srs_coordinators";
  if (spaces.includes("tech_field")) return "tech_field";
  if (spaces.includes("client_coordinator")) return "client_coordinator";
  return null;
}

export function spaceToPath(space) {
  return {
    srs_coordinators: "/srs",
    client_coordinator: "/client",
    tech_field: "/tech",
  }[space];
}
