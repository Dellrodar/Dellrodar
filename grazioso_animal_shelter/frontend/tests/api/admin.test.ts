import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/api/client", async () => {
  const actual =
    await vi.importActual<typeof import("../../src/api/client")>("../../src/api/client");
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  };
});

import { listUsers, updateUserRole, updateUserStatus } from "../../src/api/admin";
import { apiClient } from "../../src/api/client";

const sampleUser = { id: 1, email: "a@example.com", is_active: true, role: "viewer" as const };

describe("api/admin", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.patch).mockReset();
  });

  it("listUsers gets /admin/users with the bearer token", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([sampleUser]);

    const result = await listUsers("the-token");

    expect(apiClient.get).toHaveBeenCalledWith("/admin/users", "the-token");
    expect(result).toEqual([sampleUser]);
  });

  it("updateUserRole patches /admin/users/:id/role with the new role", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ ...sampleUser, role: "staff" });

    await updateUserRole("the-token", 1, "staff");

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/admin/users/1/role",
      { role: "staff" },
      "the-token",
    );
  });

  it("updateUserStatus patches /admin/users/:id/status with the new active flag", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ ...sampleUser, is_active: false });

    await updateUserStatus("the-token", 1, false);

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/admin/users/1/status",
      { is_active: false },
      "the-token",
    );
  });
});
