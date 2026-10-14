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
 * All functions call Next.js API routes (authenticated via NextAuth session cookie).
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
  return apiFetch<Profile>("/api/profile");
}

export async function saveProfile(input: ProfileInput): Promise<Profile> {
  return apiFetch<Profile>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

// ─── COMPETITORS ──────────────────────────────────────────────────────────────

export async function listCompetitors(platform: Platform): Promise<Competitor[]> {
  return apiFetch<Competitor[]>(`/api/competitors?platform=${platform}`);
}

export async function addCompetitor(
  data: Pick<Competitor, "competitor_name" | "platform" | "search_query">
): Promise<Competitor> {
  return apiFetch<Competitor>("/api/competitors", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteCompetitor(id: string): Promise<void> {
  await apiFetch(`/api/competitors/${id}`, { method: "DELETE" });
}

export async function toggleCompetitor(id: string): Promise<void> {
  await apiFetch(`/api/competitors/${id}`, { method: "PATCH" });
}

// ─── LEADS ────────────────────────────────────────────────────────────────────

export async function listLeads(
  platform: Platform,
  filter: "PENDING" | "ALL" = "PENDING"
): Promise<Lead[]> {
  return apiFetch<Lead[]>(`/api/leads?platform=${platform}&filter=${filter}`);
}

export async function updateLeadDraft(id: string, draft: string): Promise<void> {
  await apiFetch(`/api/leads/${id}/draft`, {
    method: "PUT",
    body: JSON.stringify({ draft }),
  });
}

export async function markLeadReplied(id: string): Promise<void> {
  await apiFetch(`/api/leads/${id}/reply`, { method: "POST" });
}

export async function deleteLead(id: string): Promise<void> {
  await apiFetch(`/api/leads/${id}`, { method: "DELETE" });
}

export async function deletePlatformLeads(platform: Platform): Promise<void> {
  await apiFetch(`/api/leads?platform=${platform}`, { method: "DELETE" });
}

/**
 * Generate a reply draft for a single lead via the real pipeline.
 */
export async function generateLeadReply(id: string): Promise<Lead> {
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
  return apiFetch<BillingStatus>("/api/billing/status");
}

export async function listLedger(): Promise<BillingEntry[]> {
  const data = await apiFetch<{ ledger: BillingEntry[]; transactions: Transaction[] }>(
    "/api/billing/history"
  );
  return data.ledger;
}

export async function listTransactions(): Promise<Transaction[]> {
  const data = await apiFetch<{ ledger: BillingEntry[]; transactions: Transaction[] }>(
    "/api/billing/history"
  );
  return data.transactions;
}

export async function createTopUp(
  amountUsd: number
): Promise<{ redirectUrl: string; orderId: string }> {
  const data = await apiFetch<{ id: string; url: string; order_id: string }>(
    "/api/billing/topup",
    {
      method: "POST",
      body: JSON.stringify({ amount_usd: amountUsd }),
    }
  );
  return { redirectUrl: data.url, orderId: data.order_id };
}

// ─── LEGACY COMPAT ────────────────────────────────────────────────────────────

/** @deprecated Legacy mock function */
export function deductBillingCredit(): boolean {
  return true;
}

/** @deprecated Legacy mock function */
export function decrementDemoCredit() {
  return {} as Profile;
}