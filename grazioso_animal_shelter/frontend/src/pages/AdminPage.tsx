import { useEffect, useState } from "react";
import { listUsers, updateUserRole, updateUserStatus } from "../api/admin";
import type { Role, User } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";

const ROLES: Role[] = ["viewer", "staff", "admin"];

export const AdminPage = () => {
  usePageTitle("Admin Panel");
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update role");
    }
  };

  const handleStatusToggle = async (userId: number, isActive: boolean) => {
    if (!token) return;
    try {
      const updated = await updateUserStatus(token, userId, isActive);
      setUsers((current) => current.map((u) => (u.id === userId ? updated : u)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update status");
    }
  };

  if (isLoading) {
    return <p>Loading users...</p>;
  }

  return (
    <div className="page">
      <h1>Admin Panel</h1>
      {error && <p className="form-error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={u.is_active}
                  onChange={(e) => handleStatusToggle(u.id, e.target.checked)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
