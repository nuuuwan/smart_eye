import { useState } from "react";
import { CssBaseline } from "@mui/material";
import { CryptoContext } from "./nonview/core/CryptoContext";
import PasswordPage from "./view/pages/PasswordPage";
import HomePage from "./view/pages/HomePage";

function App() {
  const [cryptoKey, setCryptoKey] = useState(null);

  if (!cryptoKey) {
    return (
      <>
        <CssBaseline />
        <PasswordPage onAuthenticated={setCryptoKey} />
      </>
    );
  }

  return (
    <CryptoContext.Provider value={cryptoKey}>
      <CssBaseline />
      <HomePage />
    </CryptoContext.Provider>
  );
}

export default App;
