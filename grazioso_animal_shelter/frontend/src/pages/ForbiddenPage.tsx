import Block from "@mui/icons-material/Block";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";

export const ForbiddenPage = () => {
  usePageTitle("Forbidden");

  return (
    <Stack sx={{ alignItems: "center", textAlign: "center", gap: 2, mt: 8 }}>
      <Block color="error" sx={{ fontSize: 64 }} />
      <Typography variant="h4" component="h1">
        403 — Forbidden
      </Typography>
      <Typography color="text.secondary">You do not have permission to view this page.</Typography>
      <Button component={RouterLink} to="/dashboard" variant="contained" disableElevation>
        Back to dashboard
      </Button>
    </Stack>
  );
};
