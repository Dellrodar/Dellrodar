import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Animal, AnimalCreate } from "../../src/api/animals";
import { AnimalForm, buildAnimalUpdate } from "../../src/components/AnimalForm";

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

const matchingPayload = (): AnimalCreate => ({
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
});

describe("AnimalForm", () => {
  it("populates the lookup selects from the provided values", async () => {
    const user = userEvent.setup();
    render(
      <AnimalForm lookups={lookups} submitLabel="Create" isSubmitting={false} onSubmit={vi.fn()} />,
    );

    await user.click(screen.getByRole("combobox", { name: /animal type/i }));
    expect(screen.getByRole("option", { name: "Cat" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Dog" })).toBeInTheDocument();
  });

  it("submits required fields and null for the blanks", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AnimalForm lookups={lookups} submitLabel="Create" isSubmitting={false} onSubmit={onSubmit} />,
    );

    await user.type(screen.getByRole("textbox", { name: /animal id/i }), "A123");
    await user.click(screen.getByRole("combobox", { name: /animal type/i }));
    await user.click(screen.getByRole("option", { name: "Dog" }));
    await user.click(screen.getByRole("combobox", { name: /breed/i }));
    await user.click(await screen.findByRole("option", { name: "Beagle" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onSubmit).toHaveBeenCalledWith({
      animal_id: "A123",
      name: null,
      animal_type: "Dog",
      breed: "Beagle",
      color: null,
      sex_upon_outcome: null,
      date_of_birth: null,
      outcome_type: null,
      outcome_subtype: null,
      outcome_datetime: null,
      age_upon_outcome_in_weeks: null,
      location_lat: null,
      location_long: null,
    });
  });

  it("submits every optional field it is given", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AnimalForm lookups={lookups} submitLabel="Create" isSubmitting={false} onSubmit={onSubmit} />,
    );

    await user.type(screen.getByRole("textbox", { name: /animal id/i }), "A123");
    await user.click(screen.getByRole("combobox", { name: /animal type/i }));
    await user.click(screen.getByRole("option", { name: "Dog" }));
    await user.click(screen.getByRole("combobox", { name: /breed/i }));
    await user.click(await screen.findByRole("option", { name: "Beagle" }));

    await user.type(screen.getByRole("textbox", { name: /^name/i }), "Bella");
    await user.type(screen.getByRole("textbox", { name: /color/i }), "Black");
    await user.click(screen.getByRole("combobox", { name: /sex upon outcome/i }));
    await user.click(screen.getByRole("option", { name: "Intact Female" }));
    await user.click(screen.getByRole("combobox", { name: /outcome type/i }));
    await user.click(screen.getByRole("option", { name: "Adoption" }));
    await user.type(screen.getByRole("textbox", { name: /outcome subtype/i }), "Foster");
    fireEvent.change(screen.getByLabelText(/date of birth/i), {
      target: { value: "2015-04-10" },
    });
    fireEvent.change(screen.getByLabelText(/outcome date and time/i), {
      target: { value: "2016-01-01T12:30" },
    });
    await user.type(screen.getByRole("spinbutton", { name: /age upon outcome/i }), "52.4");
    await user.type(screen.getByRole("spinbutton", { name: /latitude/i }), "30.5");
    await user.type(screen.getByRole("spinbutton", { name: /longitude/i }), "-97.3");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onSubmit).toHaveBeenCalledWith({
      animal_id: "A123",
      name: "Bella",
      animal_type: "Dog",
      breed: "Beagle",
      color: "Black",
      sex_upon_outcome: "Intact Female",
      date_of_birth: "2015-04-10",
      outcome_type: "Adoption",
      outcome_subtype: "Foster",
      outcome_datetime: new Date("2016-01-01T12:30").toISOString(),
      age_upon_outcome_in_weeks: 52.4,
      location_lat: 30.5,
      location_long: -97.3,
    });
  });

  it("blocks submission while required fields are empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AnimalForm lookups={lookups} submitLabel="Create" isSubmitting={false} onSubmit={onSubmit} />,
    );

    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("prefills every field from the initial animal", () => {
    render(
      <AnimalForm
        initial={animal()}
        lookups={lookups}
        submitLabel="Save"
        isSubmitting={false}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: /animal id/i })).toHaveValue("A000001");
    expect(screen.getByRole("textbox", { name: /^name/i })).toHaveValue("Bella");
    expect(screen.getByRole("combobox", { name: /animal type/i })).toHaveTextContent("Dog");
    expect(screen.getByRole("combobox", { name: /breed/i })).toHaveValue(
      "Labrador Retriever Mix",
    );
    expect(screen.getByLabelText(/age upon outcome/i)).toHaveValue(52.4);
  });
});

describe("buildAnimalUpdate", () => {
  it("returns an empty object when nothing changed", () => {
    expect(buildAnimalUpdate(animal(), matchingPayload())).toEqual({});
  });

  it("returns only the changed fields", () => {
    const changed = { ...matchingPayload(), name: "Shadow", breed: "Beagle" };
    expect(buildAnimalUpdate(animal(), changed)).toEqual({ name: "Shadow", breed: "Beagle" });
  });

  it("treats an untouched timestamp as unchanged after the local-time round trip", () => {
    const original = animal({ outcome_datetime: "2016-01-01T12:30:00Z" });
    const resubmitted = {
      ...matchingPayload(),
      outcome_datetime: new Date("2016-01-01T12:30:00Z").toISOString(),
    };
    expect(buildAnimalUpdate(original, resubmitted)).toEqual({});
  });
});
