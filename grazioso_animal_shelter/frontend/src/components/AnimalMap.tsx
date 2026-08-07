import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { Animal } from "../api/animals";

// Austin area, matching the AAC dataset and the original CS-340 dashboard.
const DEFAULT_CENTER: [number, number] = [30.75, -97.48];
const DEFAULT_ZOOM = 10;

const MARKER_COLOR = "#2a78d6";
const SELECTED_COLOR = "#eb6834";

interface LocatedAnimal {
  animal: Animal;
  lat: number;
  long: number;
}

const locate = (animals: Animal[]): LocatedAnimal[] =>
  animals.flatMap((animal) =>
    animal.location_lat != null && animal.location_long != null
      ? [{ animal, lat: animal.location_lat, long: animal.location_long }]
      : [],
  );

const RecenterOnSelection = ({ point }: { point: LocatedAnimal | undefined }) => {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.lat, point.long], DEFAULT_ZOOM);
  }, [map, point]);
  return null;
};

interface AnimalMapProps {
  animals: Animal[];
  selectedId: number | null;
}

export const AnimalMap = ({ animals, selectedId }: AnimalMapProps) => {
  const points = locate(animals);
  const selected = points.find((point) => point.animal.id === selectedId);

  return (
    <figure className="animal-map">
      <figcaption>Locations</figcaption>
      {points.length === 0 ? (
        <p>No location data to map.</p>
      ) : (
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={false}
          className="animal-map-canvas"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterOnSelection point={selected} />
          {points.map(({ animal, lat, long }) => {
            const isSelected = animal.id === selectedId;
            return (
              <CircleMarker
                key={animal.id}
                center={[lat, long]}
                radius={isSelected ? 10 : 6}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor: isSelected ? SELECTED_COLOR : MARKER_COLOR,
                  fillOpacity: 0.85,
                }}
              >
                <Tooltip>{animal.breed}</Tooltip>
                <Popup>{animal.name ?? animal.animal_id}</Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      )}
    </figure>
  );
};
