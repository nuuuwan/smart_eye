import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import {
  createConfig,
  fetchConfig,
  unlockWithPassword,
} from "../../nonview/core/DocumentAPI";

/**
 * PasswordPage
 *
 * First visit  → shows two fields (password + confirm) to set up encryption.
 * Return visit → shows one field to unlock.
 *
 * Props:
 *   onAuthenticated(cryptoKey) — called when password verified/created
 */
export default function PasswordPage({ onAuthenticated }) {
  const [loading, setLoading] = useState(true); // checking config
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Determine whether a password has been set before
  useEffect(() => {
    fetchConfig()
      .then((cfg) => setIsFirstTime(!cfg || !cfg.salt))
      .catch(() => setIsFirstTime(true))
      .finally(() => setLoading(false));
  }, []);

  const passwordsMatch = password && confirm && password === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password) return setError("Please enter a password.");
    if (!passwordsMatch) return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      const cryptoKey = isFirstTime
        ? await createConfig(password)
        : await unlockWithPassword(password);

      if (!cryptoKey) {
        setError("Incorrect password. Please try again.");
        return;
      }
      onAuthenticated(cryptoKey, password);
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.100",
        px: 2,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 380,
          borderRadius: 3,
        }}
      >
        {/* Icon + title */}
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <LockIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
          <Typography variant="h5" fontWeight={700}>
            Smart Eye
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {isFirstTime
              ? "Create a password to encrypt your documents."
              : "Enter your password to unlock your documents."}
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Password"
            type="password"
            fullWidth
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
            sx={{ mb: 2 }}
          />

          <TextField
            label="Confirm Password"
            type="password"
            fullWidth
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="current-password"
            error={confirm.length > 0 && password !== confirm}
            helperText={confirm.length > 0 && password !== confirm ? "Passwords do not match" : ""}
            sx={{ mb: 2 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={submitting || !passwordsMatch}
            sx={{ borderRadius: 2, py: 1.5 }}
          >
            {submitting ? (
              <CircularProgress size={22} color="inherit" />
            ) : isFirstTime ? (
              "Create Password"
            ) : (
              "Unlock"
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
