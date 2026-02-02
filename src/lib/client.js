// src/lib/client.js

const TOKEN_KEY = "token";
const ROLE_KEY = "role";
const NAME_KEY = "name";

/* ---------------------------
   Storage helpers
---------------------------- */

export function saveAuth({ token, role, name }) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (role) localStorage.setItem(ROLE_KEY, role);
  if (name) localStorage.setItem(NAME_KEY, name);
}

export function saveToken(token) {
  // keep for backward compatibility
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole() {
  return localStorage.getItem(ROLE_KEY);
}

export function getName() {
  return localStorage.getItem(NAME_KEY);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(NAME_KEY);
}

export function logout(router) {
  clearAuth();
  if (router) router.replace("/login");
}

/* ---------------------------
   JWT decode (client-side only)
   Not for security, just UI info.
---------------------------- */
export function parseJwt(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;

    // Base64URL -> Base64
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/* ---------------------------
   API fetch helper
---------------------------- */
export async function apiFetch(url, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // If caller passes body as object, we JSON stringify it automatically
  let body = options.body;
  const isPlainObject =
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob);

  if (isPlainObject) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    body = JSON.stringify(body);
  } else {
    // If it's already a string (JSON) and user didn't set header, keep your default:
    if (typeof body === "string") {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }
  }

  const res = await fetch(url, { ...options, headers, body });

  // Try JSON first, else fallback to text
  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    data = await res.json().catch(() => null);
  } else {
    const text = await res.text().catch(() => "");
    data = text ? { error: text } : null;
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

/* ---------------------------
   Guard helper
---------------------------- */
export function requireAuthOrRedirect(router) {
  const token = getToken();
  if (!token && router) router.replace("/login");
  return token;
}

