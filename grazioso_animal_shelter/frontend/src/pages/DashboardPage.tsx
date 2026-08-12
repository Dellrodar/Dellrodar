import Search from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import type { ChipProps } from "@mui/material/Chip";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";
import { type FormEvent, useEffect, useState } from "react";
import type { Animal } from "../api/animals";
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

const ANIMAL_TYPES = ["Dog", "Cat", "Bird", "Livestock", "Other"];
const TOP_BREEDS = 5;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const OUTCOME_COLORS: Record<string, ChipProps["color"]> = {
  Adoption: "success",
  "Return to Owner": "primary",
  Transfer: "info",
  Euthanasia: "error",
  Died: "error",
};

interface MatchRow extends Animal {
  rank: number;
  score: number;
  breed_score: number;
  age_score: number;
  sex_score: number;
  availability_score: number;
}

const outcomeCell = (value: string | null) =>
  value ? (
    <Chip
      size="small"
      variant="outlined"
      color={OUTCOME_COLORS[value] ?? "default"}
      label={value}
    />
  ) : (
    "—"
  );

const animalFieldColumns: GridColDef[] = [
  { field: "animal_id", headerName: "Animal ID", width: 110, sortable: false },
  {
    field: "name",
    headerName: "Name",
    flex: 1,
    minWidth: 110,
    sortable: false,
    renderCell: (params) => params.value ?? "—",
  },
  { field: "animal_type", headerName: "Type", width: 90, sortable: false },
  { field: "breed", headerName: "Breed", flex: 2, minWidth: 200, sortable: false },
  {
    field: "sex_upon_outcome",
    headerName: "Sex",
    width: 130,
    sortable: false,
    renderCell: (params) => params.value ?? "—",
  },
  {
    field: "age_upon_outcome_in_weeks",
    headerName: "Age (weeks)",
    width: 110,
    sortable: false,
    renderCell: (params) => (params.value != null ? Math.round(params.value as number) : "—"),
  },
  {
    field: "outcome_type",
    headerName: "Outcome",
    width: 150,
    sortable: false,
    renderCell: (params) => outcomeCell(params.value as string | null),
  },
];

const animalColumns: GridColDef[] = animalFieldColumns.filter((c) => c.field !== "animal_type");

const matchColumns: GridColDef[] = [
  { field: "rank", headerName: "Rank", width: 70, sortable: false },
  {
    field: "score",
    headerName: "Score",
    width: 180,
    sortable: false,
    renderCell: (params) => {
      const row = params.row as MatchRow;
      return (
        <Tooltip
          title={`Breed ${row.breed_score} · Age ${row.age_score} · Sex ${row.sex_score} · Availability ${row.availability_score}`}
        >
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", height: "100%" }}
          >
            <LinearProgress
              variant="determinate"
              value={Math.max(0, Math.min(100, row.score))}
              sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
            />
            <Typography variant="body2">{row.score}</Typography>
          </Box>
        </Tooltip>
      );
    },
  },
  ...animalColumns,
];

