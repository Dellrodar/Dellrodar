import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Link, NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/grazioso-logo.png";
import { useAuth } from "../auth/AuthContext";

const navButtonSx = {
  color: "text.primary",
  "&.active": { color: "primary.main" },
};

export const NavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: "divider" }}
    >
      <Toolbar sx={{ gap: 1.5 }}>
        <Box
          component={Link}
          to={user ? "/dashboard" : "/login"}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mr: "auto",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <Avatar src={logo} alt="" sx={{ width: 36, height: 36, bgcolor: "#ffffff" }} />
          <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
            Grazioso Salvare
          </Typography>
        </Box>
        {user ? (
          <>
            <Button component={NavLink} to="/dashboard" sx={navButtonSx}>
              Dashboard
            </Button>
            {(user.role === "staff" || user.role === "admin") && (
              <>
                <Button component={NavLink} to="/animals/new" sx={navButtonSx}>
                  Add Animal
                </Button>
                <Button component={NavLink} to="/animals/manage" sx={navButtonSx}>
                  Manage Animals
                </Button>
              </>
            )}
            {user.role === "admin" && (
              <Button component={NavLink} to="/admin" sx={navButtonSx}>
                Admin Panel
              </Button>
            )}
            <Chip label={`${user.email} (${user.role})`} variant="outlined" size="small" />
            <Button variant="outlined" onClick={handleLogout}>
              Log out
            </Button>
          </>
        ) : (
          <>
            <Button component={NavLink} to="/login" sx={navButtonSx}>
              Log in
            </Button>
            <Button component={Link} to="/signup" variant="contained" disableElevation>
              Sign up
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};
