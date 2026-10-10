"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type IntroPhase = "checking" | "showing" | "finished";
const IntroPresentationContext = createContext<{
  phase: IntroPhase;
  setPhase: (phase: IntroPhase) => void;
}>({ phase: "finished", setPhase: () => undefined });

export function IntroPresentationProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<IntroPhase>("checking");
  const value = useMemo(() => ({ phase, setPhase }), [phase]);
  return <IntroPresentationContext.Provider value={value}>{children}</IntroPresentationContext.Provider>;
}

export const useIntroPresentation = () => useContext(IntroPresentationContext);
