import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";

export const ForbiddenPage = () => {
  usePageTitle("Forbidden");

  return (
    <div className="page">
      <h1>403 — Forbidden</h1>
      <p>You do not have permission to view this page.</p>
      <Link to="/dashboard">Back to dashboard</Link>
    </div>
  );
};
