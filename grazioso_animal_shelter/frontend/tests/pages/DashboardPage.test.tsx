import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Animal } from "../../src/api/animals";
import { ApiError } from "../../src/api/client";
import { DashboardPage } from "../../src/pages/DashboardPage";

const mockSearchAnimals = vi.fn();
const mockListRescueProfiles = vi.fn();
const mockSearchRescueMatches = vi.fn();

vi.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => ({
    token: "user-token",
    user: { id: 1, email: "viewer@example.com", is_active: true, role: "viewer" },
  }),
}));

vi.mock("../../src/api/animals", () => ({
  searchAnimals: (...args: unknown[]) => mockSearchAnimals(...args),
}));

vi.mock("../../src/api/rescueProfiles", () => ({
  listRescueProfiles: (...args: unknown[]) => mockListRescueProfiles(...args),
  searchRescueMatches: (...args: unknown[]) => mockSearchRescueMatches(...args),
}));

const waterRescue = {
  id: 1,
  name: "Water Rescue",
  animal_type: "Dog",
  preferred_sex: "Intact Female",
  min_age_weeks: 26,
  max_age_weeks: 156,
  breeds: [
    { breed: "Labrador Retriever Mix", weight: 1 },
    { breed: "Newfoundland", weight: 1 },
  ],
};

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
  ...overrides,
});

const pageOf = (items: Animal[], total = items.length, page = 1) => ({
  items,
  total,
  page,
  page_size: 10,
});

describe("DashboardPage", () => {
  beforeEach(() => {
    mockSearchAnimals.mockReset();
    mockListRescueProfiles.mockReset();
    mockSearchRescueMatches.mockReset();
    mockListRescueProfiles.mockResolvedValue([waterRescue]);
  });

  it("greets the signed-in user and loads the first page of animals", async () => {
    mockSearchAnimals.mockResolvedValue(pageOf([animal()]));
    render(<DashboardPage />);

    expect(
      screen.getByText("Welcome, viewer@example.com. You are signed in as viewer."),
    ).toBeInTheDocument();
    expect(await screen.findByText("Bella")).toBeInTheDocument();
    expect(screen.getByText("Labrador Retriever Mix")).toBeInTheDocument();
    expect(mockSearchAnimals).toHaveBeenCalledWith("user-token", {
      q: undefined,
      animalType: undefined,
      page: 1,
      pageSize: 10,
    });
  });

  it("searches with the entered query and selected type", async () => {
    const user = userEvent.setup();
    mockSearchAnimals.mockResolvedValue(pageOf([animal()]));
    render(<DashboardPage />);
    await screen.findByText("Bella");

    await user.type(screen.getByLabelText("Search animals"), "shepherd");
    await user.selectOptions(screen.getByLabelText("Animal type"), "Dog");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(mockSearchAnimals).toHaveBeenLastCalledWith("user-token", {
      q: "shepherd",
      animalType: "Dog",
      page: 1,
      pageSize: 10,
    });
  });

  it("pages forward and back through results", async () => {
    const user = userEvent.setup();
    mockSearchAnimals.mockResolvedValue(pageOf([animal()], 25, 1));
    render(<DashboardPage />);
    await screen.findByText("Bella");

    expect(screen.getByText("Page 1 of 3 (25 animals)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    mockSearchAnimals.mockResolvedValue(pageOf([animal({ id: 11, name: "Max" })], 25, 2));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Max")).toBeInTheDocument();
    expect(mockSearchAnimals).toHaveBeenLastCalledWith(
      "user-token",
      expect.objectContaining({ page: 2 }),
    );
  });

  it("shows an empty-state message when nothing matches", async () => {
    mockSearchAnimals.mockResolvedValue(pageOf([]));
    render(<DashboardPage />);

    expect(await screen.findByText("No animals match your search.")).toBeInTheDocument();
  });

  it("shows an API error message when the search fails", async () => {
    mockSearchAnimals.mockRejectedValue(new ApiError(500, "Something broke"));
    render(<DashboardPage />);

    expect(await screen.findByText("Something broke")).toBeInTheDocument();
  });

  it("shows a generic error message for non-API failures", async () => {
    mockSearchAnimals.mockRejectedValue(new Error("network down"));
    render(<DashboardPage />);

    expect(await screen.findByText("Unable to load animals")).toBeInTheDocument();
  });

  it("shows ranked matches when a rescue profile is selected", async () => {
    const user = userEvent.setup();
    mockSearchAnimals.mockResolvedValue(pageOf([animal()]));
    mockSearchRescueMatches.mockResolvedValue({
      profile: waterRescue,
      items: [
        {
          animal: animal(),
          score: 100,
          breed_score: 50,
          age_score: 20,
          sex_score: 20,
          availability_score: 10,
        },
        {
          animal: animal({ id: 2, animal_id: "A000002", name: "Rex", breed: "Chihuahua" }),
          score: 52.5,
          breed_score: 2.5,
          age_score: 20,
          sex_score: 20,
          availability_score: 10,
        },
      ],
      total: 2,
      page: 1,
      page_size: 10,
    });
    render(<DashboardPage />);
    await screen.findByText("Bella");

    await user.selectOptions(screen.getByLabelText("Rescue profile:"), "1");

    expect(await screen.findByText("100")).toBeInTheDocument();
    expect(screen.getByText("52.5")).toBeInTheDocument();
    expect(screen.getByText(/Ranking dogs for/)).toBeInTheDocument();
    expect(screen.getByText(/Intact Female · 26-156 weeks/)).toBeInTheDocument();
    expect(mockSearchRescueMatches).toHaveBeenCalledWith("user-token", 1, {
      page: 1,
      pageSize: 10,
    });

    const rows = screen.getAllByRole("row");
    const firstDataRow = rows[1];
    expect(firstDataRow).toHaveTextContent("Bella");
    expect(rows[2]).toHaveTextContent("Rex");
  });

  it("returns to the general search when All animals is selected", async () => {
    const user = userEvent.setup();
    mockSearchAnimals.mockResolvedValue(pageOf([animal()]));
    mockSearchRescueMatches.mockResolvedValue({
      profile: waterRescue,
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    });
    render(<DashboardPage />);
    await screen.findByText("Bella");

    await user.selectOptions(screen.getByLabelText("Rescue profile:"), "1");
    expect(await screen.findByText("No candidates found for this profile.")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Rescue profile:"), "");
    expect(await screen.findByText("Bella")).toBeInTheDocument();
    expect(screen.getByLabelText("Search animals")).toBeInTheDocument();
  });

  it("shows an error when matches fail to load", async () => {
    const user = userEvent.setup();
    mockSearchAnimals.mockResolvedValue(pageOf([animal()]));
    mockSearchRescueMatches.mockRejectedValue(new ApiError(404, "Rescue profile not found"));
    render(<DashboardPage />);
    await screen.findByText("Bella");

    await user.selectOptions(screen.getByLabelText("Rescue profile:"), "1");

    expect(await screen.findByText("Rescue profile not found")).toBeInTheDocument();
  });
});
