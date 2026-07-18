import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client";
import { SignupPage } from "../../src/pages/SignupPage";

const mockLogin = vi.fn();
const mockSignup = vi.fn();

vi.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock("../../src/api/auth", () => ({
  signup: (...args: unknown[]) => mockSignup(...args),
}));

const renderSignupPage = () =>
  render(
    <MemoryRouter initialEntries={["/signup"]}>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("SignupPage", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockSignup.mockReset();
  });

  it("signs up, logs in, and redirects to the dashboard on success", async () => {
    const user = userEvent.setup();
    mockSignup.mockResolvedValue({
      id: 1,
      email: "new@example.com",
      is_active: true,
      role: "viewer",
    });
    mockLogin.mockResolvedValue(undefined);
    renderSignupPage();

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(mockSignup).toHaveBeenCalledWith("new@example.com", "password123");
    expect(mockLogin).toHaveBeenCalledWith("new@example.com", "password123");
    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
  });

  it("shows the server error message when signup fails with an ApiError", async () => {
    const user = userEvent.setup();
    mockSignup.mockRejectedValue(new ApiError(409, "Email is already registered"));
    renderSignupPage();

    await user.type(screen.getByLabelText("Email"), "taken@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("Email is already registered")).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("shows a generic error message for non-API failures", async () => {
    const user = userEvent.setup();
    mockSignup.mockRejectedValue(new Error("network down"));
    renderSignupPage();

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("Unable to sign up")).toBeInTheDocument();
  });

  it("links to the login page", () => {
    renderSignupPage();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });
});
