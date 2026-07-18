import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RequireAuth } from "../../src/auth/RequireAuth";

const mockUseAuth = vi.fn();

vi.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const renderWithRouter = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <div>Protected content</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("RequireAuth", () => {
  it("shows a loading indicator while auth state is resolving", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    renderWithRouter();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("redirects to /login when there is no authenticated user", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    renderWithRouter();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders children when the user is authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: "viewer@example.com", is_active: true, role: "viewer" },
      isLoading: false,
    });
    renderWithRouter();
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
