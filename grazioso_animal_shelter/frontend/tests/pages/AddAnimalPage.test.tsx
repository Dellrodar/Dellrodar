import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client";
import { AddAnimalPage } from "../../src/pages/AddAnimalPage";

const mockCreateAnimal = vi.fn();
const mockGetLookupValues = vi.fn();
const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../src/api/animals", () => ({
  createAnimal: (...args: unknown[]) => mockCreateAnimal(...args),
}));

vi.mock("../../src/api/lookups", () => ({
  getLookupValues: (...args: unknown[]) => mockGetLookupValues(...args),
}));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => mockNavigate,
}));

const lookups = {
  animal_types: ["Cat", "Dog"],
  breeds: ["Beagle", "Labrador Retriever Mix"],
  sexes: ["Intact Female"],
  outcome_types: ["Adoption"],
};

describe("AddAnimalPage", () => {
  beforeEach(() => {
    mockCreateAnimal.mockReset();
    mockGetLookupValues.mockReset();
    mockUseAuth.mockReset();
    mockNavigate.mockReset();
    mockUseAuth.mockReturnValue({
      token: "staff-token",
      user: { id: 2, email: "staff@example.com", is_active: true, role: "staff" },
    });
    mockGetLookupValues.mockResolvedValue(lookups);
  });

  it("loads the lookup values into the form", async () => {
    const user = userEvent.setup();
    render(<AddAnimalPage />);

    await user.click(await screen.findByRole("combobox", { name: /animal type/i }));
    expect(screen.getByRole("option", { name: "Cat" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Dog" })).toBeInTheDocument();
    expect(mockGetLookupValues).toHaveBeenCalledWith("staff-token");
  });

  it("creates the animal and navigates to its detail page", async () => {
    const user = userEvent.setup();
    mockCreateAnimal.mockResolvedValue({ id: 7 });
    render(<AddAnimalPage />);

    await user.type(await screen.findByRole("textbox", { name: /animal id/i }), "A123");
    await user.click(screen.getByRole("combobox", { name: /animal type/i }));
    await user.click(screen.getByRole("option", { name: "Dog" }));
    await user.click(screen.getByRole("combobox", { name: /breed/i }));
    await user.click(await screen.findByRole("option", { name: "Beagle" }));
    await user.click(screen.getByRole("button", { name: "Create animal" }));

    expect(mockCreateAnimal).toHaveBeenCalledWith(
      "staff-token",
      expect.objectContaining({ animal_id: "A123", animal_type: "Dog", breed: "Beagle" }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/animals/7");
  });

  it("shows the server message when a lookup value is rejected", async () => {
    const user = userEvent.setup();
    mockCreateAnimal.mockRejectedValue(new ApiError(400, "Unknown value for breed"));
    render(<AddAnimalPage />);

    await user.type(await screen.findByRole("textbox", { name: /animal id/i }), "A123");
    await user.click(screen.getByRole("combobox", { name: /animal type/i }));
    await user.click(screen.getByRole("option", { name: "Dog" }));
    await user.click(screen.getByRole("combobox", { name: /breed/i }));
    await user.click(await screen.findByRole("option", { name: "Beagle" }));
    await user.click(screen.getByRole("button", { name: "Create animal" }));

    expect(await screen.findByText("Unknown value for breed")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("shows an error when the lookups fail to load", async () => {
    mockGetLookupValues.mockRejectedValue(new ApiError(503, "Service unavailable"));
    render(<AddAnimalPage />);

    expect(await screen.findByText("Service unavailable")).toBeInTheDocument();
  });
});