const breedSlicesFromSummary = (summary: BreedSummary): BreedSlice[] => {
  const slices = summary.items.map((item) => ({ label: item.breed, count: item.count }));
  if (summary.other_count > 0) slices.push({ label: "Other", count: summary.other_count });
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
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

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
      pageSize,
    })
      .then((data) => {
        setResults(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to load animals"))
      .finally(() => setIsLoading(false));
  }, [token, search, page, pageSize, profileId]);

  // The chart covers the whole filtered set — or, in match mode, the profile's
  // full candidate pool, scoped server-side by profile_id — so it refetches on
  // new searches and profile changes but not on page turns.
  useEffect(() => {
    if (!token) return;

    const params =
      profileId !== null
        ? { profileId, limit: TOP_BREEDS }
        : {
            q: search.q || undefined,
            animalType: search.animalType || undefined,
            limit: TOP_BREEDS,
          };

    getBreedSummary(token, params)
      .then(setBreedSummary)
      .catch(() => setBreedSummary(null));
  }, [token, search, profileId]);

  useEffect(() => {
    if (!token || profileId === null) return;

    setIsLoading(true);
    searchRescueMatches(token, profileId, { page, pageSize })
      .then((data) => {
        setMatches(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to load matches"))
      .finally(() => setIsLoading(false));
  }, [token, profileId, page, pageSize]);

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

  const selectionModel: GridRowSelectionModel = {
    type: "include",
    ids: selectedAnimalId != null ? new Set([selectedAnimalId]) : new Set(),
  };

  const handleSelectionChange = (model: GridRowSelectionModel) => {
    const [first] = model.ids;
    setSelectedAnimalId(model.type === "include" && typeof first === "number" ? first : null);
  };

  const matchRows: MatchRow[] = matches
    ? matches.items.map((match, index) => ({
        ...match.animal,
        rank: (matches.page - 1) * matches.page_size + index + 1,
        score: match.score,
        breed_score: match.breed_score,
        age_score: match.age_score,
        sex_score: match.sex_score,
        availability_score: match.availability_score,
      }))
    : [];

  const selectedProfile = matches?.profile ?? profiles.find((p) => p.id === profileId) ?? null;

  const sharedGridProps = {
    paginationMode: "server" as const,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    paginationModel: { page: page - 1, pageSize },
    loading: isLoading,
    disableColumnMenu: true,
    disableVirtualization: true,
    rowSelectionModel: selectionModel,
    onRowSelectionModelChange: handleSelectionChange,
    onPaginationModelChange: (model: { page: number; pageSize: number }) => {
      setSelectedAnimalId(null);
      setPage(model.page + 1);
      setPageSize(model.pageSize);
    },
    slotProps: {
      loadingOverlay: {
        variant: "linear-progress" as const,
        noRowsVariant: "skeleton" as const,
      },
    },
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography color="text.secondary">
        Welcome, {user?.email}. You are signed in as {user?.role}.
      </Typography>

      <Paper
        variant="outlined"
        sx={{ p: 2, mt: 3, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}
      >
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="rescue-profile-label">Rescue profile</InputLabel>
          <Select
            labelId="rescue-profile-label"
            label="Rescue profile"
            value={profileId === null ? "" : String(profileId)}
            onChange={(e) => handleProfileChange(e.target.value)}
          >
            <MenuItem value="">All animals</MenuItem>
            {profiles.map((p) => (
              <MenuItem key={p.id} value={String(p.id)}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {profileId === null && (
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{ display: "flex", flexWrap: "wrap", gap: 2, flexGrow: 1 }}
          >
            <TextField
              size="small"
              placeholder="Search by name, breed, or animal ID"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 220 }}
              slotProps={{
                htmlInput: { "aria-label": "Search animals" },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="animal-type-label">Animal type</InputLabel>
              <Select
                labelId="animal-type-label"
                label="Animal type"
                value={typeInput}
                onChange={(e) => setTypeInput(e.target.value)}
              >
                <MenuItem value="">All types</MenuItem>
                {ANIMAL_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" disableElevation>
              Search
            </Button>
          </Box>
        )}
      </Paper>

      {profileId !== null && selectedProfile && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Ranking {selectedProfile.animal_type.toLowerCase()}s for{" "}
          <strong>{selectedProfile.name}</strong>: {formatCriteria(selectedProfile)}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {profileId === null && (
        <Box sx={{ height: 560, mt: 2 }}>
          <DataGrid
            {...sharedGridProps}
            rows={results?.items ?? []}
            columns={animalFieldColumns}
            rowCount={results?.total ?? 0}
            localeText={{ noRowsLabel: "No animals match your search." }}
          />
        </Box>
      )}

      {profileId !== null && (
        <Box sx={{ height: 560, mt: 2 }}>
          <DataGrid
            {...sharedGridProps}
            rows={matchRows}
            columns={matchColumns}
            rowCount={matches?.total ?? 0}
            localeText={{ noRowsLabel: "No candidates found for this profile." }}
          />
        </Box>
      )}

      {profileId === null && results && breedSummary && (
        <div className="dashboard-visuals">
          <BreedChart
            slices={breedSlicesFromSummary(breedSummary)}
            totalAnimals={breedSummary.total_animals}
          />
          <AnimalMap animals={results.items} selectedId={selectedAnimalId} />
        </div>
      )}

      {profileId !== null && matches && matches.items.length > 0 && breedSummary && (
        <div className="dashboard-visuals">
          <BreedChart
            slices={breedSlicesFromSummary(breedSummary)}
            totalAnimals={breedSummary.total_animals}
          />
          <AnimalMap
            animals={matches.items.map((match) => match.animal)}
            selectedId={selectedAnimalId}
          />
        </div>
      )}
    </Box>
  );
};
