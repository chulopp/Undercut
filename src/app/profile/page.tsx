"use client";

import { useEffect, useState } from "react";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { getProfile } from "@/lib/data";
import type { ProfileInput } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
  const [loaded, setLoaded] = useState(false);
  const [initial, setInitial] = useState<
    (ProfileInput & { onboarding_completed?: boolean }) | undefined
  >(undefined);

  useEffect(() => {
    getProfile()
      .then((p) => {
        if (p) {
          setInitial({
            app_name: p.app_name ?? "",
            app_description: p.app_description ?? "",
            app_url: p.app_url ?? "",
            app_category: p.app_category ?? "",
            target_audience: p.target_audience ?? "",
            tone_of_voice: p.tone_of_voice ?? "friendly",
            differentiators: p.differentiators ?? {
              differentiator_1: "",
              differentiator_2: "",
              differentiator_3: "",
            },
            company_name: p.company_name ?? null,
            onboarding_completed: p.onboarding_completed ?? false,
          });
        }
        setLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load profile:", err);
        setLoaded(true);
      });
  }, []);

  if (!loaded) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-muted" />
      </div>
    );
  }

  return <OnboardingWizard initial={initial} />;
}