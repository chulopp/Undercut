"use client";

import type {
  Competitor,
  Lead,
  Platform,
  Profile,
  ProfileInput,
  Transaction,
  BillingEntry,
} from "@/lib/types";
import {
  isDemoSession,
  getDemoProfile,
  saveDemoProfile,
  listDemoCompetitors,
  addDemoCompetitor,
  deleteDemoCompetitor,
  toggleDemoCompetitor,
  listDemoLeads,
  getDemoLead,
  updateDemoLeadDraft,
  markDemoLeadReplied,
  deleteDemoLead,
  deleteDemoPlatformLeads,
  getDemoBillingStatus,
  consumeDemoToken,
  listDemoLedger,
  listDemoTransactions,
  generateSmartDemoReply,
  appendDemoLeads,
} from "@/lib/demo-storage";

export type {
  Competitor,
  Lead,
  Platform,
  Profile,
  ProfileInput,
  Transaction,
  BillingEntry,
};

/**
 * Client-side data layer.
 * In Demo/Portfolio Mode: uses demo-storage (local state, strict 5 free tokens, no Supabase/Stripe needed).
 * In Live Mode: calls Next.js API routes with Supabase auth + RLS.
 */

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `API error ${res.status}`);
  }
  return res.json();
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<Profile> {
  if (isDemoSession()) {
    return getDemoProfile();
  }
  return apiFetch<Profile>("/api/profile");
}

