import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardPage } from "../../src/pages/DashboardPage";

const mockUseAuth = vi.fn();

vi.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("DashboardPage", () => {
  it("greets the signed-in user by email and role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: "staff@example.com", is_active: true, role: "staff" },
    });
    render(<DashboardPage />);

    expect(
      screen.getByText("Welcome, staff@example.com. You are signed in as staff."),
    ).toBeInTheDocument();
  });

  it("notes that animal search and matching aren't implemented yet", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: "staff@example.com", is_active: true, role: "staff" },
    });
    render(<DashboardPage />);

    expect(screen.getByText(/not implemented yet/)).toBeInTheDocument();
  });
});
