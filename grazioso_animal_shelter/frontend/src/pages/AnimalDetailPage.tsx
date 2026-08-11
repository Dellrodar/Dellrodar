import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { type Animal, getAnimal } from "../api/animals";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { OutcomeChip } from "../components/OutcomeChip";
import { usePageTitle } from "../hooks/usePageTitle";

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <Box>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography component="div">{children}</Typography>
  </Box>
);

const orDash = (value: string | number | null): string =>
  value == null || value === "" ? "—" : String(value);

export const AnimalDetailPage = () => {
  usePageTitle("Animal Details");
  const { token, user } = useAuth();
  const { id } = useParams();
  const animalPk = Number(id);

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    getAnimal(token, animalPk)
      .then(setAnimal)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to load animal"));
  }, [token, animalPk]);

  const canEdit = user?.role === "staff" || user?.role === "admin";

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="h4" component="h1">
          Animal Details
        </Typography>
        {animal?.archived_at != null && <Chip label="Archived" color="warning" size="small" />}
        {animal && canEdit && (
          <Button
            component={RouterLink}
            to={`/animals/${animal.id}/edit`}
            variant="contained"
            sx={{ ml: "auto" }}
          >
            Edit
          </Button>
        )}
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {animal ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
              gap: 2,
            }}
          >
            <Field label="Animal ID">{animal.animal_id}</Field>
            <Field label="Name">{orDash(animal.name)}</Field>
            <Field label="Type">{animal.animal_type}</Field>
            <Field label="Breed">{animal.breed}</Field>
            <Field label="Color">{orDash(animal.color)}</Field>
            <Field label="Sex upon outcome">{orDash(animal.sex_upon_outcome)}</Field>
            <Field label="Date of birth">{orDash(animal.date_of_birth)}</Field>
            <Field label="Outcome">
              <OutcomeChip value={animal.outcome_type} />
            </Field>
            <Field label="Outcome subtype">{orDash(animal.outcome_subtype)}</Field>
            <Field label="Outcome date">
              {animal.outcome_datetime ? new Date(animal.outcome_datetime).toLocaleString() : "—"}
            </Field>
            <Field label="Age upon outcome (weeks)">
              {orDash(animal.age_upon_outcome_in_weeks)}
            </Field>
            <Field label="Latitude">{orDash(animal.location_lat)}</Field>
            <Field label="Longitude">{orDash(animal.location_long)}</Field>
          </Box>
        </Paper>
      ) : (
        !error && <Skeleton variant="rounded" height={240} />
      )}
    </Box>
  );
};
