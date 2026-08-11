import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
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
import { deleteUser, listUsers, updateUserRole, updateUserStatus } from "../api/admin";
import type { Role, User } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
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
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteConfirm = async () => {
    if (!token || !pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteUser(token, pendingDelete.id);
      setUsers((current) => current.filter((u) => u.id !== pendingDelete.id));
      setError(null);
      setSuccess("Account deleted");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to delete account");
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
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
              <TableCell>Actions</TableCell>
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
                  <TableCell>
                    <Skeleton width={32} height={32} variant="circular" />
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
                    <TableCell>
                      <Tooltip title={isSelf ? SELF_EDIT_HINT : ""}>
                        <span>
                          <IconButton
                            color="error"
                            disabled={isSelf}
                            onClick={() => setPendingDelete(u)}
                            aria-label={`Delete ${u.email}`}
                          >
                            <DeleteOutlined />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.email ?? ""}?`}
        message="This permanently removes the account. Audit history of their changes is kept."
        confirmLabel="Delete"
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
      />
      <Snackbar
        open={success !== null}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        message={success}
      />
    </Box>
  );
};
