"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { getProfile } from "@/lib/data";
import type { ProfileInput } from "@/lib/types";

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  onClose: () => void;
}

export function OnboardingModal({
  open,
  onComplete,
  onClose,
}: OnboardingModalProps) {
  const [initial, setInitial] = useState<
    (ProfileInput & { onboarding_completed?: boolean }) | undefined
  >(undefined);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadError(false);
    getProfile()
      .then((p) => {
        setInitial({
          app_name: p.app_name,
          app_description: p.app_description,
          app_url: p.app_url,
          app_category: p.app_category,
          target_audience: p.target_audience,
          tone_of_voice: p.tone_of_voice,
          differentiators: p.differentiators,
          company_name: p.company_name,
          onboarding_completed: p.onboarding_completed,
        });
      })
      .catch(() => setLoadError(true));
  }, [open]);

  // Trap scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[201] overflow-y-auto"
          >
            <div className="flex min-h-full items-start justify-center px-4 py-10">
              <div className="relative w-full max-w-3xl">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 z-10 rounded-lg p-2 text-muted transition-colors hover:bg-surface hover:text-text"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>

                {/* Context notice */}
                <div className="mb-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-muted">
                  <span className="font-semibold text-accent">
                    One-time setup needed:
                  </span>{" "}
                  Undercut uses your app profile to draft personalized replies.
                  Takes less than 2 minutes.
                </div>

                {/* Wizard */}
                <div className="rounded-2xl border border-border bg-bg shadow-2xl">
                  {loadError ? (
                    <div className="flex h-64 items-center justify-center p-8 text-center text-sm text-muted">
                      Failed to load profile. Please refresh and try again.
                    </div>
                  ) : (
                    <OnboardingWizard
                      initial={initial}
                      onComplete={onComplete}
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
