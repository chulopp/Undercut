"use client";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";
import { useAuthModal } from "@/components/AuthModalProvider";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const INCLUDES = [
  "$0.10 per successful reply draft",
  "Free if Gate 1 rejects the lead",
  "5 free reply drafts every week, forever",
];

export function Pricing() {
  const router = useRouter();
  const { data: session } = useSession();
  const { open } = useAuthModal();
  const user = session?.user;

  const handleStartFree = () => {
    if (user) {
      router.push("/dashboard/x");
    } else {
      open();
    }
  };

  return (
    <Container id="pricing" className="py-20 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
          Simple, <span className="font-serif italic font-normal">transparent pricing.</span>
        </h2>
        <p className="mt-3 text-muted">
          No subscription. Pay for what you use.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mx-auto mt-12 max-w-lg">
        <div className="rounded-3xl border border-[#1b1b1f] border-t-white/10 border-b-[5px] border-b-black/90 bg-gradient-to-b from-[#131316] to-[#0c0c0e] p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05),_0_24px_48px_rgba(0,0,0,0.65)] hover:border-accent/40 transition-colors duration-300">
          <div className="inline-flex items-baseline gap-1">
            <span className="text-5xl font-bold text-text">$0.10</span>
            <span className="text-lg text-muted">/ reply draft</span>
          </div>
          <p className="mx-auto mt-2 text-xs sm:text-sm text-muted">
            Only pay for successful drafts. Rejected leads cost nothing.
          </p>

          <ul className="mx-auto mt-6 flex flex-col items-start gap-3 w-fit text-left">
            {INCLUDES.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-text">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check size={13} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex justify-center">
            <Button size="lg" onClick={handleStartFree}>
              Get Started Free
            </Button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.2} className="mx-auto mt-8 max-w-3xl">
        <p className="text-center text-sm font-medium text-muted">
          Top up anytime — enter any amount from $2
        </p>
      </Reveal>
    </Container>
  );
}