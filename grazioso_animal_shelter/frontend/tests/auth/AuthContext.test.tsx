import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../../src/auth/AuthContext";

vi.mock("../../src/api/auth", () => ({
  fetchCurrentUser: vi.fn(),
  login: vi.fn(),
}));

import { fetchCurrentUser, login as loginRequest } from "../../src/api/auth";

const mockUser = { id: 1, email: "viewer@example.com", is_active: true, role: "viewer" as const };

describe("AuthProvider / useAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(loginRequest).mockReset();
  });

  it("starts with no user when localStorage has no token", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(fetchCurrentUser).not.toHaveBeenCalled();
  });

  it("loads the current user when a token already exists in localStorage", async () => {
    localStorage.setItem("grazioso.token", "existing-token");
    vi.mocked(fetchCurrentUser).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchCurrentUser).toHaveBeenCalledWith("existing-token");
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe("existing-token");
  });

  it("clears the token when the stored token is no longer valid", async () => {
    localStorage.setItem("grazioso.token", "stale-token");
    vi.mocked(fetchCurrentUser).mockRejectedValue(new Error("401"));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem("grazioso.token")).toBeNull();
  });

  it("login() stores the token and loads the user", async () => {
    vi.mocked(loginRequest).mockResolvedValue({ access_token: "new-token", token_type: "bearer" });
    vi.mocked(fetchCurrentUser).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login("viewer@example.com", "password123");
    });

    expect(localStorage.getItem("grazioso.token")).toBe("new-token");
    await waitFor(() => expect(result.current.user).toEqual(mockUser));
  });

  it("logout() clears the token and user", async () => {
    localStorage.setItem("grazioso.token", "existing-token");
    vi.mocked(fetchCurrentUser).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.user).toEqual(mockUser));

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem("grazioso.token")).toBeNull();
  });

  it("throws when useAuth is called outside an AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });
});
