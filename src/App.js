import { useEffect, useState } from "react";
import { Box, CircularProgress, CssBaseline } from "@mui/material";
import { CryptoContext } from "./nonview/core/CryptoContext";
import PasswordPage from "./view/pages/PasswordPage";
import HomePage from "./view/pages/HomePage";
import { unlockWithPassword } from "./nonview/core/DocumentAPI";

const LS_KEY = "smart-eye-password";

function App() {
  const [cryptoKey, setCryptoKey] = useState(null);
  const [autoUnlocking, setAutoUnlocking] = useState(true);

  // On mount: try to auto-unlock with saved password
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) { setAutoUnlocking(false); return; }
    unlockWithPassword(saved)
      .then((key) => { if (key) setCryptoKey(key); })
      .catch(() => {})
      .finally(() => setAutoUnlocking(false));
  }, []);

  const handleAuthenticated = (key, password) => {
    localStorage.setItem(LS_KEY, password);
    setCryptoKey(key);
  };

  const handleSignOut = () => {
    localStorage.removeItem(LS_KEY);
    setCryptoKey(null);
  };

  if (autoUnlocking) {
    return (
      <>
        <CssBaseline />
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (!cryptoKey) {
    return (
      <>
        <CssBaseline />
        <PasswordPage onAuthenticated={handleAuthenticated} />
      </>
    );
  }

  return (
    <CryptoContext.Provider value={cryptoKey}>
      <CssBaseline />
      <HomePage onSignOut={handleSignOut} />
    </CryptoContext.Provider>
  );
}

export default App;
