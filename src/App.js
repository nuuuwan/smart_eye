import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress, CssBaseline } from "@mui/material";
import { CryptoContext } from "./nonview/core/CryptoContext";
import PasswordPage from "./view/pages/PasswordPage";
import HomePage from "./view/pages/HomePage";
import DocumentPage from "./view/pages/DocumentPage";
import { unlockWithPassword } from "./nonview/core/DocumentAPI";

const LS_KEY = "smart-eye-password";

function App() {
  const [cryptoKey, setCryptoKey] = useState(null);
  const [autoUnlocking, setAutoUnlocking] = useState(true);

  // On mount: try to auto-unlock with saved password
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) {
      setAutoUnlocking(false);
      return;
    }
    unlockWithPassword(saved)
      .then((key) => {
        if (key) setCryptoKey(key);
        setAutoUnlocking(false);
      })
      .catch(() => {
        setAutoUnlocking(false);
      });
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
      </>
    );
  }

  return (
    <BrowserRouter basename="/smart_eye">
      <CssBaseline />
      <CryptoContext.Provider value={cryptoKey}>
        <Routes>
          {/* Login */}
          <Route
            path="/login"
            element={
              cryptoKey ? (
                <Navigate to="/docs" replace />
              ) : (
                <PasswordPage onAuthenticated={handleAuthenticated} />
              )
            }
          />

          {/* Documents list */}
          <Route
            path="/docs"
            element={
              !cryptoKey ? (
                <Navigate to="/login" replace />
              ) : (
                <HomePage onSignOut={handleSignOut} />
              )
            }
          />

          {/* Individual document */}
          <Route
            path="/doc/:id"
            element={
              !cryptoKey ? (
                <Navigate to="/login" replace />
              ) : (
                <DocumentPage onSignOut={handleSignOut} />
              )
            }
          />

          {/* Fallback */}
          <Route
            path="*"
            element={<Navigate to={cryptoKey ? "/docs" : "/login"} replace />}
          />
        </Routes>
      </CryptoContext.Provider>
    </BrowserRouter>
  );
}

export default App;
