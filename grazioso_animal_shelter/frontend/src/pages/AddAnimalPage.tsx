import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type AnimalCreate, createAnimal } from "../api/animals";
import { ApiError } from "../api/client";
import { getLookupValues, type LookupValues } from "../api/lookups";
import { useAuth } from "../auth/AuthContext";
import { AnimalForm } from "../components/AnimalForm";
import { usePageTitle } from "../hooks/usePageTitle";

export const AddAnimalPage = () => {
  usePageTitle("Add Animal");
  const { token } = useAuth();
  const navigate = useNavigate();

  const [lookups, setLookups] = useState<LookupValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;

    getLookupValues(token)
      .then(setLookups)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Unable to load lookup values"),
      );
  }, [token]);

  const handleSubmit = async (payload: AnimalCreate) => {
    if (!token) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const created = await createAnimal(token, payload);
      navigate(`/animals/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create animal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Add Animal
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {lookups ? (
        <AnimalForm
          lookups={lookups}
          submitLabel="Create animal"
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      ) : (
        !error && <Skeleton variant="rounded" height={320} />
      )}
    </Box>
  );
};
