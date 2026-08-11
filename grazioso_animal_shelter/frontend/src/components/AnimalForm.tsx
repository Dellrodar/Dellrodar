import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { FormEvent } from "react";
import { useState } from "react";
import type { Animal, AnimalCreate, AnimalUpdate } from "../api/animals";
import type { LookupValues } from "../api/lookups";

interface AnimalFormValues {
  animal_id: string;
  name: string;
  animal_type: string;
  breed: string | null;
  color: string;
  sex_upon_outcome: string;
  date_of_birth: string;
  outcome_type: string;
  outcome_subtype: string;
  outcome_datetime: string;
  age_upon_outcome_in_weeks: string;
  location_lat: string;
  location_long: string;
}

const pad = (value: number): string => String(value).padStart(2, "0");

// datetime-local inputs hold local wall-clock time with no zone, so the ISO
// timestamp from the API has to be rendered in local time going in and
// converted back to UTC on the way out.
const toDatetimeLocalValue = (iso: string | null): string => {
  if (!iso) return "";
  const parsed = new Date(iso);
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(
    parsed.getHours(),
  )}:${pad(parsed.getMinutes())}`;
};

const toFormValues = (initial?: Animal): AnimalFormValues => ({
  animal_id: initial?.animal_id ?? "",
  name: initial?.name ?? "",
  animal_type: initial?.animal_type ?? "",
  breed: initial?.breed ?? null,
  color: initial?.color ?? "",
  sex_upon_outcome: initial?.sex_upon_outcome ?? "",
  date_of_birth: initial?.date_of_birth ?? "",
  outcome_type: initial?.outcome_type ?? "",
  outcome_subtype: initial?.outcome_subtype ?? "",
  outcome_datetime: toDatetimeLocalValue(initial?.outcome_datetime ?? null),
  age_upon_outcome_in_weeks:
    initial?.age_upon_outcome_in_weeks != null ? String(initial.age_upon_outcome_in_weeks) : "",
  location_lat: initial?.location_lat != null ? String(initial.location_lat) : "",
  location_long: initial?.location_long != null ? String(initial.location_long) : "",
});

const emptyToNull = (value: string): string | null => (value === "" ? null : value);

const numberOrNull = (value: string): number | null => (value === "" ? null : Number(value));

const toAnimalCreate = (values: AnimalFormValues): AnimalCreate => ({
  animal_id: values.animal_id,
  name: emptyToNull(values.name),
  animal_type: values.animal_type,
  breed: values.breed ?? "",
  color: emptyToNull(values.color),
  sex_upon_outcome: emptyToNull(values.sex_upon_outcome),
  date_of_birth: emptyToNull(values.date_of_birth),
  outcome_type: emptyToNull(values.outcome_type),
  outcome_subtype: emptyToNull(values.outcome_subtype),
  outcome_datetime: values.outcome_datetime
    ? new Date(values.outcome_datetime).toISOString()
    : null,
  age_upon_outcome_in_weeks: numberOrNull(values.age_upon_outcome_in_weeks),
  location_lat: numberOrNull(values.location_lat),
  location_long: numberOrNull(values.location_long),
});

// Diffs against the original run through the same form-value round trip, so a
// field the user never touched always compares equal (e.g. timestamps lose
// their seconds in a datetime-local input either way).
export const buildAnimalUpdate = (original: Animal, payload: AnimalCreate): AnimalUpdate => {
  const baseline = toAnimalCreate(toFormValues(original));
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(payload) as (keyof AnimalCreate)[]) {
    if (payload[key] !== baseline[key]) {
      changes[key] = payload[key];
    }
  }
  return changes as AnimalUpdate;
};

interface AnimalFormProps {
  initial?: Animal;
  lookups: LookupValues;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (payload: AnimalCreate) => void;
}

export const AnimalForm = ({
  initial,
  lookups,
  submitLabel,
  isSubmitting,
  onSubmit,
}: AnimalFormProps) => {
  const [values, setValues] = useState<AnimalFormValues>(() => toFormValues(initial));

  const setField = (field: keyof AnimalFormValues, value: string | null) =>
    setValues((current) => ({ ...current, [field]: value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(toAnimalCreate(values));
  };

  return (
    <Stack component="form" onSubmit={handleSubmit} sx={{ gap: 2 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2,
        }}
      >
        <TextField
          label="Animal ID"
          value={values.animal_id}
          onChange={(e) => setField("animal_id", e.target.value)}
          required
          slotProps={{ htmlInput: { maxLength: 20 } }}
        />
        <TextField
          label="Name"
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
        <TextField
          label="Animal type"
          select
          value={values.animal_type}
          onChange={(e) => setField("animal_type", e.target.value)}
          required
        >
          {lookups.animal_types.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>
        <Autocomplete
          options={lookups.breeds}
          value={values.breed}
          onChange={(_, value) => setField("breed", value)}
          renderInput={(params) => <TextField {...params} label="Breed" required />}
        />
        <TextField
          label="Color"
          value={values.color}
          onChange={(e) => setField("color", e.target.value)}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
        <TextField
          label="Sex upon outcome"
          select
          value={values.sex_upon_outcome}
          onChange={(e) => setField("sex_upon_outcome", e.target.value)}
        >
          <MenuItem value="">None</MenuItem>
          {lookups.sexes.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Date of birth"
          type="date"
          value={values.date_of_birth}
          onChange={(e) => setField("date_of_birth", e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Outcome type"
          select
          value={values.outcome_type}
          onChange={(e) => setField("outcome_type", e.target.value)}
        >
          <MenuItem value="">None</MenuItem>
          {lookups.outcome_types.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Outcome subtype"
          value={values.outcome_subtype}
          onChange={(e) => setField("outcome_subtype", e.target.value)}
          slotProps={{ htmlInput: { maxLength: 50 } }}
        />
        <TextField
          label="Outcome date and time"
          type="datetime-local"
          value={values.outcome_datetime}
          onChange={(e) => setField("outcome_datetime", e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Age upon outcome in weeks"
          type="number"
          value={values.age_upon_outcome_in_weeks}
          onChange={(e) => setField("age_upon_outcome_in_weeks", e.target.value)}
          slotProps={{ htmlInput: { min: 0, step: "any" } }}
        />
        <TextField
          label="Latitude"
          type="number"
          value={values.location_lat}
          onChange={(e) => setField("location_lat", e.target.value)}
          slotProps={{ htmlInput: { min: -90, max: 90, step: "any" } }}
        />
        <TextField
          label="Longitude"
          type="number"
          value={values.location_long}
          onChange={(e) => setField("location_long", e.target.value)}
          slotProps={{ htmlInput: { min: -180, max: 180, step: "any" } }}
        />
      </Box>
      <Button
        type="submit"
        variant="contained"
        size="large"
        loading={isSubmitting}
        sx={{ alignSelf: "flex-start" }}
      >
        {submitLabel}
      </Button>
    </Stack>
  );
};
