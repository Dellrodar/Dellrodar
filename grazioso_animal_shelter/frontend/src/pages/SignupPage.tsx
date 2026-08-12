import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { signup } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthCard } from "../components/AuthCard";
import { usePageTitle } from "../hooks/usePageTitle";

export const SignupPage = () => {
  usePageTitle("Sign up");
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signup(email, password);
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign up");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard title="Sign up">
      <Stack component="form" onSubmit={handleSubmit} sx={{ gap: 2 }}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          autoComplete="email"
          autoFocus
          slotProps={{ inputLabel: { required: false } }}
        />
        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          autoComplete="new-password"
          helperText="At least 8 characters"
          slotProps={{
            inputLabel: { required: false },
            htmlInput: { minLength: 8 },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((current) => !current)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        {error && (
          <Alert severity="error" role="alert">
            {error}
          </Alert>
        )}
        <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
          Sign up
        </Button>
      </Stack>
      <Typography variant="body2" sx={{ textAlign: "center" }}>
        Already have an account?{" "}
        <Link component={RouterLink} to="/login">
          Log in
        </Link>
      </Typography>
    </AuthCard>
  );
};
