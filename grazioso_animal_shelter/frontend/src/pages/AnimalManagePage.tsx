import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type Animal, searchAnimals } from "../api/animals";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";

const SEARCH_DEBOUNCE_MS = 300;
const RESULT_LIMIT = 20;

export const AnimalManagePage = () => {
  usePageTitle("Manage Animals");
  const { token } = useAuth();
  const navigate = useNavigate();

  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<Animal[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const handle = setTimeout(() => {
      setIsLoading(true);
      searchAnimals(token, {
        q: inputValue || undefined,
        pageSize: RESULT_LIMIT,
        includeArchived,
      })
        .then((page) => {
          setOptions(page.items);
          setError(null);
        })
        .catch((err) =>
          setError(err instanceof ApiError ? err.message : "Unable to search animals"),
        )
        .finally(() => setIsLoading(false));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [token, inputValue, includeArchived]);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Manage Animals
      </Typography>
      <Typography sx={{ mb: 2 }}>
        Search for an animal by name, breed, or animal ID, then select it to edit the record.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: 2, display: "grid", gap: 2 }}>
        <Autocomplete
          options={options}
          filterOptions={(sameOptions) => sameOptions}
          getOptionLabel={(option) =>
            `${option.animal_id} — ${option.name ?? "Unnamed"} (${option.breed})`
          }
          isOptionEqualToValue={(option, value) => option.id === value.id}
          loading={isLoading}
          noOptionsText="No animals found"
          inputValue={inputValue}
          onInputChange={(_, value) => setInputValue(value)}
          value={null}
          onChange={(_, value) => {
            if (value) navigate(`/animals/${value.id}/edit`);
          }}
          renderOption={(props, option) => {
            const { key, ...optionProps } = props;
            return (
              <Box component="li" key={key} {...optionProps}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                  <span>
                    {option.animal_id} — {option.name ?? "Unnamed"} ({option.breed})
                  </span>
                  {option.archived_at != null && (
                    <Chip label="Archived" color="warning" size="small" sx={{ ml: "auto" }} />
                  )}
                </Box>
              </Box>
            );
          }}
          renderInput={(params) => <TextField {...params} label="Search animals" />}
        />
        <FormControlLabel
          control={
            <Switch
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
          }
          label="Include archived"
        />
      </Paper>
    </Box>
  );
};
