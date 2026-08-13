import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client";
import { LoginPage } from "../../src/pages/LoginPage";

const mockLogin = vi.fn();

// Keep the real SESSION_EXPIRED_REASON export; only useAuth is stubbed.
vi.mock("../../src/auth/AuthContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/auth/AuthContext")>()),
  useAuth: () => ({ login: mockLogin }),
}));

const renderLoginPage = (
  initialEntries: Array<string | { pathname: string; state?: unknown }> = ["/login"],
) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
        <Route path="/admin" element={<div>Admin page</div>} />
        <Route path="/signup" element={<div>Signup page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("LoginPage", () => {
  beforeEach(() => {
    mockLogin.mockReset();
  });

  it("submits the entered credentials and redirects to the dashboard on success", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined);
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "viewer@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(mockLogin).toHaveBeenCalledWith("viewer@example.com", "password123");
    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
  });

  it("redirects back to the page the user came from", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined);
    renderLoginPage([{ pathname: "/login", state: { from: { pathname: "/admin" } } }]);

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Admin page")).toBeInTheDocument();
  });

  it("shows the server error message when login fails with an ApiError", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new ApiError(401, "Invalid email or password"));
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "viewer@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password");
  });

  it("shows a generic error message for non-API failures", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error("network down"));
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "viewer@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Unable to log in")).toBeInTheDocument();
  });

  it("links to the signup page", () => {
    renderLoginPage();
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
  });

  it("shows the session-expired message when redirected with the reason", () => {
    renderLoginPage([{ pathname: "/login", state: { reason: "session-expired" } }]);

    const alert = screen.getByRole("status");
    expect(alert).toHaveTextContent("Your session has expired. Please log in again.");
  });

  it("shows no session-expired message when navigating to the page directly", () => {
    renderLoginPage();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("returns to the original page after logging back in from an expired session", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined);
    renderLoginPage([
      {
        pathname: "/login",
        state: { reason: "session-expired", from: { pathname: "/admin" } },
      },
    ]);

    expect(screen.getByRole("status")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Admin page")).toBeInTheDocument();
  });

  it("replaces the session-expired message with the error when re-login fails", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new ApiError(401, "Invalid email or password"));
    renderLoginPage([{ pathname: "/login", state: { reason: "session-expired" } }]);

    await user.type(screen.getByLabelText("Email"), "viewer@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
