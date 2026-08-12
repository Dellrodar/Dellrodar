import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Animal } from "../src/api/animals";
import { NavBar } from "../src/components/NavBar";
import { AdminPage } from "../src/pages/AdminPage";
import { DashboardPage } from "../src/pages/DashboardPage";
import { ForbiddenPage } from "../src/pages/ForbiddenPage";
import { LoginPage } from "../src/pages/LoginPage";
import { SignupPage } from "../src/pages/SignupPage";

const mockUseAuth = vi.fn();
const mockSearchAnimals = vi.fn();
const mockGetBreedSummary = vi.fn();
const mockListRescueProfiles = vi.fn();
const mockSearchRescueMatches = vi.fn();
const mockListUsers = vi.fn();

// Keep the real SESSION_EXPIRED_REASON export; only useAuth is stubbed.
vi.mock("../src/auth/AuthContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/auth/AuthContext")>()),
  useAuth: () => mockUseAuth(),
}));

vi.mock("../src/api/animals", () => ({
  searchAnimals: (...args: unknown[]) => mockSearchAnimals(...args),
  getBreedSummary: (...args: unknown[]) => mockGetBreedSummary(...args),
}));

vi.mock("../src/api/rescueProfiles", () => ({
  listRescueProfiles: (...args: unknown[]) => mockListRescueProfiles(...args),
  searchRescueMatches: (...args: unknown[]) => mockSearchRescueMatches(...args),
}));

vi.mock("../src/api/admin", () => ({
  listUsers: (...args: unknown[]) => mockListUsers(...args),
  updateUserRole: vi.fn(),
  updateUserStatus: vi.fn(),
}));

vi.mock("../src/components/AnimalMap", () => ({
  AnimalMap: () => <div data-testid="animal-map" />,
}));

const adminUser = { id: 99, email: "admin@example.com", is_active: true, role: "admin" as const };

const animal: Animal = {
  id: 1,
  animal_id: "A000001",
  name: "Bella",
  animal_type: "Dog",
  breed: "Labrador Retriever Mix",
  color: null,
  sex_upon_outcome: "Intact Female",
  date_of_birth: null,
  outcome_type: "Adoption",
  outcome_subtype: null,
  outcome_datetime: null,
  age_upon_outcome_in_weeks: 52,
  location_lat: 30.5,
  location_long: -97.3,
  archived_at: null,
};

const expectNoViolations = async (container: Element) => {
  const results = await axe.run(container, {
    rules: {
      // jsdom does no layout, so axe cannot compute color contrast here.
      "color-contrast": { enabled: false },
      // Pages render inside the app shell's <main> Container, not in these tests.
      region: { enabled: false },
    },
  });
  expect(results.violations).toEqual([]);
};

describe("accessibility audits", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockSearchAnimals.mockReset();
    mockGetBreedSummary.mockReset();
    mockListRescueProfiles.mockReset();
    mockSearchRescueMatches.mockReset();
    mockListUsers.mockReset();
  });

  it("login page has no violations", async () => {
    mockUseAuth.mockReturnValue({ login: vi.fn() });
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await expectNoViolations(container);
  });

  it("signup page has no violations", async () => {
    mockUseAuth.mockReturnValue({ login: vi.fn() });
    const { container } = render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );

    await expectNoViolations(container);
  });

  it("forbidden page has no violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>,
    );

    await expectNoViolations(container);
  });

  it("navbar has no violations logged out and logged in", async () => {
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });
    const loggedOut = render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    );
    await expectNoViolations(loggedOut.container);
    loggedOut.unmount();

    mockUseAuth.mockReturnValue({ user: adminUser, logout: vi.fn() });
    const loggedIn = render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    );
    await expectNoViolations(loggedIn.container);
  });

  it("dashboard has no violations", async () => {
    mockUseAuth.mockReturnValue({ token: "token", user: adminUser });
    mockListRescueProfiles.mockResolvedValue([]);
    mockSearchAnimals.mockResolvedValue({ items: [animal], total: 1, page: 1, page_size: 10 });
    mockGetBreedSummary.mockResolvedValue({
      items: [{ breed: "Labrador Retriever Mix", count: 1 }],
      other_count: 0,
      total_animals: 1,
    });
    const { container } = render(<DashboardPage />);
    await screen.findByText("Bella");

    await expectNoViolations(container);
  });

  it("admin panel has no violations", async () => {
    mockUseAuth.mockReturnValue({ token: "token", user: adminUser });
    mockListUsers.mockResolvedValue([
      { id: 1, email: "viewer@example.com", is_active: true, role: "viewer" },
      adminUser,
    ]);
    const { container } = render(<AdminPage />);
    await screen.findByText("viewer@example.com");

    await expectNoViolations(container);
  });
});
