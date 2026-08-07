import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BreedChart } from "../../src/components/BreedChart";

const slices = [
  { label: "Pit Bull Mix", count: 40 },
  { label: "Labrador Retriever Mix", count: 30 },
  { label: "Chihuahua Shorthair Mix", count: 20 },
  { label: "Other", count: 10 },
];

describe("BreedChart", () => {
  it("renders a donut with an accessible label and the total in the center", () => {
    render(<BreedChart slices={slices} totalAnimals={100} />);

    expect(
      screen.getByRole("img", { name: "Breed distribution donut chart of 100 animals" }),
    ).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("animals")).toBeInTheDocument();
  });

  it("renders a legend row with count and percent for every slice", () => {
    render(<BreedChart slices={slices} totalAnimals={100} />);

    expect(screen.getByText("Pit Bull Mix")).toBeInTheDocument();
    expect(screen.getByText("40 · 40%")).toBeInTheDocument();
    expect(screen.getByText("Labrador Retriever Mix")).toBeInTheDocument();
    expect(screen.getByText("30 · 30%")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
    expect(screen.getByText("10 · 10%")).toBeInTheDocument();
  });

  it("skips slices with a zero count", () => {
    render(
      <BreedChart
        slices={[
          { label: "Beagle", count: 5 },
          { label: "Other", count: 0 },
        ]}
        totalAnimals={5}
      />,
    );

    expect(screen.getByText("Beagle")).toBeInTheDocument();
    expect(screen.queryByText("Other")).not.toBeInTheDocument();
  });

  it("renders a full ring for a single breed", () => {
    const { container } = render(
      <BreedChart slices={[{ label: "Beagle", count: 7 }]} totalAnimals={7} />,
    );

    expect(container.querySelector("circle")).not.toBeNull();
    expect(screen.getByText("7 · 100%")).toBeInTheDocument();
  });

  it("shows an empty state when there is nothing to chart", () => {
    render(<BreedChart slices={[]} totalAnimals={0} />);

    expect(screen.getByText("No breed data to chart.")).toBeInTheDocument();
  });
});
