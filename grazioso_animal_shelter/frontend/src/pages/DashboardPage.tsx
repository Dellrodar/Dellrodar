import { type FormEvent, useEffect, useState } from "react";
import { type AnimalPage, type BreedSummary, getBreedSummary, searchAnimals } from "../api/animals";
import { ApiError } from "../api/client";
import {
  listRescueProfiles,
  type RescueMatchPage,
  type RescueProfile,
  searchRescueMatches,
} from "../api/rescueProfiles";
import { useAuth } from "../auth/AuthContext";
import { AnimalMap } from "../components/AnimalMap";
import { BreedChart, type BreedSlice } from "../components/BreedChart";
import { usePageTitle } from "../hooks/usePageTitle";

const PAGE_SIZE = 10;
const ANIMAL_TYPES = ["Dog", "Cat", "Bird", "Livestock", "Other"];
const TOP_BREEDS = 5;

const breedSlicesFromSummary = (summary: BreedSummary): BreedSlice[] => {
  const slices = summary.items.map((item) => ({ label: item.breed, count: item.count }));
  if (summary.other_count > 0) slices.push({ label: "Other", count: summary.other_count });
  return slices;
};

const breedSlicesFromMatches = (matchPage: RescueMatchPage): BreedSlice[] => {
  const counts = new Map<string, number>();
  for (const match of matchPage.items) {
    counts.set(match.animal.breed, (counts.get(match.animal.breed) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const slices = sorted
    .slice(0, TOP_BREEDS)
    .map(([label, count]): BreedSlice => ({ label, count }));
  const other = sorted.slice(TOP_BREEDS).reduce((sum, [, count]) => sum + count, 0);
  if (other > 0) slices.push({ label: "Other", count: other });
  return slices;
};

const formatCriteria = (profile: RescueProfile): string => {
  const parts: string[] = [];
  if (profile.preferred_sex) parts.push(profile.preferred_sex);
  if (profile.min_age_weeks != null && profile.max_age_weeks != null) {
    parts.push(`${profile.min_age_weeks}-${profile.max_age_weeks} weeks`);
  }
  parts.push(profile.breeds.map((b) => b.breed).join(", "));
  return parts.join(" · ");
};

export const DashboardPage = () => {
  usePageTitle("Dashboard");
  const { user, token } = useAuth();

  const [queryInput, setQueryInput] = useState("");
  const [typeInput, setTypeInput] = useState("");
  const [search, setSearch] = useState({ q: "", animalType: "" });
  const [page, setPage] = useState(1);

  const [profiles, setProfiles] = useState<RescueProfile[]>([]);
  const [profileId, setProfileId] = useState<number | null>(null);

  const [results, setResults] = useState<AnimalPage | null>(null);
  const [matches, setMatches] = useState<RescueMatchPage | null>(null);
  const [breedSummary, setBreedSummary] = useState<BreedSummary | null>(null);
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    listRescueProfiles(token)
      .then(setProfiles)
      .catch(() => setError("Unable to load rescue profiles"));
  }, [token]);

  useEffect(() => {
    if (!token || profileId !== null) return;

    setIsLoading(true);
    searchAnimals(token, {
      q: search.q || undefined,
      animalType: search.animalType || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((data) => {
        setResults(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to load animals"))
      .finally(() => setIsLoading(false));
  }, [token, search, page, profileId]);

  // The chart covers the whole filtered set, so it refetches on new searches
  // but not on page turns.
  useEffect(() => {
    if (!token || profileId !== null) return;

    getBreedSummary(token, {
      q: search.q || undefined,
      animalType: search.animalType || undefined,
      limit: TOP_BREEDS,
    })
      .then(setBreedSummary)
      .catch(() => setBreedSummary(null));
  }, [token, search, profileId]);

  useEffect(() => {
    if (!token || profileId === null) return;

    setIsLoading(true);
    searchRescueMatches(token, profileId, { page, pageSize: PAGE_SIZE })
      .then((data) => {
        setMatches(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to load matches"))
      .finally(() => setIsLoading(false));
  }, [token, profileId, page]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSelectedAnimalId(null);
    setSearch({ q: queryInput.trim(), animalType: typeInput });
  };

  const handleProfileChange = (value: string) => {
    setPage(1);
    setSelectedAnimalId(null);
    setMatches(null);
    setProfileId(value ? Number(value) : null);
  };

  const handlePageChange = (delta: number) => {
    setSelectedAnimalId(null);
    setPage((p) => p + delta);
  };

  const activePage = profileId === null ? results : matches;
  const totalPages = activePage
    ? Math.max(1, Math.ceil(activePage.total / activePage.page_size))
    : 1;
  const selectedProfile = matches?.profile ?? profiles.find((p) => p.id === profileId) ?? null;

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p>
        Welcome, {user?.email}. You are signed in as {user?.role}.
      </p>

      <div className="search-bar">
        <label htmlFor="rescue-profile">Rescue profile:</label>
        <select
          id="rescue-profile"
          value={profileId ?? ""}
          onChange={(e) => handleProfileChange(e.target.value)}
        >
          <option value="">All animals</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {profileId === null && (
        <form onSubmit={handleSearch} className="search-bar">
          <input
            type="text"
            placeholder="Search by name, breed, or animal ID"
            aria-label="Search animals"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
          />
          <select
            aria-label="Animal type"
            value={typeInput}
            onChange={(e) => setTypeInput(e.target.value)}
          >
            <option value="">All types</option>
            {ANIMAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button type="submit">Search</button>
        </form>
      )}

      {profileId !== null && selectedProfile && (
        <p className="notice">
          Ranking {selectedProfile.animal_type.toLowerCase()}s for{" "}
          <strong>{selectedProfile.name}</strong>: {formatCriteria(selectedProfile)}
        </p>
      )}

      {error && <p className="form-error">{error}</p>}
      {isLoading && <p>Loading animals...</p>}

      {!isLoading && profileId === null && results && (
        <>
          <table>
            <thead>
              <tr>
                <th>Animal ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Breed</th>
                <th>Sex</th>
                <th>Age (weeks)</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {results.items.map((animal) => (
                <tr
                  key={animal.id}
                  className={animal.id === selectedAnimalId ? "selected-row" : undefined}
                  onClick={() => setSelectedAnimalId(animal.id)}
                >
                  <td>{animal.animal_id}</td>
                  <td>{animal.name ?? "—"}</td>
                  <td>{animal.animal_type}</td>
                  <td>{animal.breed}</td>
                  <td>{animal.sex_upon_outcome ?? "—"}</td>
                  <td>
                    {animal.age_upon_outcome_in_weeks != null
                      ? Math.round(animal.age_upon_outcome_in_weeks)
                      : "—"}
                  </td>
                  <td>{animal.outcome_type ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.items.length === 0 && <p>No animals match your search.</p>}
        </>
      )}

      {!isLoading && profileId !== null && matches && (
        <>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Score</th>
                <th>Animal ID</th>
                <th>Name</th>
                <th>Breed</th>
                <th>Sex</th>
                <th>Age (weeks)</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {matches.items.map((match, index) => (
                <tr
                  key={match.animal.id}
                  className={match.animal.id === selectedAnimalId ? "selected-row" : undefined}
                  onClick={() => setSelectedAnimalId(match.animal.id)}
                >
                  <td>{(matches.page - 1) * matches.page_size + index + 1}</td>
                  <td
                    title={`Breed ${match.breed_score} · Age ${match.age_score} · Sex ${match.sex_score} · Availability ${match.availability_score}`}
                  >
                    {match.score}
                  </td>
                  <td>{match.animal.animal_id}</td>
                  <td>{match.animal.name ?? "—"}</td>
                  <td>{match.animal.breed}</td>
                  <td>{match.animal.sex_upon_outcome ?? "—"}</td>
                  <td>
                    {match.animal.age_upon_outcome_in_weeks != null
                      ? Math.round(match.animal.age_upon_outcome_in_weeks)
                      : "—"}
                  </td>
                  <td>{match.animal.outcome_type ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {matches.items.length === 0 && <p>No candidates found for this profile.</p>}
        </>
      )}

      {!isLoading && activePage && (
        <div className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => handlePageChange(-1)}>
            Previous
          </button>
          <span>
            Page {activePage.page} of {totalPages} ({activePage.total} animals)
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => handlePageChange(1)}>
            Next
          </button>
        </div>
      )}

      {!isLoading && profileId === null && results && breedSummary && (
        <div className="dashboard-visuals">
          <BreedChart
            slices={breedSlicesFromSummary(breedSummary)}
            totalAnimals={breedSummary.total_animals}
          />
          <AnimalMap animals={results.items} selectedId={selectedAnimalId} />
        </div>
      )}

      {!isLoading && profileId !== null && matches && matches.items.length > 0 && (
        <div className="dashboard-visuals">
          <BreedChart
            slices={breedSlicesFromMatches(matches)}
            totalAnimals={matches.items.length}
          />
          <AnimalMap
            animals={matches.items.map((match) => match.animal)}
            selectedId={selectedAnimalId}
          />
        </div>
      )}
    </div>
  );
};
