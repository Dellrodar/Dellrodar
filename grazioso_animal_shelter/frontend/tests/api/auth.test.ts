import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/api/client", async () => {
  const actual =
    await vi.importActual<typeof import("../../src/api/client")>("../../src/api/client");
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  };
});

import { fetchCurrentUser, login, signup } from "../../src/api/auth";
import { apiClient } from "../../src/api/client";

describe("api/auth", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
  });

  it("signup posts email and password to /auth/signup", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      id: 1,
      email: "a@example.com",
      is_active: true,
      role: "viewer",
    });

    await signup("a@example.com", "password123");

    expect(apiClient.post).toHaveBeenCalledWith("/auth/signup", {
      email: "a@example.com",
      password: "password123",
    });
  });

  it("login posts email and password to /auth/login", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ access_token: "t", token_type: "bearer" });

    await login("a@example.com", "password123");

    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
      email: "a@example.com",
      password: "password123",
    });
  });

  it("fetchCurrentUser gets /auth/me with the bearer token", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      id: 1,
      email: "a@example.com",
      is_active: true,
      role: "viewer",
    });

    await fetchCurrentUser("the-token");

    expect(apiClient.get).toHaveBeenCalledWith("/auth/me", "the-token");
  });
});
