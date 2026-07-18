"use client";

import { motion } from "framer-motion";
import { ArrowRight, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { XIcon, InstagramIcon } from "@/components/ui/BrandIcons";
import { useAuthModal } from "@/components/AuthModalProvider";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

const VerifiedBadge = () => (
  <svg className="h-4 w-4 text-[#1D9BF0] fill-current inline-block shrink-0" viewBox="0 0 24 24" aria-label="Verified account">
    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.941.1-1.358.277C14.77 2.515 13.512 1.5 12 1.5s-2.77 1.015-3.414 2.287c-.417-.178-.878-.277-1.358-.277-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .941-.1 1.358-.277C9.23 21.485 10.488 22.5 12 22.5s2.77-1.015 3.414-2.287c.417.178.878.277 1.358.277 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.8 3.46L6.53 12.81l1.414-1.414 1.756 1.756 4.344-4.344 1.414 1.414-5.758 5.758z" />
  </svg>
);

function ComplaintCard() {
  return (
    <div
      className="absolute left-0 top-10 hidden w-[320px] lg:block select-none"
      style={{ transform: "perspective(1000px) rotateY(20deg) rotateX(8deg)" }}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-xl border border-border bg-surface p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start gap-3">
          <img 
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80" 
            className="h-9 w-9 rounded-full object-cover shrink-0" 
            alt="avatar" 
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="truncate text-sm font-bold text-text">Alex Rivera</span>
              <VerifiedBadge />
            </div>
            <p className="truncate text-xs text-muted">@alexrivera</p>
          </div>
          <div className="text-muted shrink-0 opacity-80 mt-0.5">
            <XIcon style={{ fontSize: 13 }} />
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-text/90">
          Why is <span className="text-accent hover:underline cursor-pointer">@Trillo</span> so incredibly slow today? 😭 It takes like 10 seconds just to load our sprint board. Our team is wasting so much time. Anyone know a fast, modern alternative?
        </p>

        <p className="mt-3 text-xs text-muted">
          10:22 PM · Jul 12, 2026
        </p>

        <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-4 text-xs font-normal text-muted select-none">
          <span><strong className="text-text font-bold">13</strong> Retweet</span>
          <span><strong className="text-text font-bold">05</strong> Quote tweets</span>
          <span><strong className="text-text font-bold">63</strong> Likes</span>
        </div>
      </motion.div>
    </div>
  );
}

function ReplyCard() {
  return (
    <div
      className="absolute right-0 bottom-0 hidden w-[340px] lg:block select-none"
      style={{ transform: "perspective(1000px) rotateY(-18deg) rotateX(-6deg)" }}
    >
      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.6,
        }}
        className="rounded-xl border border-border bg-surface p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start gap-3">
          <img 
            src="/LogoUndercut.svg" 
            className="h-9 w-9 rounded-full object-contain shrink-0 bg-surface-2 p-0.5 border border-border/40" 
            alt="avatar" 
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="truncate text-sm font-bold text-text">Undercut AI</span>
              <VerifiedBadge />
            </div>
            <p className="truncate text-xs text-muted mt-0.5">@undercut</p>
          </div>
          <div className="text-muted shrink-0 opacity-80 mt-0.5">
            <XIcon style={{ fontSize: 13 }} />
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-text/90">
          Hey, feel that pain, speed is everything. We built <span className="text-accent font-semibold">@FlowTask</span> to be blazing fast—sub-100ms keyboard-first navigation and offline sync. Happy to set you up with a free trial for your team! 👇
        </p>

        <p className="mt-3 text-xs text-muted">
          10:23 PM · Jul 12, 2026
        </p>

        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] font-normal text-muted select-none">
            <span><strong className="text-text font-bold">0</strong> Retweets</span>
            <span><strong className="text-text font-bold">0</strong> Likes</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-accent/20 cursor-pointer hover:brightness-105 active:scale-95 transition-all">
            <Send size={11} /> Reply on X
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function Hero() {
  const router = useRouter();
  const supabase = createClient();
  const { open } = useAuthModal();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();
  }, [supabase]);

  const handleStartFree = () => {
    if (user) {
      router.push("/dashboard/x");
    } else {
      open();
    }
  };

  return (
    <section
      id="top"
      className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-grid" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center gap-5 text-xs text-muted"
          >
            <span className="inline-flex items-center gap-1.5">
              <XIcon style={{ fontSize: 14 }} /> X / Twitter
            </span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span className="inline-flex items-center gap-1.5">
              <InstagramIcon style={{ fontSize: 14 }} /> Instagram
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-text sm:text-5xl lg:text-6xl"
          >
            Turn competitor complaints into your{" "}
            <span className="font-serif italic font-normal text-white">next customers.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted sm:text-xl"
          >
            Undercut watches X and Instagram for people complaining about your
            competitors — AI drafts the reply, you just hit send.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-9 flex flex-col items-center gap-3"
          >
            <Button size="lg" onClick={handleStartFree} className="w-full sm:w-auto">
              Start Free — No Card Needed
              <ArrowRight size={18} />
            </Button>
            <p className="text-sm text-muted">
              5 free replies every week. Forever.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface/40 px-4 py-2 text-xs font-semibold text-white md:hidden mt-6 shadow-[0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-xs"
            >
              Track Competitors &rarr; AI Writes Reply &rarr; Hit Send
            </motion.div>
          </motion.div>
        </div>

        {/* 3-Step How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-auto mt-20 w-fit max-w-full rounded-2xl md:rounded-full border border-border bg-surface/30 px-8 py-4 md:py-3 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-xs hidden md:block"
        >
          <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6 text-sm">
            {/* Step 1 */}
            <div className="flex items-center gap-2 select-none whitespace-nowrap">
              <span className="text-white/40 font-bold font-sans text-xs">01.</span>
              <span className="text-white font-medium font-sans">Track Competitors</span>
              <span className="text-[10px] text-muted font-sans uppercase tracking-wider bg-border/40 px-1.5 py-0.5 rounded-md">X & IG</span>
            </div>

            {/* Separator */}
            <span className="hidden text-border md:inline select-none">→</span>

            {/* Step 2 */}
            <div className="flex items-center gap-2 select-none whitespace-nowrap">
              <span className="text-white/40 font-bold font-sans text-xs">02.</span>
              <span className="text-white font-medium font-sans">AI Writes Reply</span>
              <span className="text-[10px] text-muted font-sans uppercase tracking-wider bg-border/40 px-1.5 py-0.5 rounded-md">Tailored</span>
            </div>

            {/* Separator */}
            <span className="hidden text-border md:inline select-none">→</span>

            {/* Step 3 */}
            <div className="flex items-center gap-2 select-none whitespace-nowrap">
              <span className="text-white/40 font-bold font-sans text-xs">03.</span>
              <span className="text-white font-medium font-sans">Hit Send</span>
              <span className="text-[10px] text-muted font-sans uppercase tracking-wider bg-border/40 px-1.5 py-0.5 rounded-md">One Click</span>
            </div>
          </div>
        </motion.div>

        <div className="relative mx-auto mt-0 lg:mt-24 h-0 lg:h-[340px] max-w-4xl">
          <ComplaintCard />
          <ReplyCard />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
              className="flex h-16 w-16 items-center justify-center rounded-full border border-accent/40 bg-accent/10 glow-accent"
            >
              <ArrowRight className="text-accent" size={28} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}