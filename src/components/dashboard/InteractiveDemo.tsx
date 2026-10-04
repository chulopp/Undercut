"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Check,
  ArrowUpRight,
  MessageSquarePlus,
  X,
  Sparkles,
} from "lucide-react";
import { XIcon, InstagramIcon } from "@/components/ui/BrandIcons";
import type { Platform } from "@/lib/types";

// ─── Verified Badge (same as LeadCard) ────────────────────────────────────────
function VerifiedBadge() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-label="Verified account"
      className="inline-block h-[14px] w-[14px] shrink-0 select-none fill-current text-[#1d9bf0]"
    >
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.94.1-1.348.27C14.825 2.515 13.512 1.5 12 1.5s-2.825 1.015-3.422 2.28c-.408-.17-.868-.27-1.348-.27-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .94-.1 1.348-.27.597 1.265 1.91 2.28 3.422 2.28s2.825-1.015 3.422-2.28c.408.17.868.27 1.348.27 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4L6 12.5l1.5-1.5 2.5 2.5 6.5-6.5 1.5 1.5-8 8z" />
    </svg>
  );
}

// ─── Mock Data per Platform ────────────────────────────────────────────────────
const MOCK_DATA = {
  X: {
    author_username: "frustrated_dev",
    author_avatar_url:
      "https://ui-avatars.com/api/?name=frustrated+dev&background=1d9bf0&color=fff",
    complaint:
      "@NotionHQ keeps crashing every time I try to open a big doc. Lost half my notes. So frustrated 😤 anyone else having this issue?",
    draft:
      "Hey! Sorry to hear that 😓 — Try Undercut, we're built for exactly this: lightning-fast note access even on huge docs, zero crashes. Free trial, no card needed 👉 undercut.app",
    timestamp: "Jul 18 · 3:14 PM",
    post_url: "#",
    platform: "X" as Platform,
  },
  INSTAGRAM: {
    author_username: "shopaholic_wira",
    author_avatar_url:
      "https://ui-avatars.com/api/?name=shopaholic+wira&background=c13584&color=fff",
    complaint:
      "Third time this week Shopify checkout keeps timing out 💀 losing sales because of this, genuinely considering switching platforms",
    draft:
      "That's rough, especially losing actual sales 😮 — We built Undercut to fix checkout reliability problems like this. 99.9% uptime, and if it goes down we refund the day. Check us out → undercut.app",
    timestamp: "Jul 18 · 2:47 PM",
    post_url: "#",
    platform: "INSTAGRAM" as Platform,
  },
};

// ─── Animation steps ───────────────────────────────────────────────────────────
// step 0 → complaint appears
// step 1 → right card shows "Generate Draft" idle state
// step 2 → button pulse + "Generating…"
// step 3 → draft typed-out appears
// step 4 → "Reply on X/IG" highlighted, status → replied
// then loops back

const STEP_DURATIONS = [2200, 1500, 1800, 2800, 2200]; // ms per step

// ─── Typing animation hook ─────────────────────────────────────────────────────
function useTypingText(target: string, active: boolean) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!active) {
      setDisplayed("");
      return;
    }
    let i = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      i++;
      setDisplayed(target.slice(0, i));
      if (i >= target.length) clearInterval(interval);
    }, 18);
    return () => clearInterval(interval);
  }, [active, target]);
  return displayed;
}

// ─── Main Component ────────────────────────────────────────────────────────────
interface InteractiveDemoProps {
  platform: Platform;
  onDismiss: () => void;
}

