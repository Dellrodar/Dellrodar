import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Animal } from "../../src/api/animals";
import { ApiError } from "../../src/api/client";
import { AnimalDetailPage } from "../../src/pages/AnimalDetailPage";

const mockGetAnimal = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../src/api/animals", () => ({
  getAnimal: (...args: unknown[]) => mockGetAnimal(...args),
}));

const animal = (overrides: Partial<Animal> = {}): Animal => ({
  id: 1,
  animal_id: "A000001",
  name: "Bella",
  animal_type: "Dog",
  breed: "Labrador Retriever Mix",
  color: "Black/White",
  sex_upon_outcome: "Intact Female",
  date_of_birth: "2015-04-10",
  outcome_type: "Transfer",
  outcome_subtype: null,
  outcome_datetime: null,
  age_upon_outcome_in_weeks: 52.4,
  location_lat: 30.5,
  location_long: -97.3,
  archived_at: null,
  ...overrides,
});

const withRole = (role: "viewer" | "staff" | "admin") =>
  mockUseAuth.mockReturnValue({
    token: "user-token",
    user: { id: 1, email: `${role}@example.com`, is_active: true, role },
  });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/animals/1"]}>
      <Routes>
        <Route path="/animals/:id" element={<AnimalDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("AnimalDetailPage", () => {
  beforeEach(() => {
    mockGetAnimal.mockReset();
    mockUseAuth.mockReset();
    mockGetAnimal.mockResolvedValue(animal());
  });

  it("renders the animal's fields for a viewer without an Edit button", async () => {
    withRole("viewer");
    renderPage();

    expect(await screen.findByText("Bella")).toBeInTheDocument();
    expect(screen.getByText("A000001")).toBeInTheDocument();
    expect(screen.getByText("Labrador Retriever Mix")).toBeInTheDocument();
    expect(screen.getByText("Transfer")).toBeInTheDocument();
    expect(screen.getByText("2015-04-10")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(mockGetAnimal).toHaveBeenCalledWith("user-token", 1);
  });

  it("links staff to the edit page", async () => {
    withRole("staff");
    renderPage();

    expect(await screen.findByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/animals/1/edit",
    );
  });

  it("marks archived animals with a chip", async () => {
    withRole("viewer");
    mockGetAnimal.mockResolvedValue(animal({ archived_at: "2026-08-11T00:00:00Z" }));
    renderPage();

    expect(await screen.findByText("Archived")).toBeInTheDocument();
  });

  it("shows the server message when the animal is missing", async () => {
    withRole("viewer");
    mockGetAnimal.mockRejectedValue(new ApiError(404, "Animal not found"));
    renderPage();

    expect(await screen.findByText("Animal not found")).toBeInTheDocument();
  });
});
