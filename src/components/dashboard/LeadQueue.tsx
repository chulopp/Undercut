"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Loader2, Radar, RefreshCw, Trash2 } from "lucide-react";
import { LeadCard } from "@/components/dashboard/LeadCard";
import { InteractiveDemo } from "@/components/dashboard/InteractiveDemo";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { listLeads, triggerScrape, deletePlatformLeads } from "@/lib/data";
import { createClient } from "@/utils/supabase/client";
import { isDemoSession } from "@/lib/demo-storage";
import type { Lead, Platform } from "@/lib/types";

const COACHMARK_KEY = "undercut:coachmark-seen";
const DEMO_KEY = (platform: Platform) =>
  `undercut:demo-seen-${platform.toLowerCase()}`;

export function LeadQueue({ platform }: { platform: Platform }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [showCoachmark, setShowCoachmark] = useState(false);
  const [demoDismissed, setDemoDismissed] = useState(false);
  const toast = useToast();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  // Track whether a manual scrape is in progress to suppress per-lead Realtime toasts
  const scrapingRef = useRef(false);

  const fetchLeads = useCallback(async () => {
    try {
      const data = await listLeads(platform, "PENDING");
      setLeads(data);
    } catch (err) {
      console.error("[LeadQueue] fetchLeads error:", err);
    } finally {
      setLoading(false);
    }
  }, [platform]);

  // Wait for React to commit state + browser to paint before showing a toast
  const afterPaint = () =>
    new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

  // Initial fetch + demo dismissed check + auto-scrape on first load
  useEffect(() => {
    setLoading(true);
    setShowCoachmark(
      typeof window !== "undefined" && !localStorage.getItem(COACHMARK_KEY)
    );
    setDemoDismissed(
      typeof window !== "undefined" &&
        !!localStorage.getItem(DEMO_KEY(platform))
    );

    fetchLeads().then(async () => {
      // Auto-scrape: try on first load (throttle handles 10x/day limit)
      try {
        const result = await triggerScrape({ platform, force: false });
        if (result.inserted && result.inserted > 0) {
          await fetchLeads();
          await afterPaint();
          toast.success(`Found ${result.inserted} new leads!`);
        }
      } catch {
        // Scrape errors are non-fatal — user can retry manually
      }
    });
  }, [platform]); // eslint-disable-line react-hooks/exhaustive-deps

  // Supabase Realtime — subscribe to new leads for this platform
  useEffect(() => {
    if (isDemoSession()) return;
    const supabase = createClient();

    // Clean up previous channel if platform changes
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`leads-${platform}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads_queue",
          filter: `platform=eq.${platform}`,
        },
        (payload) => {
          const newLead = payload.new as Lead;
          // Only add if it's in a showable state
          if (["PENDING", "PENDING_PAYMENT"].includes(newLead.status)) {
            setLeads((prev) => {
              if (prev.some((l) => l.id === newLead.id)) return prev;
              // Only toast for individual leads when NOT in the middle of a manual scrape
              // (manual scrape shows its own batch summary toast after fetchLeads completes)
              if (!scrapingRef.current) {
                toast.success("New lead found!");
              }
              return [newLead, ...prev];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads_queue",
          filter: `platform=eq.${platform}`,
        },
        (payload) => {
          const updated = payload.new as Lead;
          setLeads((prev) =>
            prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [platform, toast]);

  const handleScrapeMore = async () => {
    setScraping(true);
    scrapingRef.current = true;
    try {
      const result = await triggerScrape({ platform, force: true });
      if (result.throttled) {
        toast.error(`Scrape throttled. Try again in ${result.next_scrape_in_minutes ?? 10} minutes.`);
        return;
      }

      // Always fetch leads first, wait for paint, THEN show toast
      await fetchLeads();
      await afterPaint();

      if (result.inserted && result.inserted > 0) {
        toast.success(`Found ${result.inserted} new leads!`);
      } else if (result.error) {
        toast.error(`Scrape error: ${result.error}`);
      } else {
        toast.success("No new leads found this time.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Scrape failed";
      toast.error(msg);
    } finally {
      scrapingRef.current = false;
      setScraping(false);
    }
  };

  const handleDeleteAll = async () => {
    if (leads.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete all ${platform === "X" ? "X" : "Instagram"} leads?`)) return;
    setDeletingAll(true);
    try {
      await deletePlatformLeads(platform);
      setLeads([]);
      toast.success(`All ${platform === "X" ? "X" : "Instagram"} leads cleared.`);
    } catch {
      toast.error("Failed to delete leads.");
    } finally {
      setDeletingAll(false);
    }
  };

  const handleReplied = (id: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: "REPLIED" } : l))
    );
    if (typeof window !== "undefined") {
      localStorage.setItem(COACHMARK_KEY, "1");
      setShowCoachmark(false);
    }
  };

  const handleDeleted = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    if (typeof window !== "undefined") {
      localStorage.setItem(COACHMARK_KEY, "1");
      setShowCoachmark(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Left Card Skeleton */}
            <div className="rounded-2xl border border-border bg-surface p-4 min-h-[220px] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
                <Skeleton className="mt-4 h-3.5 w-full" />
                <Skeleton className="mt-2.5 h-3.5 w-3/4" />
              </div>
              <Skeleton className="h-3 w-24" />
            </div>
            {/* Right Card Skeleton */}
            <div className="rounded-2xl border border-border bg-surface p-4 min-h-[220px] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="mt-4 h-3.5 w-full" />
                <Skeleton className="mt-2.5 h-3.5 w-1/2" />
              </div>
              <div className="flex justify-end">
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="space-y-4">
        <AnimatePresence>
          {!demoDismissed && (
            <InteractiveDemo
              platform={platform}
              onDismiss={() => {
                setDemoDismissed(true);
                if (typeof window !== "undefined") {
                  localStorage.setItem(DEMO_KEY(platform), "1");
                }
              }}
            />
          )}
        </AnimatePresence>
        <EmptyState
          icon={<Radar size={22} />}
          title="No leads for this platform yet"
          description={
            platform === "X"
              ? "Add your first competitor target and click 'Scrape More' to find complaints."
              : "Add a competitor username and click 'Scrape More' to find complaints."
          }
        />
        {/* Scrape More button even on empty state */}
        <div className="flex justify-center">
          <button
            onClick={handleScrapeMore}
            disabled={scraping}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-text disabled:opacity-50"
          >
            {scraping ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {scraping ? "Scanning..." : "Scrape More"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">
          Lead queue
        </h2>
        <div className="flex items-center gap-2">
          {/* Pending Badge */}
          <span className="inline-flex h-7 items-center justify-center rounded-full border border-accent/20 bg-accent/10 px-3.5 text-[11px] font-bold text-accent select-none">
            {leads.length} pending
          </span>

          {/* Scrape More button */}
          <button
            onClick={handleScrapeMore}
            disabled={scraping || deletingAll}
            className="inline-flex h-7 items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[11px] font-medium text-muted transition-all hover:border-accent/40 hover:text-text disabled:opacity-50 cursor-pointer"
          >
            {scraping ? (
              <Loader2 size={11} className="animate-spin text-accent" />
            ) : (
              <RefreshCw size={11} />
            )}
            {scraping ? "Scanning..." : "Scrape More"}
          </button>

          {/* Delete All button */}
          <button
            onClick={handleDeleteAll}
            disabled={deletingAll || scraping || leads.length === 0}
            className="inline-flex h-7 items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[11px] font-medium text-muted transition-all hover:border-accent/40 hover:text-text disabled:opacity-50 cursor-pointer"
          >
            {deletingAll ? (
              <Loader2 size={11} className="animate-spin text-accent" />
            ) : (
              <Trash2 size={11} />
            )}
            Delete All
          </button>
        </div>
      </div>
      <AnimatePresence mode="popLayout">
        {sortLeads(leads).map((lead, i) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            showCoachmark={showCoachmark && i === 0}
            onReplied={handleReplied}
            onDeleted={handleDeleted}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

const sortLeads = (list: Lead[]): Lead[] => {
  return [...list].sort((a, b) => {
    const hasDraftA = !!a.gate_2_generated_reply;
    const hasDraftB = !!b.gate_2_generated_reply;

    // Rule 1: Drafts always come first
    if (hasDraftA && !hasDraftB) return -1;
    if (!hasDraftA && hasDraftB) return 1;

    // Rule 2: Unreplied leads come before replied leads
    const isRepliedA = a.status === "REPLIED";
    const isRepliedB = b.status === "REPLIED";
    if (!isRepliedA && isRepliedB) return -1;
    if (isRepliedA && !isRepliedB) return 1;

    // Rule 3: Sort by created_at descending (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};