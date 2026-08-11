import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRouter } from "../../src/routes/AppRouter";

const mockUseAuth = vi.fn();

vi.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../src/components/NavBar", () => ({ NavBar: () => null }));
vi.mock("../../src/pages/AddAnimalPage", () => ({
  AddAnimalPage: () => <div>add-animal-page</div>,
}));
vi.mock("../../src/pages/AdminPage", () => ({ AdminPage: () => <div>admin-page</div> }));
vi.mock("../../src/pages/AnimalDetailPage", () => ({
  AnimalDetailPage: () => <div>animal-detail-page</div>,
}));
vi.mock("../../src/pages/AnimalManagePage", () => ({
  AnimalManagePage: () => <div>animal-manage-page</div>,
}));
vi.mock("../../src/pages/DashboardPage", () => ({
  DashboardPage: () => <div>dashboard-page</div>,
}));
vi.mock("../../src/pages/EditAnimalPage", () => ({
  EditAnimalPage: () => <div>edit-animal-page</div>,
}));
vi.mock("../../src/pages/ForbiddenPage", () => ({
  ForbiddenPage: () => <div>forbidden-page</div>,
}));
vi.mock("../../src/pages/LoginPage", () => ({ LoginPage: () => <div>login-page</div> }));
vi.mock("../../src/pages/SignupPage", () => ({ SignupPage: () => <div>signup-page</div> }));

const authAs = (role: "viewer" | "staff" | "admin" | null) =>
  mockUseAuth.mockReturnValue({
    user: role ? { id: 1, email: `${role}@example.com`, is_active: true, role } : null,
    token: role ? "token" : null,
    isLoading: false,
  });

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  );

describe("AppRouter animal management routes", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("sends a viewer to Forbidden for the add-animal route", () => {
    authAs("viewer");
    renderAt("/animals/new");
    expect(screen.getByText("forbidden-page")).toBeInTheDocument();
  });

  it("sends a viewer to Forbidden for the edit route", () => {
    authAs("viewer");
    renderAt("/animals/5/edit");
    expect(screen.getByText("forbidden-page")).toBeInTheDocument();
  });

  it("sends a viewer to Forbidden for the manage route", () => {
    authAs("viewer");
    renderAt("/animals/manage");
    expect(screen.getByText("forbidden-page")).toBeInTheDocument();
  });

  it("lets staff open the add, manage, and edit pages", () => {
    authAs("staff");
    renderAt("/animals/new");
    expect(screen.getByText("add-animal-page")).toBeInTheDocument();

    authAs("staff");
    renderAt("/animals/manage");
    expect(screen.getByText("animal-manage-page")).toBeInTheDocument();

    authAs("staff");
    renderAt("/animals/5/edit");
    expect(screen.getByText("edit-animal-page")).toBeInTheDocument();
  });

  it("lets a viewer open the animal detail page", () => {
    authAs("viewer");
    renderAt("/animals/5");
    expect(screen.getByText("animal-detail-page")).toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor to login", () => {
    authAs(null);
    renderAt("/animals/new");
    expect(screen.getByText("login-page")).toBeInTheDocument();
  });
});
