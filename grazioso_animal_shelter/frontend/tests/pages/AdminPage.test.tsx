import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client";
import { AdminPage } from "../../src/pages/AdminPage";

const mockListUsers = vi.fn();
const mockUpdateUserRole = vi.fn();
const mockUpdateUserStatus = vi.fn();
const mockDeleteUser = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../src/api/admin", () => ({
  listUsers: (...args: unknown[]) => mockListUsers(...args),
  updateUserRole: (...args: unknown[]) => mockUpdateUserRole(...args),
  updateUserStatus: (...args: unknown[]) => mockUpdateUserStatus(...args),
  deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
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
    mockDeleteUser.mockReset();
    mockUseAuth.mockReturnValue({
      token: "admin-token",
      user: { id: 99, email: "admin@example.com", is_active: true, role: "admin" },
    });
  });

  it("shows a loading state and then the fetched users", async () => {
    mockListUsers.mockResolvedValue(users);
    render(<AdminPage />);

    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");

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

    await user.click(within(row).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "staff" }));

    expect(mockUpdateUserRole).toHaveBeenCalledWith("admin-token", 1, "staff");
    expect(within(row).getByRole("combobox")).toHaveTextContent("staff");
    expect(await screen.findByText("Role updated")).toBeInTheDocument();
  });

  it("toggles a user's active status", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue(users);
    mockUpdateUserStatus.mockResolvedValue({ ...users[1], is_active: true });
    render(<AdminPage />);

    const row = (await screen.findByText("staff@example.com")).closest("tr");
    if (!row) throw new Error("row not found");

    const statusSwitch = within(row).getByRole("switch");
    expect(statusSwitch).not.toBeChecked();

    await user.click(statusSwitch);

    expect(mockUpdateUserStatus).toHaveBeenCalledWith("admin-token", 2, true);
    expect(await screen.findByText("Status updated")).toBeInTheDocument();
  });

  it("disables editing your own account", async () => {
    mockUseAuth.mockReturnValue({
      token: "admin-token",
      user: { id: 1, email: "viewer@example.com", is_active: true, role: "viewer" },
    });
    mockListUsers.mockResolvedValue(users);
    render(<AdminPage />);

    const row = (await screen.findByText("viewer@example.com")).closest("tr");
    if (!row) throw new Error("row not found");

    expect(within(row).getByText("You")).toBeInTheDocument();
    expect(within(row).getByRole("combobox")).toHaveAttribute("aria-disabled", "true");
    expect(within(row).getByRole("switch")).toBeDisabled();
    expect(within(row).getByRole("button", { name: "Delete viewer@example.com" })).toBeDisabled();
  });

  it("deletes a user after confirmation and removes the row", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue(users);
    mockDeleteUser.mockResolvedValue(undefined);
    render(<AdminPage />);

    const row = (await screen.findByText("staff@example.com")).closest("tr");
    if (!row) throw new Error("row not found");

    await user.click(within(row).getByRole("button", { name: "Delete staff@example.com" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Delete staff@example.com?")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(mockDeleteUser).toHaveBeenCalledWith("admin-token", 2);
    expect(await screen.findByText("Account deleted")).toBeInTheDocument();
    expect(screen.queryByText("staff@example.com")).not.toBeInTheDocument();
  });

  it("cancelling the delete dialog keeps the user", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue(users);
    render(<AdminPage />);

    const row = (await screen.findByText("staff@example.com")).closest("tr");
    if (!row) throw new Error("row not found");

    await user.click(within(row).getByRole("button", { name: "Delete staff@example.com" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(screen.getByText("staff@example.com")).toBeInTheDocument();
  });

  it("shows an error message when deleting a user fails", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue(users);
    mockDeleteUser.mockRejectedValue(new ApiError(400, "You cannot delete your own account"));
    render(<AdminPage />);

    const row = (await screen.findByText("staff@example.com")).closest("tr");
    if (!row) throw new Error("row not found");

    await user.click(within(row).getByRole("button", { name: "Delete staff@example.com" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("You cannot delete your own account")).toBeInTheDocument();
    expect(screen.getByText("staff@example.com")).toBeInTheDocument();
  });

  it("shows a generic error message when deleting fails for a non-API reason", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue(users);
    mockDeleteUser.mockRejectedValue(new Error("network down"));
    render(<AdminPage />);

    const row = (await screen.findByText("staff@example.com")).closest("tr");
    if (!row) throw new Error("row not found");

    await user.click(within(row).getByRole("button", { name: "Delete staff@example.com" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Unable to delete account")).toBeInTheDocument();
  });

  it("shows an error message when updating status fails", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue(users);
    mockUpdateUserStatus.mockRejectedValue(new Error("network down"));
    render(<AdminPage />);

    const row = (await screen.findByText("staff@example.com")).closest("tr");
    if (!row) throw new Error("row not found");

    await user.click(within(row).getByRole("switch"));

    expect(await screen.findByText("Unable to update status")).toBeInTheDocument();
  });

  it("shows an error message when updating a role fails", async () => {
    const user = userEvent.setup();
    mockListUsers.mockResolvedValue(users);
    mockUpdateUserRole.mockRejectedValue(new ApiError(400, "Unknown role"));
    render(<AdminPage />);

    const row = (await screen.findByText("viewer@example.com")).closest("tr");
    if (!row) throw new Error("row not found");

    await user.click(within(row).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "admin" }));

    expect(await screen.findByText("Unknown role")).toBeInTheDocument();
  });
});
