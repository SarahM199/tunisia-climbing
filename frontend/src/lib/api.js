/*
  One wrapper around fetch() for the whole app.

  Why centralise this?
  - The token is read in exactly ONE place (getToken below).
  - Every request automatically gets the Authorization header.
  - FastAPI errors become normal JS Errors with a readable message.

  MIGRATION NOTE: to move to httpOnly cookies later you only change
  this file (drop the token helpers, add credentials: "include")
  and AuthContext.jsx. No page or component needs to change.
*/

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// The key we store the token under in localStorage
const TOKEN_KEY = "tc_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  // If we're sending a body it's JSON — EXCEPT for FormData, where the
  // browser must set Content-Type itself so it can add the multipart
  // boundary. Setting it manually breaks file uploads.
  if (
    options.body &&
    !headers["Content-Type"] &&
    !(options.body instanceof FormData)
  ) {
    headers["Content-Type"] = "application/json";
  }

  // Attach the login token if we have one.
  // This is what makes Depends(get_current_user) succeed on the backend.
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // 204 = success with no content (our DELETE endpoint)
  if (res.status === 204) return null;

  // Read the body once, then try to parse it as JSON
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    // FastAPI puts errors in "detail" — sometimes a string (our HTTPExceptions),
    // sometimes an array of validation problems (Pydantic). Handle both.
    let message = `Request failed (${res.status})`;
    const detail = data?.detail;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail) && detail[0]?.msg) {
      message = detail[0].msg;
    }
    throw new Error(message);
  }

  return data;
}
