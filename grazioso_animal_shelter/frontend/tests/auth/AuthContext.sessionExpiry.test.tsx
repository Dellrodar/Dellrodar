import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { AuthProvider, useAuth } from "../../src/auth/AuthContext";
import { RequireAuth } from "../../src/auth/RequireAuth";

// Unlike AuthContext.test.tsx this file keeps api/auth real, so the whole
// chain from fetch response to navigation state is exercised.

const mockUser = { id: 1, email: "viewer@example.com", is_active: true, role: "viewer" as const };

const buildToken = (payload: Record<string, unknown>): string => {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${encoded}.signature`;
};

const stubFetchWithStatus = (status: number, body: unknown): void => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
};

const LoginProbe = () => {
  const location = useLocation();
  return <div data-testid="login-state">{JSON.stringify(location.state)}</div>;
};

const DashboardStub = () => {
  const { logout } = useAuth();
  return (
    <div>
      Dashboard page
      <button type="button" onClick={logout}>
        Log out
      </button>
    </div>
  );
};

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardStub />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

describe("AuthProvider session expiry", () => {
  let warnSpy: MockInstance;

  beforeEach(() => {
    localStorage.clear();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    warnSpy.mockRestore();
  });

  it("redirects with the session-expired reason when the stored token gets a 401 on load", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 300;
    localStorage.setItem("grazioso.token", buildToken({ exp: futureExp }));
    stubFetchWithStatus(401, { detail: "Invalid or expired token" });

    renderApp();

    const probe = await screen.findByTestId("login-state");
    expect(JSON.parse(probe.textContent ?? "null")).toMatchObject({
      reason: "session-expired",
      from: { pathname: "/dashboard" },
    });
    expect(localStorage.getItem("grazioso.token")).toBeNull();
  });

  it("signs the user out with the reason when the token's exp time passes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-11T12:00:00Z"));
    const expiresInSeconds = 300;
    localStorage.setItem(
      "grazioso.token",
      buildToken({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds }),
    );
    stubFetchWithStatus(200, mockUser);

    renderApp();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(expiresInSeconds * 1000 + 1000);
    });

    const probe = screen.getByTestId("login-state");
    expect(JSON.parse(probe.textContent ?? "null")).toMatchObject({
      reason: "session-expired",
      from: { pathname: "/dashboard" },
    });
    expect(localStorage.getItem("grazioso.token")).toBeNull();
  });

  it("signs out immediately when the stored token is already expired at mount", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-11T12:00:00Z"));
    localStorage.setItem(
      "grazioso.token",
      buildToken({ exp: Math.floor(Date.now() / 1000) - 60 }),
    );
    stubFetchWithStatus(200, mockUser);

    renderApp();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const probe = screen.getByTestId("login-state");
    expect(JSON.parse(probe.textContent ?? "null")).toMatchObject({
      reason: "session-expired",
      from: { pathname: "/dashboard" },
    });
    expect(localStorage.getItem("grazioso.token")).toBeNull();
  });

  it("leaves the session alone when the token has no readable exp claim", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-11T12:00:00Z"));
    localStorage.setItem("grazioso.token", "not-a-jwt");
    stubFetchWithStatus(200, mockUser);

    renderApp();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    });

    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
    expect(screen.queryByTestId("login-state")).not.toBeInTheDocument();
  });

  it("manual logout redirects without the session-expired reason and cancels the timer", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-11T12:00:00Z"));
    const expiresInSeconds = 300;
    localStorage.setItem(
      "grazioso.token",
      buildToken({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds }),
    );
    stubFetchWithStatus(200, mockUser);

    renderApp();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // RequireAuth passes the full location object as from; the point here is
    // that no session-expired reason rides along on a manual logout.
    const probe = screen.getByTestId("login-state");
    const stateAfterLogout = JSON.parse(probe.textContent ?? "null") as Record<string, unknown>;
    expect(stateAfterLogout).not.toHaveProperty("reason");
    expect(stateAfterLogout).toMatchObject({ from: { pathname: "/dashboard" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(expiresInSeconds * 1000 + 1000);
    });

    const stateAfterExpiry = JSON.parse(probe.textContent ?? "null") as Record<string, unknown>;
    expect(stateAfterExpiry).not.toHaveProperty("reason");
    expect(warnSpy).not.toHaveBeenCalledWith("Session is no longer valid; signing out.");
  });
});
