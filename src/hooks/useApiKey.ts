import { useState, useEffect } from "react";

const STORAGE_KEY = "openapi_token";
const EVENT_NAME = "openapi-token-change";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState("");

  useEffect(() => {
    setApiKeyState(sessionStorage.getItem(STORAGE_KEY) ?? "");
    const handler = (e: Event) =>
      setApiKeyState((e as CustomEvent<string>).detail ?? "");
    document.addEventListener(EVENT_NAME, handler);
    return () => document.removeEventListener(EVENT_NAME, handler);
  }, []);

  const setApiKey = (key: string) => {
    sessionStorage.setItem(STORAGE_KEY, key);
    setApiKeyState(key);
    document.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: key }));
  };

  return { apiKey, setApiKey };
}
