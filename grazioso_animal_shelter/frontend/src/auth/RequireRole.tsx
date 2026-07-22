import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { Role } from "../api/auth";
import { useAuth } from "./AuthContext";
import { RequireAuth } from "./RequireAuth";

export const RequireRole = ({ allowed, children }: { allowed: Role[]; children: ReactNode }) => (
  <RequireAuth>
    <RoleCheck allowed={allowed}>{children}</RoleCheck>
  </RequireAuth>
);

const RoleCheck = ({ allowed, children }: { allowed: Role[]; children: ReactNode }) => {
  const { user } = useAuth();

  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
};
