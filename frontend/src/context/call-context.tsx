"use client";

/**
 * Call state context provider — scaffolding only.
 *
 * TODO: T12 — Wire up useReducer with callReducer and expose via context.
 */

import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { CallState, CallAction } from "@/types";
import { callReducer, INITIAL_CALL_STATE } from "./call-reducer";

interface CallContextValue {
  state: CallState;
  dispatch: React.Dispatch<CallAction>;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(callReducer, INITIAL_CALL_STATE);

  return (
    <CallContext.Provider value={{ state, dispatch }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCallContext(): CallContextValue {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCallContext must be used within a CallProvider");
  }
  return context;
}
