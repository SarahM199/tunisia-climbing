import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, clearToken, getToken, setToken } from "../lib/api";

/*
  AuthContext holds "who is logged in" for the whole app.

  React Context = a way to share state without passing props down through
  every component. Any component can call useAuth() to get the current
  user, or the login/logout functions.

  On page load we check: is there a token in localStorage? If yes, ask the
  backend /auth/me "is this still valid, and who is it?" We don't trust the
  token blindly — it may have expired, or the account may be gone.
*/

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No token saved — nothing to check, we're just a guest
    if (!getToken()) {
      setLoading(false);
      return;
    }

    apiFetch("/auth/me")
      .then((data) => setUser(data))
      .catch(() => {
        // Token was invalid or expired — throw it away
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }

  async function register(email, displayName, password) {
    const data = await apiFetch("/auth/register", {
      method: "POST",
      // Backend expects snake_case: display_name
      body: JSON.stringify({ email, display_name: displayName, password }),
    });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    // Logging out is purely client-side: forget the token.
    // The token stays technically valid until it expires — that's normal
    // for JWTs. Revoking early would need a server-side blocklist.
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook so components call useAuth() instead of useContext(AuthContext)
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
