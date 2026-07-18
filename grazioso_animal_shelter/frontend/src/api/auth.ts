import { apiClient } from "./client";

export type Role = "viewer" | "staff" | "admin";

export interface User {
  id: number;
  email: string;
  is_active: boolean;
  role: Role;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export const signup = (email: string, password: string): Promise<User> =>
  apiClient.post<User>("/auth/signup", { email, password });

export const login = (email: string, password: string): Promise<TokenResponse> =>
  apiClient.post<TokenResponse>("/auth/login", { email, password });

export const fetchCurrentUser = (token: string): Promise<User> =>
  apiClient.get<User>("/auth/me", token);
