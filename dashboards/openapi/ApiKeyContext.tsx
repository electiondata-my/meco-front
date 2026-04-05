"use client";
import { createContext, useContext, useState, FunctionComponent, ReactNode } from "react";

interface ApiKeyContextValue {
  apiKey: string;
  setApiKey: (key: string) => void;
}

const ApiKeyContext = createContext<ApiKeyContextValue>({
  apiKey: "",
  setApiKey: () => {},
});

export const ApiKeyProvider: FunctionComponent<{ children: ReactNode }> = ({
  children,
}) => {
  const [apiKey, setApiKey] = useState("");
  return (
    <ApiKeyContext.Provider value={{ apiKey, setApiKey }}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export const useApiKey = () => useContext(ApiKeyContext);
