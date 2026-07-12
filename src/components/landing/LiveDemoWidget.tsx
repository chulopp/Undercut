"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { XIcon } from "@/components/ui/BrandIcons";
import { useAuthModal } from "@/components/AuthModalProvider";

const EXAMPLES = [
  {
    platform: "X",
    authorName: "Sarah Connor",
    authorHandle: "@sarah_c",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    verified: true,
    complaint: "I've been trying to host videos on YourTube for my business but their bandwidth limits are insane. They keep squeezing creators. Anyone know a better platform?",
    timestamp: "10:22 PM · Sep 18, 2021",
    retweets: "13",
    quotes: "05",
    likes: "63",
    replyAuthorName: "TubeNest (AI Draft)",
    replyAuthorHandle: "@TubeNest",
    replyAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
    replyVerified: true,
    reply: "Completely hear you, YourTube is getting greedy. I built TubeNest with unlimited bandwidth and clean embeds. 100% creator owned. Hit me up for a free invite! 🎬",
  },
  {
    platform: "X",
    authorName: "Marcus Aurelius",
    authorHandle: "@marcus_stores",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
    verified: false,
    complaint: "Is anyone else getting random double-charges on Shopifake? Their customer support has been silent for 4 days. Absolutely unacceptable for a store owner.",
    timestamp: "12:47 PM · Jun 2, 2022",
    retweets: "03",
    quotes: "04",
    likes: "16",
    replyAuthorName: "MerchantFlow (AI Draft)",
    replyAuthorHandle: "@MerchantFlow",
    replyAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80",
    replyVerified: true,
    reply: "Man, Shopifake's billing issues are a nightmare. I created MerchantFlow with transparent billing and 24/7 live developer support. Drop me a DM for a migration discount! 💳",
  },
  {
    platform: "X",
    authorName: "Devin AI",
    authorHandle: "@devin_builds",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80",
    verified: true,
    complaint: "Slackk keeps crashing on macOS and the notification delays are causing us to miss client updates. We need a faster and more stable alternative.",
    timestamp: "7:00 PM · Dec 23, 2021",
    retweets: "11",
    quotes: "08",
    likes: "38",
    replyAuthorName: "ChatFlow (AI Draft)",
    replyAuthorHandle: "@ChatFlow",
    replyAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
    replyVerified: true,
    reply: "Notification lag is the absolute worst. We built ChatFlow with native performance and instant push notifications. Free migration for team accounts! 💬",
  },
];

function VerifiedBadge() {
  return (
    <svg viewBox="0 0 24 24" aria-label="Verified account" className="h-[15px] w-[15px] text-[#1d9bf0] fill-current inline-block select-none">
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.94.1-1.348.27C14.825 2.515 13.512 1.5 12 1.5s-2.825 1.015-3.422 2.28c-.408-.17-.868-.27-1.348-.27-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .94-.1 1.348-.27.597 1.265 1.91 2.28 3.422 2.28s2.825-1.015 3.422-2.28c.408.17.868.27 1.348.27 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4L6 12.5l1.5-1.5 2.5 2.5 6.5-6.5 1.5 1.5-8 8z" />
    </svg>
  );
}

function Typewriter({ text }: { text: string }) {
  const [typed, setTyped] = useState("");
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTyped("");
    indexRef.current = 0;
    const tick = () => {
      indexRef.current += 1;
      setTyped(text.slice(0, indexRef.current));
      if (indexRef.current < text.length) {
        timerRef.current = setTimeout(tick, 18);
      }
    };
    timerRef.current = setTimeout(tick, 350);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text]);

  const formatText = (content: string) => {
    const words = content.split(" ");
    return words.map((word, idx) => {
      const isMentionOrProduct =
        word.startsWith("@") ||
        word.startsWith("#") ||
        ["TubeNest", "MerchantFlow", "ChatFlow", "YourTube", "Shopifake", "Slackk"].some((name) =>
          word.includes(name)
        );
      return (
        <span key={idx} className={isMentionOrProduct ? "text-[#1d9bf0] font-medium" : ""}>
          {word}{" "}
        </span>
      );
    });
  };

  return (
    <p className="text-sm leading-relaxed text-text">
      {formatText(typed)}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="ml-0.5 inline-block h-4 w-0.5 bg-accent align-middle"
      />
    </p>
  );
}

