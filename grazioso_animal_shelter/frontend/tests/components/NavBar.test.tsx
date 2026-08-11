import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { NavBar } from "../../src/components/NavBar";

const mockLogout = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const renderNavBar = () =>
  render(
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>,
  );

describe("NavBar", () => {
  it("shows log in / sign up links when logged out", () => {
    mockUseAuth.mockReturnValue({ user: null, logout: mockLogout });
    renderNavBar();

    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign up" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("shows Dashboard and user info, but not Admin Panel, for a viewer", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: "viewer@example.com", is_active: true, role: "viewer" },
      logout: mockLogout,
    });
    renderNavBar();

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("viewer@example.com (viewer)")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin Panel" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Add Animal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Manage Animals" })).not.toBeInTheDocument();
  });

  it("shows the animal management links for staff", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 3, email: "staff@example.com", is_active: true, role: "staff" },
      logout: mockLogout,
    });
    renderNavBar();

    expect(screen.getByRole("link", { name: "Add Animal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage Animals" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin Panel" })).not.toBeInTheDocument();
  });

  it("shows the Admin Panel link for an admin", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, email: "admin@example.com", is_active: true, role: "admin" },
      logout: mockLogout,
    });
    renderNavBar();

    expect(screen.getByRole("link", { name: "Admin Panel" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add Animal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage Animals" })).toBeInTheDocument();
  });

  it("calls logout when the log out button is clicked", async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: "viewer@example.com", is_active: true, role: "viewer" },
      logout: mockLogout,
    });
    renderNavBar();

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(mockLogout).toHaveBeenCalledOnce();
  });
});
