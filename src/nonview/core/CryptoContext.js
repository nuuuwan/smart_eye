import { createContext, useContext } from "react";

export const CryptoContext = createContext(null);

export function useCryptoKey() {
  return useContext(CryptoContext);
}
