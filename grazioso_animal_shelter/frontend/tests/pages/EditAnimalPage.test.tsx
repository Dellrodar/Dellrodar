import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Animal } from "../../src/api/animals";
import { ApiError } from "../../src/api/client";
import { EditAnimalPage } from "../../src/pages/EditAnimalPage";

const mockGetAnimal = vi.fn();
const mockUpdateAnimal = vi.fn();
const mockArchiveAnimal = vi.fn();
const mockUnarchiveAnimal = vi.fn();
const mockGetLookupValues = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../src/api/animals", () => ({
  getAnimal: (...args: unknown[]) => mockGetAnimal(...args),
  updateAnimal: (...args: unknown[]) => mockUpdateAnimal(...args),
  archiveAnimal: (...args: unknown[]) => mockArchiveAnimal(...args),
  unarchiveAnimal: (...args: unknown[]) => mockUnarchiveAnimal(...args),
}));

vi.mock("../../src/api/lookups", () => ({
  getLookupValues: (...args: unknown[]) => mockGetLookupValues(...args),
}));

const lookups = {
  animal_types: ["Cat", "Dog"],
  breeds: ["Beagle", "Labrador Retriever Mix"],
  sexes: ["Intact Female", "Neutered Male"],
  outcome_types: ["Adoption", "Transfer"],
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
  archived_at: null,
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/animals/1/edit"]}>
      <Routes>
        <Route path="/animals/:id/edit" element={<EditAnimalPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("EditAnimalPage", () => {
  beforeEach(() => {
    mockGetAnimal.mockReset();
    mockUpdateAnimal.mockReset();
    mockArchiveAnimal.mockReset();
    mockUnarchiveAnimal.mockReset();
    mockGetLookupValues.mockReset();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({
      token: "staff-token",
      user: { id: 2, email: "staff@example.com", is_active: true, role: "staff" },
    });
    mockGetAnimal.mockResolvedValue(animal());
    mockGetLookupValues.mockResolvedValue(lookups);
  });

  it("prefills the form from the loaded record", async () => {
    renderPage();

    expect(await screen.findByRole("textbox", { name: /animal id/i })).toHaveValue("A000001");
    expect(screen.getByRole("combobox", { name: /breed/i })).toHaveValue(
      "Labrador Retriever Mix",
    );
    expect(mockGetAnimal).toHaveBeenCalledWith("staff-token", 1);
  });

  it("saves only the changed fields", async () => {
    const user = userEvent.setup();
    mockUpdateAnimal.mockResolvedValue(animal({ name: "Shadow" }));
    renderPage();

    const nameField = await screen.findByRole("textbox", { name: /^name/i });
    await user.clear(nameField);
    await user.type(nameField, "Shadow");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mockUpdateAnimal).toHaveBeenCalledWith("staff-token", 1, { name: "Shadow" });
    expect(await screen.findByText("Animal updated")).toBeInTheDocument();
  });

  it("skips the request when nothing changed", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("textbox", { name: /animal id/i });
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mockUpdateAnimal).not.toHaveBeenCalled();
    expect(await screen.findByText("No changes to save")).toBeInTheDocument();
  });

  it("archives after confirmation and reflects the archived state", async () => {
    const user = userEvent.setup();
    mockArchiveAnimal.mockResolvedValue(animal({ archived_at: "2026-08-11T00:00:00Z" }));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Archive animal" }));
    await user.click(await screen.findByRole("button", { name: "Archive" }));

    expect(mockArchiveAnimal).toHaveBeenCalledWith("staff-token", 1);
    expect(await screen.findByText("Animal archived")).toBeInTheDocument();
    expect(
      screen.getByText("This animal is archived and hidden from search results."),
    ).toBeInTheDocument();
    // findBy: the closing dialog aria-hides the page until its exit transition ends.
    expect(await screen.findByRole("button", { name: "Unarchive animal" })).toBeInTheDocument();
  });

  it("makes no request when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Archive animal" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(mockArchiveAnimal).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("unarchives an archived animal after confirmation", async () => {
    const user = userEvent.setup();
    mockGetAnimal.mockResolvedValue(animal({ archived_at: "2026-08-11T00:00:00Z" }));
    mockUnarchiveAnimal.mockResolvedValue(animal());
    renderPage();

    expect(
      await screen.findByText("This animal is archived and hidden from search results."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Unarchive animal" }));
    await user.click(await screen.findByRole("button", { name: "Unarchive" }));

    expect(mockUnarchiveAnimal).toHaveBeenCalledWith("staff-token", 1);
    expect(await screen.findByText("Animal unarchived")).toBeInTheDocument();
  });

  it("shows the server message when the animal is missing", async () => {
    mockGetAnimal.mockRejectedValue(new ApiError(404, "Animal not found"));
    renderPage();

    expect(await screen.findByText("Animal not found")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });
});