function TweetCard({
  authorName,
  authorHandle,
  avatar,
  verified,
  text,
  isTypewriter = false,
  timestamp,
  retweets,
  quotes,
  likes,
  badgeText,
  badgeColor,
  headerRight,
}: {
  authorName: string;
  authorHandle: string;
  avatar: string;
  verified: boolean;
  text: string;
  isTypewriter?: boolean;
  timestamp: string;
  retweets: string;
  quotes: string;
  likes: string;
  badgeText?: string;
  badgeColor?: string;
  headerRight?: React.ReactNode;
}) {
  const formatText = (content: string) => {
    const words = content.split(" ");
    return words.map((word, idx) => {
      const isMentionOrProduct =
        word.startsWith("@") ||
        word.startsWith("#") ||
        ["TubeNest", "MerchantFlow", "ChatFlow", "YourTube", "Shopifake", "Slackk"].some((name) =>
          word.includes(name)
        );
      return (
        <span key={idx} className={isMentionOrProduct ? "text-[#1d9bf0] font-medium" : ""}>
          {word}{" "}
        </span>
      );
    });
  };

  return (
    <div className="rounded-3xl border border-border bg-[#111114] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.6),_inset_0_1.5px_0_rgba(255,255,255,0.06)] hover:border-accent/40 transition-all duration-300 flex flex-col justify-between h-full min-h-[300px]">
      <div>
        {/* Tweet Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative h-11 w-11 overflow-hidden rounded-full border border-border/40">
              <img
                src={avatar}
                alt={authorName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=1d9bf0&color=fff`;
                }}
              />
            </div>
            {/* Identity */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm text-text leading-tight">{authorName}</span>
                {verified && <VerifiedBadge />}
              </div>
              <span className="text-xs text-muted leading-tight mt-0.5">{authorHandle}</span>
            </div>
          </div>
          <div>
            {headerRight || <XIcon className="h-5 w-5 text-muted/60" />}
          </div>
        </div>

        {/* Badge tag if provided */}
        {badgeText && (
          <div className="mb-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
              {badgeText}
            </span>
          </div>
        )}

        {/* Tweet Text */}
        <div className="text-sm text-text leading-relaxed font-normal min-h-[72px]">
          {isTypewriter ? (
            <Typewriter text={text} />
          ) : (
            <p className="text-sm leading-relaxed text-text">{formatText(text)}</p>
          )}
        </div>
      </div>

      <div>
        {/* Timestamp */}
        <p className="mt-4 text-[11px] text-muted font-normal select-none">
          {timestamp}
        </p>

        {/* Divider */}
        <div className="my-3 border-t border-border/40" />

        {/* Stats */}
        <div className="flex items-center gap-4 text-[11px] font-normal text-muted select-none">
          <span><strong className="text-text font-bold">{retweets}</strong> Retweet</span>
          <span><strong className="text-text font-bold">{quotes}</strong> Quote tweets</span>
          <span><strong className="text-text font-bold">{likes}</strong> Likes</span>
        </div>
      </div>
    </div>
  );
}

export function LiveDemoWidget() {
  const { open } = useAuthModal();
  const [index, setIndex] = useState(0);
  const example = EXAMPLES[index];
  const next = () => setIndex((p) => (p + 1) % EXAMPLES.length);

  return (
    <Container className="py-20 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
          See it <span className="font-serif italic font-normal">in action.</span>
        </h2>
        <p className="mt-3 text-muted">
          A real complaint. An AI-drafted reply. In seconds.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mx-auto mt-12 max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Complaint Card */}
          <div>
            <TweetCard
              authorName={example.authorName}
              authorHandle={example.authorHandle}
              avatar={example.avatar}
              verified={example.verified}
              text={example.complaint}
              timestamp={example.timestamp}
              retweets={example.retweets}
              quotes={example.quotes}
              likes={example.likes}
              badgeText="COMPLAINT"
              badgeColor="bg-danger/10 text-danger border border-danger/20"
              headerRight={
                <button
                  onClick={next}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted transition-all hover:text-text hover:bg-surface-3 active:scale-95"
                >
                  <RefreshCw size={12} className="animate-spin-slow" />
                  Try another
                </button>
              }
            />
          </div>

          {/* Reply Card */}
          <div>
            <TweetCard
              authorName="Undercut AI"
              authorHandle="@undercut"
              avatar="/LogoUndercut.svg"
              verified={true}
              text={example.reply}
              isTypewriter={true}
              timestamp={example.timestamp}
              retweets="01"
              quotes="00"
              likes="01"
              badgeText="UNDERCUT DRAFT REPLY"
              badgeColor="bg-success/10 text-success border border-success/20"
            />
          </div>
        </div>

        <div className="mt-12 text-center">
          <Button variant="primary" size="lg" onClick={open}>
            This could be your reply. Try it free
            <ArrowRight size={18} />
          </Button>
        </div>
      </Reveal>
    </Container>
  );
}