export async function saveProfile(input: ProfileInput): Promise<Profile> {
  if (isDemoSession()) {
    return saveDemoProfile(input);
  }
  return apiFetch<Profile>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

// ─── COMPETITORS ──────────────────────────────────────────────────────────────

export async function listCompetitors(platform: Platform): Promise<Competitor[]> {
  if (isDemoSession()) {
    return listDemoCompetitors(platform);
  }
  return apiFetch<Competitor[]>(`/api/competitors?platform=${platform}`);
}

export async function addCompetitor(
  data: Pick<Competitor, "competitor_name" | "platform" | "search_query">
): Promise<Competitor> {
  if (isDemoSession()) {
    return addDemoCompetitor(data);
  }
  return apiFetch<Competitor>("/api/competitors", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteCompetitor(id: string): Promise<void> {
  if (isDemoSession()) {
    deleteDemoCompetitor(id);
    return;
  }
  await apiFetch(`/api/competitors/${id}`, { method: "DELETE" });
}

export async function toggleCompetitor(id: string): Promise<void> {
  if (isDemoSession()) {
    toggleDemoCompetitor(id);
    return;
  }
  await apiFetch(`/api/competitors/${id}`, { method: "PATCH" });
}

// ─── LEADS ────────────────────────────────────────────────────────────────────

export async function listLeads(
  platform: Platform,
  filter: "PENDING" | "ALL" = "PENDING"
): Promise<Lead[]> {
  if (isDemoSession()) {
    return listDemoLeads(platform, filter);
  }
  return apiFetch<Lead[]>(`/api/leads?platform=${platform}&filter=${filter}`);
}

export async function updateLeadDraft(id: string, draft: string): Promise<void> {
  if (isDemoSession()) {
    updateDemoLeadDraft(id, draft);
    return;
  }
  await apiFetch(`/api/leads/${id}/draft`, {
    method: "PUT",
    body: JSON.stringify({ draft }),
  });
}

export async function markLeadReplied(id: string): Promise<void> {
  if (isDemoSession()) {
    markDemoLeadReplied(id);
    return;
  }
  await apiFetch(`/api/leads/${id}/reply`, { method: "POST" });
}

export async function deleteLead(id: string): Promise<void> {
  if (isDemoSession()) {
    deleteDemoLead(id);
    return;
  }
  await apiFetch(`/api/leads/${id}`, { method: "DELETE" });
}

export async function deletePlatformLeads(platform: Platform): Promise<void> {
  if (isDemoSession()) {
    deleteDemoPlatformLeads(platform);
    return;
  }
  await apiFetch(`/api/leads?platform=${platform}`, { method: "DELETE" });
}

/**
 * Generate a reply draft for a single lead.
 * In Demo Mode: checks and decrements the strict 5 demo tokens, tries LLM or uses dynamic smart fallback.
 * In Live Mode: invokes /api/pipeline/process-lead.
 */
export async function generateLeadReply(id: string): Promise<Lead> {
  if (isDemoSession()) {
    // 1. Consume demo token (strict limit)
    const tokenResult = consumeDemoToken(id);
    if (!tokenResult.success) {
      throw new Error("PENDING_PAYMENT");
    }

    const lead = getDemoLead(id);
    if (!lead) throw new Error("Lead not found");

    // 2. Hybrid approach: attempt real LLM API if backend is reachable
    try {
      const realResult = await apiFetch<{
        result: string;
        reply?: string;
        credit_type?: string;
        processing_time_ms?: number;
      }>("/api/pipeline/process-lead", {
        method: "POST",
        body: JSON.stringify({ lead_id: id }),
      });
      if (realResult.result === "SUCCESS" && realResult.reply) {
        updateDemoLeadDraft(id, realResult.reply);
        return {
          ...lead,
          gate_2_generated_reply: realResult.reply,
          processing_time_ms: realResult.processing_time_ms || 1200,
        };
      }
    } catch {
      // Graceful fallback to smart contextual generation
    }

    // Realistic simulation delay for dynamic generation feel
    await new Promise((r) => setTimeout(r, 1100));
    const profile = getDemoProfile();
    const draft = generateSmartDemoReply(lead.raw_content, profile.tone_of_voice);
    updateDemoLeadDraft(id, draft);
    return {
      ...lead,
      gate_2_generated_reply: draft,
      processing_time_ms: 1100,
    };
  }

  const result = await apiFetch<{
    result: string;
    reply?: string;
    credit_type?: string;
    processing_time_ms?: number;
    reason?: string;
  }>("/api/pipeline/process-lead", {
    method: "POST",
    body: JSON.stringify({ lead_id: id }),
  });

  if (result.result === "PENDING_PAYMENT") {
    throw new Error("PENDING_PAYMENT");
  }
  if (result.result === "REJECTED") {
    throw new Error("REJECTED");
  }

  // Re-fetch the specific updated lead by ID
  const updated = await apiFetch<Lead>(`/api/leads/${id}`);
  if (!updated) throw new Error("Lead not found after pipeline");
  return updated;
}

/**
 * Trigger batch parallel processing for multiple leads.
 */
export async function generateBatchReplies(leadIds: string[]): Promise<{
  summary: { total: number; success: number; rejected: number; pending_payment: number; failed: number };
  results: Array<{ lead_id: string; status: string; reply?: string; error?: string }>;
}> {
  if (isDemoSession()) {
    const results = [];
    let success = 0;
    let pending_payment = 0;

    for (const id of leadIds) {
      try {
        const updated = await generateLeadReply(id);
        results.push({ lead_id: id, status: "SUCCESS", reply: updated.gate_2_generated_reply || "" });
        success++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "failed";
        if (msg === "PENDING_PAYMENT") {
          results.push({ lead_id: id, status: "PENDING_PAYMENT", error: "Insufficient demo tokens" });
          pending_payment++;
        } else {
          results.push({ lead_id: id, status: "FAILED", error: msg });
        }
      }
    }

    return {
      summary: {
        total: leadIds.length,
        success,
        rejected: 0,
        pending_payment,
        failed: leadIds.length - success - pending_payment,
      },
      results,
    };
  }

  return apiFetch("/api/pipeline/process-batch", {
    method: "POST",
    body: JSON.stringify({ lead_ids: leadIds }),
  });
}

// ─── SCRAPING ─────────────────────────────────────────────────────────────────

export async function triggerScrape(options?: {
  competitor_target_id?: string;
  platform?: Platform;
  force?: boolean;
}): Promise<{
  message: string;
  scraped?: number;
  fuzzy_filtered?: number;
  inserted?: number;
  duplicates?: number;
  throttled?: boolean;
  next_scrape_in_minutes?: number;
  error?: string;
}> {
  if (isDemoSession()) {
    // First, attempt Scraper API if possible ("pakai scrapeapi kalau bisa")
    try {
      const realScrape = await apiFetch<{
        message: string;
        inserted?: number;
        scraped?: number;
        fuzzy_filtered?: number;
        duplicates?: number;
      }>("/api/ingest/scrape", {
        method: "POST",
        body: JSON.stringify(options ?? {}),
      });
      if (realScrape.inserted !== undefined && realScrape.inserted >= 0) {
        return realScrape;
      }
    } catch {
      // Scrape API unavailable/rate limited -> Dynamic smart fallback
    }

    // Dynamic smart fallback: inject fresh contextual complaint leads
    await new Promise((r) => setTimeout(r, 900));
    const platform = options?.platform || "X";
    const timestamp = Date.now();
    const fallbackLeads: Lead[] = [
      {
        id: `lead-${platform.toLowerCase()}-${timestamp}`,
        profile_id: "demo-user-undercut",
        competitor_target_id: "comp-1",
        platform,
        external_post_id: `${timestamp}`,
        author_username: platform === "X" ? "marcus_io" : "product.leads.hub",
        author_avatar_url: null,
        raw_content:
          platform === "X"
            ? "Frustrated with database sync delays on Notion again today. Anyone found a fast, modern alternative that doesn't slow down after 100 pages?"
            : "Looking for an all-in-one workspace tool that doesn't have endless loading spinners. Drop your recommendations below 👇",
        post_url: platform === "X" ? "https://x.com" : "https://instagram.com",
        gate_1_passed: true,
        gate_1_model_used: "nvidia/nemotron-3-super-120b-a12b:free",
        gate_2_generated_reply: null,
        gate_2_model_used: null,
        status: "PENDING",
        processing_time_ms: null,
        created_at: new Date().toISOString(),
      },
    ];
    appendDemoLeads(fallbackLeads);
    return {
      message: "Scrape complete. Found 1 new lead.",
      scraped: 1,
      fuzzy_filtered: 0,
      inserted: 1,
      duplicates: 0,
    };
  }

  return apiFetch("/api/ingest/scrape", {
    method: "POST",
    body: JSON.stringify(options ?? {}),
  });
}

// ─── BILLING ──────────────────────────────────────────────────────────────────

export interface BillingStatus {
  credit_balance: number;
  free_demo_credits_remaining: number;
  free_demo_reset_at: string;
  leads_this_week: number;
  leads_replied_total: number;
}

export async function getBillingStatus(): Promise<BillingStatus> {
  if (isDemoSession()) {
    return getDemoBillingStatus();
  }
  return apiFetch<BillingStatus>("/api/billing/status");
}

export async function listLedger(): Promise<BillingEntry[]> {
  if (isDemoSession()) {
    return listDemoLedger();
  }
  const data = await apiFetch<{ ledger: BillingEntry[]; transactions: Transaction[] }>(
    "/api/billing/history"
  );
  return data.ledger;
}

export async function listTransactions(): Promise<Transaction[]> {
  if (isDemoSession()) {
    return listDemoTransactions();
  }
  const data = await apiFetch<{ ledger: BillingEntry[]; transactions: Transaction[] }>(
    "/api/billing/history"
  );
  return data.transactions;
}

export async function createTopUp(
  amountUsd: number
): Promise<{ redirectUrl: string; orderId: string }> {
  if (isDemoSession()) {
    // In portfolio mode, top up is in maintenance
    throw new Error("TOPUP_MAINTENANCE: Fitur Top-up dinonaktifkan dalam mode portofolio");
  }

  const data = await apiFetch<{ id: string; url: string; order_id: string }>(
    "/api/billing/topup",
    {
      method: "POST",
      body: JSON.stringify({ amount_usd: amountUsd }),
    }
  );
  return { redirectUrl: data.url, orderId: data.order_id };
}

// ─── LEGACY COMPAT (kept for components that call these) ──────────────────────

/** @deprecated Use generateLeadReply which calls the real pipeline */
export function deductBillingCredit(): boolean {
  return true;
}

/** @deprecated Legacy mock function */
export function decrementDemoCredit() {
  return {} as Profile;
}