export function InteractiveDemo({ platform, onDismiss }: InteractiveDemoProps) {
  const [step, setStep] = useState(0);
  const data = MOCK_DATA[platform];
  const PlatformIcon = platform === "X" ? XIcon : InstagramIcon;
  const typedDraft = useTypingText(data.draft, step === 3);

  // Auto-advance steps
  useEffect(() => {
    const timer = setTimeout(() => {
      setStep((s) => {
        const next = s + 1;
        if (next >= STEP_DURATIONS.length) {
          return 0; // loop
        }
        return next;
      });
    }, STEP_DURATIONS[step]);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="relative rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-transparent to-transparent p-4 sm:p-5"
    >
      {/* Header label */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-accent" />
          <span className="text-xs font-semibold text-accent">
            See how Undercut works
          </span>
          {/* Step progress dots */}
          <div className="ml-2 flex items-center gap-1">
            {STEP_DURATIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-4 bg-accent"
                    : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:text-text"
        >
          <X size={10} />
          Got it
        </button>
      </div>

      {/* Step label */}
      <p className="mb-3 text-[11px] text-muted">
        {step === 0 && "① A competitor complaint is detected"}
        {step === 1 && '② Click "Generate Draft" to create an AI reply'}
        {step === 2 && "③ AI is crafting your personalized reply…"}
        {step === 3 && "④ Review and edit the draft"}
        {step === 4 && "⑤ One click to reply from your own account ✓"}
      </p>

      {/* ── Card Grid (identical to LeadCard layout) ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* ── LEFT: Complaint Card ── */}
        <div className="flex min-h-[280px] flex-col justify-between rounded-3xl border border-border border-b-[3.5px] border-b-accent/40 bg-surface p-4 shadow-[0_12px_24px_rgba(0,0,0,0.4),_inset_0_1.5px_0_rgba(255,255,255,0.06)] transition-all duration-300 sm:p-5">
          <div>
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 overflow-hidden rounded-full border border-border/40">
                  <img
                    src={data.author_avatar_url}
                    alt={data.author_username}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold leading-tight text-text">
                      {data.author_username}
                    </span>
                    <VerifiedBadge />
                  </div>
                  <span className="mt-0.5 text-xs leading-tight text-muted">
                    @{data.author_username}
                  </span>
                </div>
              </div>
              <PlatformIcon className="h-5 w-5 text-muted/60" />
            </div>

            {/* Badge */}
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/20 bg-danger/10 px-2.5 py-0.5 text-[10px] font-semibold text-danger">
                COMPLAINT
              </span>
            </div>

            {/* Complaint text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: step >= 0 ? 1 : 0 }}
              transition={{ duration: 0.4 }}
              className="min-h-[72px] text-sm font-normal leading-relaxed text-text"
            >
              {data.complaint.split(" ").map((word, idx) => (
                <span
                  key={idx}
                  className={
                    word.startsWith("@") || word.startsWith("#")
                      ? "font-medium text-[#1d9bf0]"
                      : ""
                  }
                >
                  {word}{" "}
                </span>
              ))}
            </motion.div>
          </div>

          <div>
            {/* Timestamp */}
            <p className="mt-4 select-none text-[11px] font-normal text-muted">
              {data.timestamp}
            </p>
            <div className="my-3 border-t border-border/40" />
            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 select-none text-[11px] font-normal text-muted">
                {platform === "X" ? (
                  <>
                    <span>
                      <strong className="font-bold text-text">3</strong>{" "}
                      Retweets
                    </span>
                    <span>
                      <strong className="font-bold text-text">12</strong> Likes
                    </span>
                  </>
                ) : (
                  <span>
                    <strong className="font-bold text-text">12</strong> Likes
                  </span>
                )}
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                View original post <ArrowUpRight size={11} />
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: AI Reply Card ── */}
        <div className="flex min-h-[280px] flex-col justify-between rounded-3xl border border-border border-b-[3.5px] border-b-success/40 bg-surface p-4 shadow-[0_12px_24px_rgba(0,0,0,0.4),_inset_0_1.5px_0_rgba(255,255,255,0.06)] transition-all duration-300 sm:p-5">
          <AnimatePresence mode="wait">
            {/* ── Step 0–1: idle / waiting state ── */}
            {(step === 0 || step === 1) && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-1 flex-col items-center justify-center py-4 text-center"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full border border-accent/20 bg-accent/10 p-3">
                    <MessageSquarePlus size={20} className="text-accent" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text">
                      AI Response Draft
                    </h4>
                    <p className="mt-1 max-w-[200px] text-xs text-muted">
                      Generate an AI response draft.
                    </p>
                  </div>
                  {/* Generate Draft button — pulses on step 1 */}
                  <motion.button
                    animate={
                      step === 1
                        ? { scale: [1, 1.06, 1], boxShadow: ["0 0 0px #6C63FF00", "0 0 14px #6C63FF88", "0 0 0px #6C63FF00"] }
                        : {}
                    }
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-md"
                  >
                    Generate draft
                  </motion.button>
                  <span className="mt-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
                    Cost: $0.10
                  </span>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: generating spinner ── */}
            {step === 2 && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-1 flex-col items-center justify-center gap-3 py-4 text-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-6 w-6 rounded-full border-2 border-accent/30 border-t-accent"
                />
                <p className="text-sm font-medium text-muted">
                  AI is crafting reply draft…
                </p>
              </motion.div>
            )}

            {/* ── Step 3–4: draft generated ── */}
            {(step === 3 || step === 4) && (
              <motion.div
                key="drafted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-1 flex-col justify-between"
              >
                <div>
                  {/* Header */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 overflow-hidden rounded-full border border-border/40 bg-surface-2 p-1">
                        <img
                          src="/LogoUndercut.svg"
                          alt="Undercut AI"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold leading-tight text-text">
                            Undercut AI
                          </span>
                          <VerifiedBadge />
                        </div>
                        <span className="mt-0.5 text-xs leading-tight text-muted">
                          @undercut
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badge */}
                  <div className="mb-3 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-[10px] font-semibold text-success">
                      UNDERCUT DRAFT
                    </span>
                    <span className="rounded-full border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                      4.2s
                    </span>
                  </div>

                  {/* Draft text — typing on step 3, full on step 4 */}
                  <div className="min-h-[72px] text-sm font-normal leading-relaxed text-text">
                    {step === 3 ? typedDraft : data.draft}
                    {step === 3 && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="ml-0.5 inline-block h-4 w-0.5 bg-accent align-middle"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <p className="mt-4 select-none text-[11px] font-normal text-muted">
                    {data.timestamp}
                  </p>
                  <div className="my-3 border-t border-border/40" />
                  <div className="flex items-center justify-end">
                    {/* Reply button — highlighted on step 4 */}
                    <motion.button
                      animate={
                        step === 4
                          ? { scale: [1, 1.05, 1], boxShadow: ["0 0 0px #22c55e00", "0 0 12px #22c55e66", "0 0 0px #22c55e00"] }
                          : {}
                      }
                      transition={{ duration: 0.9, repeat: Infinity }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-md transition-all ${
                        step === 4
                          ? "bg-success/20 text-success border border-success/30"
                          : "bg-accent text-white"
                      }`}
                    >
                      {step === 4 ? (
                        <>
                          <Check size={12} className="text-success" />
                          {platform === "X" ? "Replied on X" : "Replied on IG"}
                        </>
                      ) : (
                        <>
                          <Send size={12} />
                          {platform === "X"
                            ? "Reply on X"
                            : "Reply on Instagram"}
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
