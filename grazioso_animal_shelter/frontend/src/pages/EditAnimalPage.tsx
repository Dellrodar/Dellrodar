import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  type Animal,
  type AnimalCreate,
  archiveAnimal,
  getAnimal,
  unarchiveAnimal,
  updateAnimal,
} from "../api/animals";
import { ApiError } from "../api/client";
import { getLookupValues, type LookupValues } from "../api/lookups";
import { useAuth } from "../auth/AuthContext";
import { AnimalForm, buildAnimalUpdate } from "../components/AnimalForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { usePageTitle } from "../hooks/usePageTitle";

export const EditAnimalPage = () => {
  usePageTitle("Edit Animal");
  const { token } = useAuth();
  const { id } = useParams();
  const animalPk = Number(id);

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [lookups, setLookups] = useState<LookupValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    if (!token) return;

    Promise.all([getAnimal(token, animalPk), getLookupValues(token)])
      .then(([loadedAnimal, loadedLookups]) => {
        setAnimal(loadedAnimal);
        setLookups(loadedLookups);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to load animal"));
  }, [token, animalPk]);

  const isArchived = animal?.archived_at != null;

  const handleSave = async (payload: AnimalCreate) => {
    if (!token || !animal) return;

    const changes = buildAnimalUpdate(animal, payload);
    if (Object.keys(changes).length === 0) {
      setSuccess("No changes to save");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const updated = await updateAnimal(token, animal.id, changes);
      setAnimal(updated);
      setSuccess("Animal updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update animal");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!token || !animal) return;

    setError(null);
    setIsArchiving(true);
    try {
      const updated = isArchived
        ? await unarchiveAnimal(token, animal.id)
        : await archiveAnimal(token, animal.id);
      setAnimal(updated);
      setSuccess(isArchived ? "Animal unarchived" : "Animal archived");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update archive state");
    } finally {
      setIsArchiving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Edit Animal
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {isArchived && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This animal is archived and hidden from search results.
        </Alert>
      )}
      {animal && lookups ? (
        <>
          <AnimalForm
            key={animal.id}
            initial={animal}
            lookups={lookups}
            submitLabel="Save changes"
            isSubmitting={isSaving}
            onSubmit={handleSave}
          />
          <Paper variant="outlined" sx={{ mt: 4, p: 2 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              {isArchived ? "Unarchive" : "Archive"}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {isArchived
                ? "Unarchiving returns this animal to search and match results."
                : "Archiving hides this animal from search and match results. The record is kept and can be unarchived later."}
            </Typography>
            <Button
              variant="outlined"
              color={isArchived ? "primary" : "error"}
              onClick={() => setConfirmOpen(true)}
            >
              {isArchived ? "Unarchive animal" : "Archive animal"}
            </Button>
          </Paper>
          <ConfirmDialog
            open={confirmOpen}
            title={`${isArchived ? "Unarchive" : "Archive"} ${animal.animal_id}?`}
            message={
              isArchived
                ? "This animal will appear in search and match results again."
                : "This animal will be hidden from search and match results."
            }
            confirmLabel={isArchived ? "Unarchive" : "Archive"}
            isConfirming={isArchiving}
            onConfirm={handleArchiveToggle}
            onCancel={() => setConfirmOpen(false)}
          />
        </>
      ) : (
        !error && <Skeleton variant="rounded" height={320} />
      )}
      <Snackbar
        open={success !== null}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        message={success}
      />
    </Box>
  );
};
