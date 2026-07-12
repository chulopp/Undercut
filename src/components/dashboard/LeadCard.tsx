"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Edit3, Check, X, Timer, ArrowUpRight, Loader2, MessageSquarePlus } from "lucide-react";
import { XIcon, InstagramIcon } from "@/components/ui/BrandIcons";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { markLeadReplied, updateLeadDraft, generateLeadReply, getProfile } from "@/lib/data";
import type { Lead } from "@/lib/types";

const COACHMARK_KEY = "undercut:coachmark-seen";

function VerifiedBadge() {
  return (
    <svg viewBox="0 0 24 24" aria-label="Verified account" className="h-[14px] w-[14px] text-[#1d9bf0] fill-current inline-block select-none shrink-0">
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.94.1-1.348.27C14.825 2.515 13.512 1.5 12 1.5s-2.825 1.015-3.422 2.28c-.408-.17-.868-.27-1.348-.27-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .94-.1 1.348-.27.597 1.265 1.91 2.28 3.422 2.28s2.825-1.015 3.422-2.28c.408.17.868.27 1.348.27 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4L6 12.5l1.5-1.5 2.5 2.5 6.5-6.5 1.5 1.5-8 8z" />
    </svg>
  );
}

export function LeadCard({
  lead,
  showCoachmark,
  onReplied,
}: {
  lead: Lead;
  showCoachmark?: boolean;
  onReplied: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lead.gate_2_generated_reply ?? "");
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showTip, setShowTip] = useState(showCoachmark);

  useEffect(() => {
    setShowTip(showCoachmark);
  }, [showCoachmark]);

  const [generatedReply, setGeneratedReply] = useState<string | null>(
    lead.gate_2_generated_reply
  );
  const [processingTime, setProcessingTime] = useState<number | null>(
    lead.processing_time_ms
  );

  const [xPlan, setXPlan] = useState<"free" | "paid">("free");

  useEffect(() => {
    getProfile().then((p) => {
      if (p.x_plan) {
        setXPlan(p.x_plan);
      }
    });
  }, []);

  const toast = useToast();
  const isX = lead.platform === "X";
  const PlatformIcon = isX ? XIcon : InstagramIcon;
  const charLimit = isX ? (xPlan === "paid" ? 25000 : 280) : 500;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const updated = await generateLeadReply(lead.id);
      setGeneratedReply(updated.gate_2_generated_reply);
      setDraft(updated.gate_2_generated_reply ?? "");
      setProcessingTime(updated.processing_time_ms);
      toast.success("Draft reply generated! 1 cycle deducted.");
    } catch (err: any) {
      toast.error("Insufficient balance. Please top up your cycles!");
    } finally {
      setGenerating(false);
    }
  };

  const handleReply = async () => {
    if (replying) return;
    setReplying(true);

    if (isX) {
      const url =
        `https://twitter.com/intent/tweet?in_reply_to=${lead.external_post_id}` +
        `&text=${encodeURIComponent(draft)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      try {
        await navigator.clipboard.writeText(draft);
        window.open(lead.post_url, "_blank", "noopener,noreferrer");
      } catch {
        toast.error("Couldn't access clipboard. Copy draft manually.");
      }
    }

    toast.success("Reply flow opened ✓");
    onReplied(lead.id);
    markLeadReplied(lead.id).catch(() => {
      toast.error("Reply mark failed — please refresh");
    });
  };

  const handleSaveDraft = async () => {
    await updateLeadDraft(lead.id, draft);
    setGeneratedReply(draft);
    setEditing(false);
    toast.success("Draft updated");
  };

  const wordOverflow = draft.length > charLimit;

  // Format complaint / reply texts to highlight tags
  const formatText = (content: string) => {
    const words = content.split(" ");
    return words.map((word, idx) => {
      const isMentionOrProduct =
        word.startsWith("@") ||
        word.startsWith("#") ||
        ["TubeNest", "MerchantFlow", "ChatFlow", "YourTube", "Shopifake", "Slackk", "Tokopedia", "Gojek", "Notion", "CompetitorApp"].some((name) =>
          word.toLowerCase().includes(name.toLowerCase())
        );
      return (
        <span key={idx} className={isMentionOrProduct ? "text-[#1d9bf0] font-medium" : ""}>
          {word}{" "}
        </span>
      );
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left Column: 3D Twitter Post Card */}
        <div className="rounded-3xl border border-border border-b-[3.5px] border-b-accent/40 bg-surface p-6 shadow-[0_12px_24px_rgba(0,0,0,0.4),_inset_0_1.5px_0_rgba(255,255,255,0.06)] hover:border-accent/30 transition-all duration-300 flex flex-col justify-between min-h-[300px]">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative h-11 w-11 overflow-hidden rounded-full border border-border/40">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(lead.author_username)}&background=1d9bf0&color=fff`}
                    alt={lead.author_username}
                    className="h-full w-full object-cover"
                  />
                </div>
                {/* Identity */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-text leading-tight">{lead.author_username}</span>
                    <VerifiedBadge />
                  </div>
                  <span className="text-xs text-muted leading-tight mt-0.5">@{lead.author_username}</span>
                </div>
              </div>
              <div>
                <PlatformIcon className="h-5 w-5 text-muted/60" />
              </div>
            </div>

            {/* Badge */}
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-danger/10 text-danger border border-danger/20">
                COMPLAINT
              </span>
            </div>

            {/* Complaint content */}
            <div className="text-sm text-text leading-relaxed font-normal min-h-[72px]">
              <p className={!expanded && lead.raw_content.length > 180 ? "line-clamp-3" : ""}>
                {formatText(lead.raw_content)}
              </p>
              {lead.raw_content.length > 180 && (
                <button
                  onClick={() => setExpanded((p) => !p)}
                  className="mt-1 text-xs font-medium text-accent hover:underline"
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          </div>

          <div>
            {/* Timestamp */}
            <p className="mt-4 text-[11px] text-muted font-normal select-none">
              {new Date(lead.created_at).toLocaleString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            {/* Divider */}
            <div className="my-3 border-t border-border/40" />

            {/* Stats & Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-[11px] font-normal text-muted select-none">
                {isX ? (
                  <>
                    <span><strong className="text-text font-bold">3</strong> Retweets</span>
                    <span><strong className="text-text font-bold">12</strong> Likes</span>
                  </>
                ) : (
                  <span><strong className="text-text font-bold">12</strong> Likes</span>
                )}
              </div>
              <a
                href={lead.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-text"
              >
                View original post <ArrowUpRight size={11} />
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: 3D AI Reply Card */}
        <div className="rounded-3xl border border-border border-b-[3.5px] border-b-success/40 bg-surface p-6 shadow-[0_12px_24px_rgba(0,0,0,0.4),_inset_0_1.5px_0_rgba(255,255,255,0.06)] hover:border-success/30 transition-all duration-300 flex flex-col justify-between min-h-[300px]">
          {!generatedReply ? (
            /* Case 1: Reply not generated yet */
            <div className="flex flex-col items-center justify-center flex-1 py-4 text-center h-full">
              {generating ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin text-accent" />
                  <p className="text-sm font-medium text-muted">AI is crafting reply draft...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-accent/10 p-3 border border-accent/20">
                    <MessageSquarePlus size={20} className="text-accent" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text">AI Response Draft</h4>
                    <p className="text-xs text-muted mt-1 max-w-[200px]">
                      Generate an AI response draft.
                    </p>
                  </div>
                  <Button size="sm" variant="primary" onClick={handleGenerate}>
                    Generate draft
                  </Button>
                  <span className="text-[10px] text-muted font-medium bg-surface-2 border border-border px-2 py-0.5 rounded-full mt-1">
                    Cost: $0.10
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Case 2: Reply generated successfully */
            <div className="flex flex-col justify-between h-full flex-1">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative h-11 w-11 overflow-hidden rounded-full border border-border/40 bg-surface-2 p-1">
                      <img
                        src="/LogoUndercut.svg"
                        alt="Undercut AI"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    {/* Identity */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm text-text leading-tight">Undercut AI</span>
                        <VerifiedBadge />
                      </div>
                      <span className="text-xs text-muted leading-tight mt-0.5">@undercut</span>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => setEditing((p) => !p)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] text-muted transition-colors hover:bg-surface-2 hover:text-text border border-border"
                      aria-label="Edit draft"
                    >
                      {editing ? <X size={10} /> : <Edit3 size={10} />}
                      {editing ? "Cancel" : "Edit"}
                    </button>
                  </div>
                </div>

                {/* Badge and Processing Time */}
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-success/10 text-success border border-success/20">
                    UNDERCUT DRAFT
                  </span>
                  {processingTime && (
                    <span className="text-[10px] text-muted font-mono bg-surface-2 border border-border px-1.5 py-0.5 rounded-full">
                      {(processingTime / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>

                {/* Draft Content */}
                <div className="text-sm text-text leading-relaxed font-normal min-h-[72px]">
                  {editing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={4}
                        className="text-xs"
                      />
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] ${wordOverflow ? "text-danger" : "text-muted"}`}>
                          {draft.length}/{charLimit}
                        </span>
                        <Button size="sm" variant="ghost" onClick={handleSaveDraft}>
                          <Check size={11} /> Save draft
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-text leading-relaxed font-normal">{formatText(generatedReply)}</p>
                  )}
                </div>
              </div>

              <div>
                {/* Timestamp */}
                <p className="mt-4 text-[11px] text-muted font-normal select-none">
                  {new Date(lead.created_at).toLocaleString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>

                {/* Divider */}
                <div className="my-3 border-t border-border/40" />

                {/* Reply Button Action */}
                <div className="flex items-center justify-end">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleReply}
                    disabled={replying || wordOverflow || editing}
                    className="relative"
                  >
                    <Send size={12} />
                    {isX ? "Reply on X" : "Reply on Instagram"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dismissable Coachmark Tip */}
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative rounded-xl border border-accent/20 bg-accent/5 p-3 pr-10"
          >
            <p className="text-xs text-muted leading-relaxed">
              <span className="font-semibold text-accent">Tip:</span> Edit draft
              before sending — make it your style. The &ldquo;Reply&rdquo; button
              will open a new tab with the reply ready to be sent from your own account.
            </p>
            <button
              onClick={() => {
                localStorage.setItem(COACHMARK_KEY, "1");
                setShowTip(false);
              }}
              className="absolute right-3 top-3.5 text-muted hover:text-text transition-colors"
              aria-label="Dismiss tip"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}