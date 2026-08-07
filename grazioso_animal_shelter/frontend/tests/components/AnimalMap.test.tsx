import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Animal } from "../../src/api/animals";
import { AnimalMap } from "../../src/components/AnimalMap";

const mockSetView = vi.fn();

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({
    children,
    center,
    radius,
  }: {
    children: ReactNode;
    center: [number, number];
    radius: number;
  }) => (
    <div data-testid="marker" data-center={center.join(",")} data-radius={radius}>
      {children}
    </div>
  ),
  Tooltip: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Popup: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  useMap: () => ({ setView: mockSetView }),
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
  location_lat: 30.5,
  location_long: -97.3,
  ...overrides,
});

describe("AnimalMap", () => {
  beforeEach(() => {
    mockSetView.mockReset();
  });

  it("renders one marker per located animal", () => {
    render(
      <AnimalMap
        animals={[animal(), animal({ id: 2, animal_id: "A000002", location_lat: 30.6 })]}
        selectedId={null}
      />,
    );

    expect(screen.getAllByTestId("marker")).toHaveLength(2);
    expect(screen.getByText("Locations")).toBeInTheDocument();
  });

  it("skips animals without coordinates", () => {
    render(
      <AnimalMap
        animals={[animal(), animal({ id: 2, location_lat: null, location_long: null })]}
        selectedId={null}
      />,
    );

    expect(screen.getAllByTestId("marker")).toHaveLength(1);
  });

  it("labels markers with breed tooltip and name popup", () => {
    render(<AnimalMap animals={[animal()]} selectedId={null} />);

    expect(screen.getByText("Labrador Retriever Mix")).toBeInTheDocument();
    expect(screen.getByText("Bella")).toBeInTheDocument();
  });

  it("falls back to the animal id when the animal has no name", () => {
    render(<AnimalMap animals={[animal({ name: null })]} selectedId={null} />);

    expect(screen.getByText("A000001")).toBeInTheDocument();
  });

  it("enlarges the selected marker and recenters on it", () => {
    render(
      <AnimalMap animals={[animal(), animal({ id: 2, location_lat: 30.9 })]} selectedId={2} />,
    );

    const markers = screen.getAllByTestId("marker");
    expect(markers[0]).toHaveAttribute("data-radius", "6");
    expect(markers[1]).toHaveAttribute("data-radius", "10");
    expect(mockSetView).toHaveBeenCalledWith([30.9, -97.3], 10);
  });

  it("shows an empty state when nothing has coordinates", () => {
    render(
      <AnimalMap
        animals={[animal({ location_lat: null, location_long: null })]}
        selectedId={null}
      />,
    );

    expect(screen.getByText("No location data to map.")).toBeInTheDocument();
    expect(screen.queryByTestId("map")).not.toBeInTheDocument();
  });
});
