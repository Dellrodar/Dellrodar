import { type FormEvent, useEffect, useState } from "react";
import { type AnimalPage, searchAnimals } from "../api/animals";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const PAGE_SIZE = 10;
const ANIMAL_TYPES = ["Dog", "Cat", "Bird", "Livestock", "Other"];

export const DashboardPage = () => {
  const { user, token } = useAuth();

  const [queryInput, setQueryInput] = useState("");
  const [typeInput, setTypeInput] = useState("");
  const [search, setSearch] = useState({ q: "", animalType: "" });
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<AnimalPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

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
  }, [token, search, page]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch({ q: queryInput.trim(), animalType: typeInput });
  };

  const totalPages = results ? Math.max(1, Math.ceil(results.total / results.page_size)) : 1;

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p>
        Welcome, {user?.email}. You are signed in as {user?.role}.
      </p>

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

      {error && <p className="form-error">{error}</p>}
      {isLoading && <p>Loading animals...</p>}

      {!isLoading && results && (
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
                <tr key={animal.id}>
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

          <div className="pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {results.page} of {totalPages} ({results.total} animals)
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};
