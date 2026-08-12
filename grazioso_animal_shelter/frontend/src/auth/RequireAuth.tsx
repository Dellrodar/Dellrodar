import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { SESSION_EXPIRED_REASON, useAuth, type LoginRedirectState } from "./AuthContext";

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, isLoading, sessionExpired } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    const redirectState: LoginRedirectState = sessionExpired
      ? { from: location, reason: SESSION_EXPIRED_REASON }
      : { from: location };
    return <Navigate to="/login" state={redirectState} replace />;
  }

  return <>{children}</>;
};
