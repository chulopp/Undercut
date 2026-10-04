"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { OnboardingModal } from "@/components/dashboard/OnboardingModal";

interface OnboardingContextValue {
  /** Call when user tries to generate a draft but has no profile. leadId is stored and re-triggered after completion. */
  requestOnboarding: (leadId: string, onAfterComplete: () => void) => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  requestOnboarding: () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [afterComplete, setAfterComplete] = useState<(() => void) | null>(null);

  const requestOnboarding = useCallback(
    (leadId: string, onAfterComplete: () => void) => {
      // Store the callback so we can call it after the wizard finishes
      // Use a wrapper fn to avoid setState treating a function as an updater
      setAfterComplete(() => onAfterComplete);
      setOpen(true);
    },
    []
  );

  const handleComplete = () => {
    setOpen(false);
    afterComplete?.();
    setAfterComplete(null);
  };

  const handleClose = () => {
    setOpen(false);
    setAfterComplete(null);
  };

  return (
    <OnboardingContext.Provider value={{ requestOnboarding }}>
      {children}
      <OnboardingModal
        open={open}
        onComplete={handleComplete}
        onClose={handleClose}
      />
    </OnboardingContext.Provider>
  );
}
