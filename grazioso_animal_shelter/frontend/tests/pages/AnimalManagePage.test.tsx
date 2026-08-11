import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Animal } from "../../src/api/animals";
import { AnimalManagePage } from "../../src/pages/AnimalManagePage";

const mockSearchAnimals = vi.fn();
const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../src/api/animals", () => ({
  searchAnimals: (...args: unknown[]) => mockSearchAnimals(...args),
}));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => mockNavigate,
}));

const animal = (overrides: Partial<Animal> = {}): Animal => ({
  id: 1,
  animal_id: "A000001",
  name: "Bella",
  animal_type: "Dog",
  breed: "Labrador Retriever Mix",
  color: null,
  sex_upon_outcome: null,
  date_of_birth: null,
  outcome_type: null,
  outcome_subtype: null,
  outcome_datetime: null,
  age_upon_outcome_in_weeks: null,
  location_lat: null,
  location_long: null,
  archived_at: null,
  ...overrides,
});

const pageOf = (items: Animal[]) => ({ items, total: items.length, page: 1, page_size: 20 });

describe("AnimalManagePage", () => {
  beforeEach(() => {
    mockSearchAnimals.mockReset();
    mockUseAuth.mockReset();
    mockNavigate.mockReset();
    mockUseAuth.mockReturnValue({
      token: "staff-token",
      user: { id: 2, email: "staff@example.com", is_active: true, role: "staff" },
    });
    mockSearchAnimals.mockResolvedValue(pageOf([]));
  });

  it("searches with the typed query after the debounce", async () => {
    const user = userEvent.setup();
    render(<AnimalManagePage />);

    await user.type(screen.getByRole("combobox", { name: "Search animals" }), "bella");

    await waitFor(() =>
      expect(mockSearchAnimals).toHaveBeenLastCalledWith("staff-token", {
        q: "bella",
        pageSize: 20,
        includeArchived: false,
      }),
    );
  });

  it("navigates to the edit page when a result is selected", async () => {
    const user = userEvent.setup();
    mockSearchAnimals.mockResolvedValue(pageOf([animal()]));
    render(<AnimalManagePage />);

    await user.click(screen.getByRole("combobox", { name: "Search animals" }));
    await user.click(await screen.findByRole("option", { name: /A000001/ }));

    expect(mockNavigate).toHaveBeenCalledWith("/animals/1/edit");
  });

  it("includes archived animals when the switch is on and marks them", async () => {
    const user = userEvent.setup();
    mockSearchAnimals.mockResolvedValue(
      pageOf([animal({ archived_at: "2026-08-11T00:00:00Z" })]),
    );
    render(<AnimalManagePage />);

    await user.click(screen.getByRole("switch", { name: "Include archived" }));

    await waitFor(() =>
      expect(mockSearchAnimals).toHaveBeenLastCalledWith("staff-token", {
        q: undefined,
        pageSize: 20,
        includeArchived: true,
      }),
    );

    await user.click(screen.getByRole("combobox", { name: "Search animals" }));
    const option = await screen.findByRole("option", { name: /A000001/ });
    expect(option).toHaveTextContent("Archived");
  });

  it("shows an error when the search fails", async () => {
    mockSearchAnimals.mockRejectedValue(new Error("network down"));
    render(<AnimalManagePage />);

    expect(await screen.findByText("Unable to search animals")).toBeInTheDocument();
  });
});
