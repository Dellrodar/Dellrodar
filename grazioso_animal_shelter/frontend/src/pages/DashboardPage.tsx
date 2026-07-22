import { useAuth } from "../auth/AuthContext";

export const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p>
        Welcome, {user?.email}. You are signed in as {user?.role}.
      </p>

      <div className="notice">
        Animal search, rescue-profile matching, breed charts, and the location map are part of a
        later enhancement (Database and Algorithm work) and are not implemented yet. This page is a
        placeholder confirming the authenticated, role-based shell is working end to end.
      </div>
    </div>
  );
};
