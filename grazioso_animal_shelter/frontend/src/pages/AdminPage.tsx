import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { listUsers, updateUserRole, updateUserStatus } from "../api/admin";
import type { Role, User } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";

const ROLES: Role[] = ["viewer", "staff", "admin"];

const SELF_EDIT_HINT = "You can't change your own account";

export const AdminPage = () => {
  usePageTitle("Admin Panel");
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    listUsers(token)
      .then(setUsers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to load users"))
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleRoleChange = async (userId: number, role: Role) => {
    if (!token) return;
    try {
      const updated = await updateUserRole(token, userId, role);
      setUsers((current) => current.map((u) => (u.id === userId ? updated : u)));
      setError(null);
      setSuccess("Role updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update role");
    }
  };

  const handleStatusToggle = async (userId: number, isActive: boolean) => {
    if (!token) return;
    try {
      const updated = await updateUserStatus(token, userId, isActive);
      setUsers((current) => current.map((u) => (u.id === userId ? updated : u)));
      setError(null);
      setSuccess("Status updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update status");
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Panel
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <TableContainer component={Paper} variant="outlined">
        <Table aria-busy={isLoading}>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading &&
              [0, 1, 2].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton />
                  </TableCell>
                  <TableCell>
                    <Skeleton width={110} height={40} />
                  </TableCell>
                  <TableCell>
                    <Skeleton width={40} height={24} />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading &&
              users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      {u.email}
                      {isSelf && <Chip label="You" size="small" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={isSelf ? SELF_EDIT_HINT : ""}>
                        <span>
                          <Select
                            size="small"
                            value={u.role}
                            disabled={isSelf}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                            inputProps={{ "aria-label": `${u.email} role` }}
                          >
                            {ROLES.map((role) => (
                              <MenuItem key={role} value={role}>
                                {role}
                              </MenuItem>
                            ))}
                          </Select>
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={isSelf ? SELF_EDIT_HINT : ""}>
                        <span>
                          <Switch
                            checked={u.is_active}
                            disabled={isSelf}
                            onChange={(e) => handleStatusToggle(u.id, e.target.checked)}
                            slotProps={{ input: { "aria-label": `${u.email} active` } }}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar
        open={success !== null}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        message={success}
      />
    </Box>
  );
};
