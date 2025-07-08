import { useReducer, useRef } from "react";

type MutatorType = "SET" | "RESET";

interface SingleMutator<K extends keyof T, T> {
  key: K;
  value: T[K];
}

// Enhance reducer to be generic and enforce action payload types based on the state type
function reducer<T>(
  state: T,
  action: { type: MutatorType; payload: SingleMutator<keyof T, T> | T },
) {
  switch (action.type) {
    case "SET":
      const { key, value } = action.payload as SingleMutator<keyof T, T>;
      return { ...state, [key]: value };
    case "RESET":
      return { ...state, ...(action.payload as T) };
    default:
      throw new Error("Unrecognized dispatch command");
  }
}

/**
 * Universal state hook. General purpose state management
 * Accept a generic type, T which represents the type of the state
 * @param data State
 * @returns data, setData
 */
export const useData = <T extends Record<string, any>>(data: T) => {
  const original = useRef<T>(data);

  const [state, dispatch] = useReducer(reducer, data);

  const setData = <K extends keyof T>(key: K, value: T[K]) => {
    dispatch({ type: "SET", payload: { key, value } });
  };

  const reset = (override?: T) => {
    dispatch({ type: "RESET", payload: override ?? original.current });
  };

  return {
    data: state as T,
    setData,
    reset,
  };
};
