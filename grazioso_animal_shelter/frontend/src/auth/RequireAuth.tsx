import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { SESSION_EXPIRED_REASON, useAuth, type LoginRedirectState } from "./AuthContext";

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, isLoading, sessionExpired } = useAuth();

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    const redirectState: LoginRedirectState | null = sessionExpired
      ? { reason: SESSION_EXPIRED_REASON }
      : null;
    return <Navigate to="/login" state={redirectState} replace />;
  }

  return <>{children}</>;
};
