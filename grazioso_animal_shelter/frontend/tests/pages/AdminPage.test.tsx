import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client";
import { AdminPage } from "../../src/pages/AdminPage";

const mockListUsers = vi.fn();
const mockUpdateUserRole = vi.fn();
const mockUpdateUserStatus = vi.fn();

vi.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => ({ token: "admin-token" }),
}));

vi.mock("../../src/api/admin", () => ({
  listUsers: (...args: unknown[]) => mockListUsers(...args),
  updateUserRole: (...args: unknown[]) => mockUpdateUserRole(...args),
  updateUserStatus: (...args: unknown[]) => mockUpdateUserStatus(...args),
}));

const users = [
  { id: 1, email: "viewer@example.com", is_active: true, role: "viewer" as const },
  { id: 2, email: "staff@example.com", is_active: false, role: "staff" as const },
];

describe("AdminPage", () => {
  beforeEach(() => {
    mockListUsers.mockReset();
    mockUpdateUserRole.mockReset();
    mockUpdateUserStatus.mockReset();
  });

  it("shows a loading state and then the fetched users", async () => {
    mockListUsers.mockResolvedValue(users);
    render(<AdminPage />);

    expect(screen.getByText("Loading users...")).toBeInTheDocument();

    expect(await screen.findByText("viewer@example.com")).toBeInTheDocument();
    expect(screen.getByText("staff@example.com")).toBeInTheDocument();
    expect(mockListUsers).toHaveBeenCalledWith("admin-token");
  });

  it("shows an error message when the user list fails to load", async () => {
    mockListUsers.mockRejectedValue(new ApiError(403, "You do not have permission"));
    render(<AdminPage />);

    expect(await screen.findByText("You do not have permission")).toBeInTheDocument();
  });

  it("shows a generic error message when the user list fails for a non-API reason", async () => {
    mockListUsers.mockRejectedValue(new Error("network down"));
    render(<AdminPage />);

    expect(await screen.findByText("Unable to load users")).toBeInTheDocument();
  });

  it("changes a user's role and reflects the update", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue(users);
    mockUpdateUserRole.mockResolvedValue({ ...users[0], role: "staff" });
    render(<AdminPage />);

    const row = (await screen.findByText("viewer@example.com")).closest("tr");
    if (!row) throw new Error("row not found");

    await user.selectOptions(within(row).getByRole("combobox"), "staff");

    expect(mockUpdateUserRole).toHaveBeenCalledWith("admin-token", 1, "staff");
    expect(
      await within(row).findByRole("option", { name: "staff", selected: true }),
    ).toBeInTheDocument();
  });

  it("toggles a user's active status", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue(users);
    mockUpdateUserStatus.mockResolvedValue({ ...users[1], is_active: true });
    render(<AdminPage />);

    const row = (await screen.findByText("staff@example.com")).closest("tr");
    if (!row) throw new Error("row not found");

    const checkbox = within(row).getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(mockUpdateUserStatus).toHaveBeenCalledWith("admin-token", 2, true);
  });

  it("shows an error message when updating status fails", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue(users);
    mockUpdateUserStatus.mockRejectedValue(new Error("network down"));
    render(<AdminPage />);

    const row = (await screen.findByText("staff@example.com")).closest("tr");
    if (!row) throw new Error("row not found");

    await user.click(within(row).getByRole("checkbox"));

    expect(await screen.findByText("Unable to update status")).toBeInTheDocument();
  });

  it("shows an error message when updating a role fails", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue(users);
    mockUpdateUserRole.mockRejectedValue(new ApiError(400, "Unknown role"));
    render(<AdminPage />);

    const row = (await screen.findByText("viewer@example.com")).closest("tr");
    if (!row) throw new Error("row not found");

    await user.selectOptions(within(row).getByRole("combobox"), "admin");

    expect(await screen.findByText("Unknown role")).toBeInTheDocument();
  });
});
