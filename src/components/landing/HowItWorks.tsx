"use client";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { useAuthModal } from "@/components/AuthModalProvider";
import { UserCheck, Radar, Zap, Brain, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const ITEMS = [
  {
    icon: UserCheck,
    title: "Setup Profile Info",
  },
  {
    icon: Radar,
    title: "Track Competitors",
  },
  {
    icon: Zap,
    title: "Filter Out Noise",
  },
  {
    icon: Brain,
    title: "AI Drafts Replies",
  },
  {
    icon: Rocket,
    title: "One-Click Send",
  },
];

export function HowItWorks() {
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
    <Container id="how" className="py-24 sm:py-32">
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-text sm:text-4xl lg:text-5xl leading-tight">
          Undercut helps you at{" "}
          <span className="font-serif italic font-normal text-white">every stage.</span>
        </h2>
      </Reveal>

      <div className="mt-14 overflow-hidden rounded-3xl border border-border bg-surface/20">
        {/* Top Row: 3 items */}
        <div className="grid grid-cols-1 border-b border-border md:grid-cols-3">
          {ITEMS.slice(0, 3).map((item) => (
            <div 
              key={item.title} 
              className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center border-b border-border last:border-b-0 md:border-b-0 md:border-r border-border"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#3A3A40] via-[#222228] to-[#121215] border border-border border-t-white/15 border-b-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_6px_15px_rgba(0,0,0,0.6)] text-white">
                <item.icon size={24} />
              </div>
              <h3 className="mt-6 text-xl font-extrabold text-text tracking-tight">{item.title}</h3>
            </div>
          ))}
        </div>

        {/* Bottom Row: 2 items */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {ITEMS.slice(3, 5).map((item) => (
            <div 
              key={item.title} 
              className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center border-b border-border last:border-b-0 md:border-b-0 md:border-r border-border last:border-r-0"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#3A3A40] via-[#222228] to-[#121215] border border-border border-t-white/15 border-b-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_6px_15px_rgba(0,0,0,0.6)] text-white">
                <item.icon size={24} />
              </div>
              <h3 className="mt-6 text-xl font-extrabold text-text tracking-tight">{item.title}</h3>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center justify-center">
        <Button size="lg" onClick={handleStartFree}>
          Start Free
        </Button>
        <p className="mt-3 text-sm text-muted font-medium">
          Forever.
        </p>
      </div>
    </Container>
  );
}