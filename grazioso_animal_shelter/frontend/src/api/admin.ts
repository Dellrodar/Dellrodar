import type { Role, User } from "./auth";
import { apiClient } from "./client";

export const listUsers = (token: string): Promise<User[]> =>
  apiClient.get<User[]>("/admin/users", token);

export const updateUserRole = (token: string, userId: number, role: Role): Promise<User> =>
  apiClient.patch<User>(`/admin/users/${userId}/role`, { role }, token);

export const updateUserStatus = (token: string, userId: number, isActive: boolean): Promise<User> =>
  apiClient.patch<User>(`/admin/users/${userId}/status`, { is_active: isActive }, token);

export const deleteUser = (token: string, userId: number): Promise<void> =>
  apiClient.delete(`/admin/users/${userId}`, token);
