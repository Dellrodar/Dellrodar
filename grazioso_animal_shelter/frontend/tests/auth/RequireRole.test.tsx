import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RequireRole } from "../../src/auth/RequireRole";

const mockUseAuth = vi.fn();

vi.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const renderWithRouter = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireRole allowed={["admin"]}>
              <div>Admin content</div>
            </RequireRole>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/forbidden" element={<div>Forbidden page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("RequireRole", () => {
  it("redirects unauthenticated users to login", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    renderWithRouter("/admin");
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects users without the required role to /forbidden", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: "viewer@example.com", is_active: true, role: "viewer" },
      isLoading: false,
    });
    renderWithRouter("/admin");
    expect(screen.getByText("Forbidden page")).toBeInTheDocument();
  });

  it("renders children for users with the required role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, email: "admin@example.com", is_active: true, role: "admin" },
      isLoading: false,
    });
    renderWithRouter("/admin");
    expect(screen.getByText("Admin content")).toBeInTheDocument();
  });
});
