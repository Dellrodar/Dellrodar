import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export const NavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">Grazioso Salvare</div>
      <div className="navbar-links">
        {user && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            {user.role === "admin" && <Link to="/admin">Admin Panel</Link>}
            <span className="navbar-user">
              {user.email} ({user.role})
            </span>
            <button type="button" onClick={handleLogout}>
              Log out
            </button>
          </>
        )}
        {!user && (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/signup">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
};
