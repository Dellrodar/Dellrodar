import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchCurrentUser, login as loginRequest, type User } from "../api/auth";
import { setUnauthorizedHandler } from "../api/client";
import { getTokenExpiryMs } from "./tokenUtils";

const TOKEN_STORAGE_KEY = "grazioso.token";

export const SESSION_EXPIRED_REASON = "session-expired";

export interface LoginRedirectState {
  from?: { pathname: string };
  reason?: typeof SESSION_EXPIRED_REASON;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    // Mark loading before the user fetch so route guards wait for the user
    // instead of bouncing a fresh login back to the login page.
    setIsLoading(true);

    (async () => {
      try {
        const currentUser = await fetchCurrentUser(token);
        if (cancelled) return;
        setUser(currentUser);
        setIsLoading(false);
      } catch {
        if (cancelled) return;
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await loginRequest(email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, access_token);
    setToken(access_token);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // The flag rides through context instead of a navigate() call here because
  // react-router wraps navigation in startTransition: the logout state change
  // would commit first and RequireAuth's redirect would drop the reason.
  // RequireAuth reads the flag and puts the reason into its own redirect state.
  const handleSessionExpired = useCallback(() => {
    console.warn("Session is no longer valid; signing out.");
    setSessionExpired(true);
    logout();
  }, [logout]);

  // Any authenticated request rejected with 401 means the token expired or was
  // revoked. Dropping the session here makes the route guards redirect to the
  // login page, preserving the location the user came from.
  useEffect(() => {
    setUnauthorizedHandler(handleSessionExpired);
    return () => setUnauthorizedHandler(null);
  }, [handleSessionExpired]);

  // Proactive sign-out at the token's exp time, so an idle user sees the
  // session-expired message instead of a silent 401 on their next click.
  // A token without a readable exp claim falls back to the 401 path above.
  useEffect(() => {
    if (!token) return undefined;
    const expiresAtMs = getTokenExpiryMs(token);
    if (expiresAtMs === null) return undefined;

    const msUntilExpiry = expiresAtMs - Date.now();
    if (msUntilExpiry <= 0) {
      handleSessionExpired();
      return undefined;
    }

    const timerId = setTimeout(handleSessionExpired, Math.min(msUntilExpiry, 2 ** 31 - 1));
    return () => clearTimeout(timerId);
  }, [token, handleSessionExpired]);

  const value = useMemo(
    () => ({ user, token, isLoading, sessionExpired, login, logout }),
    [user, token, isLoading, sessionExpired, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
