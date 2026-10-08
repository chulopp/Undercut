/**
 * demo-storage.ts
 * In-browser mock and state manager for Undercut Portfolio / Demo Mode.
 * Stores demo profile, competitor targets, realistic leads feed, and a strict 5-token balance.
 * Requires ZERO Supabase or external cloud dependencies.
 */

import type {
  Competitor,
  Lead,
  Platform,
  Profile,
  ProfileInput,
  BillingEntry,
  Transaction,
} from "@/lib/types";

export const DEMO_COOKIE_NAME = "undercut_demo_mode";
const STORAGE_PREFIX = "undercut_demo_";

export const INITIAL_DEMO_TOKENS = 5;

const DEFAULT_PROFILE: Profile = {
  id: "demo-user-undercut",
  email: "demo@undercut.app",
  app_name: "Undercut",
  app_description:
    "Competitor FUD interceptor that monitors complaints on X & Instagram and drafts high-conversion, empathy-first replies.",
  app_url: "https://undercut.app",
  app_category: "Marketing",
  target_audience: "Indie hackers, SaaS founders, and growth marketers",
  tone_of_voice: "friendly",
  onboarding_completed: true,
  differentiators: {
    differentiator_1: "Automated real-time competitor complaint monitoring",
    differentiator_2: "Non-pushy, empathy-first replies that feel 100% human",
    differentiator_3: "One-click posting directly into X & Instagram reply threads",
  },
  image_placeholder_url: "",
  company_name: "Undercut Labs",
  credit_balance: 0,
  free_demo_credits_remaining: INITIAL_DEMO_TOKENS,
  free_demo_reset_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  x_plan: "free",
  created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
};

const DEFAULT_COMPETITORS: Competitor[] = [
  {
    id: "comp-1",
    profile_id: "demo-user-undercut",
    competitor_name: "Notion",
    platform: "X",
    search_query: "@Notion slow OR @Notion crash OR @Notion offline OR #NotionFail",
    is_active: true,
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  },
  {
    id: "comp-2",
    profile_id: "demo-user-undercut",
    competitor_name: "ClickUp",
    platform: "X",
    search_query: "@ClickUp lag OR @ClickUp bug OR @ClickUp broken OR #ClickUpDown",
    is_active: true,
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: "comp-3",
    profile_id: "demo-user-undercut",
    competitor_name: "Trello",
    platform: "X",
    search_query: "@Trello down OR @Trello limit OR #TrelloFail",
    is_active: true,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "comp-4",
    profile_id: "demo-user-undercut",
    competitor_name: "Notion",
    platform: "INSTAGRAM",
    search_query: "notionhq",
    is_active: true,
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  },
  {
    id: "comp-5",
    profile_id: "demo-user-undercut",
    competitor_name: "ClickUp",
    platform: "INSTAGRAM",
    search_query: "clickuphq",
    is_active: true,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

const DEFAULT_LEADS: Lead[] = [
  {
    id: "lead-x-1",
    profile_id: "demo-user-undercut",
    competitor_target_id: "comp-1",
    platform: "X",
    external_post_id: "1894028340192301",
    author_username: "sarah_builds",
    author_avatar_url: null,
    raw_content:
      "Is @Notion down again or is it taking literally 15 seconds to load a simple database page today? Losing my entire morning flow right now 😭",
    post_url: "https://twitter.com/sarah_builds/status/1894028340192301",
    gate_1_passed: true,
    gate_1_model_used: "nvidia/nemotron-3-super-120b-a12b:free",
    gate_2_generated_reply: null,
    gate_2_model_used: null,
    status: "PENDING",
    processing_time_ms: null,
    created_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
  },
  {
    id: "lead-x-2",
    profile_id: "demo-user-undercut",
    competitor_target_id: "comp-2",
    platform: "X",
    external_post_id: "1894028340192302",
    author_username: "dev_alexander",
    author_avatar_url: null,
    raw_content:
      "@ClickUp why is the desktop app consuming 3GB of RAM just to display 4 sprint tasks? My fans sound like a jet engine preparing for takeoff.",
    post_url: "https://twitter.com/dev_alexander/status/1894028340192302",
    gate_1_passed: true,
    gate_1_model_used: "nvidia/nemotron-3-super-120b-a12b:free",
    gate_2_generated_reply: null,
    gate_2_model_used: null,
    status: "PENDING",
    processing_time_ms: null,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "lead-x-3",
    profile_id: "demo-user-undercut",
    competitor_target_id: "comp-1",
    platform: "X",
    external_post_id: "1894028340192303",
    author_username: "rachel_growth",
    author_avatar_url: null,
    raw_content:
      "Looking for lightweight Notion alternatives. I love the flexibility but searching across workspaces is becoming unbearable when databases get large.",
    post_url: "https://twitter.com/rachel_growth/status/1894028340192303",
    gate_1_passed: true,
    gate_1_model_used: "nvidia/nemotron-3-super-120b-a12b:free",
    gate_2_generated_reply:
      "Ouch, database lag is the worst productivity killer 🙌 We built Undercut with instant local-first indexing so searches return in under 30ms, no matter your workspace size. Might be worth checking out if you need snappy speed!",
    gate_2_model_used: "deepseek-chat",
    status: "PENDING",
    processing_time_ms: 1420,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "lead-ig-1",
    profile_id: "demo-user-undercut",
    competitor_target_id: "comp-4",
    platform: "INSTAGRAM",
    external_post_id: "3490218930129",
    author_username: "creative.minds.studio",
    author_avatar_url: null,
    raw_content:
      "Still waiting for an offline mode that actually works reliably without syncing errors when re-connecting... any suggestions?",
    post_url: "https://instagram.com/p/3490218930129",
    gate_1_passed: true,
    gate_1_model_used: "nvidia/nemotron-3-super-120b-a12b:free",
    gate_2_generated_reply: null,
    gate_2_model_used: null,
    status: "PENDING",
    processing_time_ms: null,
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "lead-ig-2",
    profile_id: "demo-user-undercut",
    competitor_target_id: "comp-5",
    platform: "INSTAGRAM",
    external_post_id: "3490218930130",
    author_username: "jordan_designs",
    author_avatar_url: null,
    raw_content:
      "The latest update reset my custom dashboard views again. This is the second time this month our design team had to rebuild views.",
    post_url: "https://instagram.com/p/3490218930130",
    gate_1_passed: true,
    gate_1_model_used: "nvidia/nemotron-3-super-120b-a12b:free",
    gate_2_generated_reply: null,
    gate_2_model_used: null,
    status: "PENDING",
    processing_time_ms: null,
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
];

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-demo-1",
    profile_id: "demo-user-undercut",
    gateway: "stripe",
    gateway_order_id: "undercut-topup-demo-1001",
    top_up_amount_usd: 10,
    credit_granted_usd: 10,
    amount_idr: 160000,
    status: "SETTLED",
    paid_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
];

const DEFAULT_LEDGER: BillingEntry[] = [
  {
    id: "led-demo-1",
    profile_id: "demo-user-undercut",
    lead_id: "lead-x-3",
    amount_usd: 0,
    transaction_type: "FREE_DEMO",
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

// ────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ────────────────────────────────────────────────────────────

function getStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn("[demo-storage] setItem failed:", e);
  }
}

// ────────────────────────────────────────────────────────────
// SESSION MANAGEMENT
// ────────────────────────────────────────────────────────────

export function isDemoSession(): boolean {
  if (typeof window === "undefined") return false;
  const cookieMatch = document.cookie.includes(`${DEMO_COOKIE_NAME}=true`);
  const localMatch = localStorage.getItem(`${STORAGE_PREFIX}active`) === "true";
  return cookieMatch || localMatch;
}

export function activateDemoSession(): void {
  if (typeof window === "undefined") return;
  const isSecure = window.location.protocol === "https:" ? "; Secure" : "";
  // Set cookie for 7 days (accessible by Next.js proxy middleware)
  document.cookie = `${DEMO_COOKIE_NAME}=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isSecure}`;
  localStorage.setItem(`${STORAGE_PREFIX}active`, "true");

  // Ensure initial data exists
  if (!localStorage.getItem(STORAGE_PREFIX + "profile")) {
    resetDemoSession();
  }
}

export function resetDemoSession(): void {
  if (typeof window === "undefined") return;
  setStorage("profile", DEFAULT_PROFILE);
  setStorage("competitors", DEFAULT_COMPETITORS);
  setStorage("leads", DEFAULT_LEADS);
  setStorage("transactions", DEFAULT_TRANSACTIONS);
  setStorage("ledger", DEFAULT_LEDGER);
  setStorage("tokens_remaining", INITIAL_DEMO_TOKENS);
  window.dispatchEvent(new CustomEvent("billing-updated"));
}

export function clearDemoSession(): void {
  if (typeof window === "undefined") return;
  const isSecure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${DEMO_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax${isSecure}`;
  localStorage.removeItem(`${STORAGE_PREFIX}active`);
  localStorage.removeItem(`${STORAGE_PREFIX}profile`);
  localStorage.removeItem(`${STORAGE_PREFIX}competitors`);
  localStorage.removeItem(`${STORAGE_PREFIX}leads`);
  localStorage.removeItem(`${STORAGE_PREFIX}transactions`);
  localStorage.removeItem(`${STORAGE_PREFIX}ledger`);
  localStorage.removeItem(`${STORAGE_PREFIX}tokens_remaining`);
}

// ────────────────────────────────────────────────────────────
// PROFILE ACCESS
// ────────────────────────────────────────────────────────────

export function getDemoProfile(): Profile {
  const profile = getStorage<Profile>("profile", DEFAULT_PROFILE);
  const tokens = getStorage<number>("tokens_remaining", INITIAL_DEMO_TOKENS);
  return {
    ...profile,
    free_demo_credits_remaining: tokens,
  };
}

export function saveDemoProfile(input: ProfileInput): Profile {
  const current = getDemoProfile();
  const updated: Profile = {
    ...current,
    ...input,
    onboarding_completed: true,
  };
  setStorage("profile", updated);
  return updated;
}

// ────────────────────────────────────────────────────────────
// COMPETITORS ACCESS
// ────────────────────────────────────────────────────────────

export function listDemoCompetitors(platform?: Platform): Competitor[] {
  const list = getStorage<Competitor[]>("competitors", DEFAULT_COMPETITORS);
  return platform ? list.filter((c) => c.platform === platform) : list;
}

export function addDemoCompetitor(
  input: Pick<Competitor, "competitor_name" | "platform" | "search_query">
): Competitor {
  const list = listDemoCompetitors();
  const newComp: Competitor = {
    id: `comp-${Date.now()}`,
    profile_id: "demo-user-undercut",
    competitor_name: input.competitor_name,
    platform: input.platform,
    search_query: input.search_query,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  setStorage("competitors", [newComp, ...list]);
  return newComp;
}

export function deleteDemoCompetitor(id: string): void {
  const list = listDemoCompetitors();
  setStorage(
    "competitors",
    list.filter((c) => c.id !== id)
  );
}

export function toggleDemoCompetitor(id: string): void {
  const list = listDemoCompetitors();
  setStorage(
    "competitors",
    list.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c))
  );
}

// ────────────────────────────────────────────────────────────
// LEADS ACCESS
// ────────────────────────────────────────────────────────────

export function listDemoLeads(platform: Platform, filter = "PENDING"): Lead[] {
  const all = getStorage<Lead[]>("leads", DEFAULT_LEADS);
  const byPlatform = all.filter((l) => l.platform === platform);
  if (filter === "PENDING") {
    return byPlatform.filter((l) =>
      ["PENDING", "PENDING_PAYMENT", "REPLIED"].includes(l.status)
    );
  }
  return byPlatform;
}

export function getDemoLead(id: string): Lead | null {
  const all = getStorage<Lead[]>("leads", DEFAULT_LEADS);
  return all.find((l) => l.id === id) ?? null;
}

export function updateDemoLeadDraft(id: string, draft: string): void {
  const all = getStorage<Lead[]>("leads", DEFAULT_LEADS);
  setStorage(
    "leads",
    all.map((l) => (l.id === id ? { ...l, gate_2_generated_reply: draft } : l))
  );
}

export function markDemoLeadReplied(id: string): void {
  const all = getStorage<Lead[]>("leads", DEFAULT_LEADS);
  setStorage(
    "leads",
    all.map((l) => (l.id === id ? { ...l, status: "REPLIED" } : l))
  );
}

export function deleteDemoLead(id: string): void {
  const all = getStorage<Lead[]>("leads", DEFAULT_LEADS);
  setStorage(
    "leads",
    all.filter((l) => l.id !== id)
  );
}

export function deleteDemoPlatformLeads(platform: Platform): void {
  const all = getStorage<Lead[]>("leads", DEFAULT_LEADS);
  setStorage(
    "leads",
    all.filter((l) => l.platform !== platform)
  );
}

export function appendDemoLeads(newLeads: Lead[]): void {
  const all = getStorage<Lead[]>("leads", DEFAULT_LEADS);
  // Avoid duplicate external_post_ids
  const existingIds = new Set(all.map((l) => l.external_post_id));
  const filtered = newLeads.filter((l) => !existingIds.has(l.external_post_id));
  setStorage("leads", [...filtered, ...all]);
}

// ────────────────────────────────────────────────────────────
// BILLING & TOKEN BALANCE
// ────────────────────────────────────────────────────────────

export interface DemoBillingStatus {
  credit_balance: number;
  free_demo_credits_remaining: number;
  free_demo_reset_at: string;
  leads_this_week: number;
  leads_replied_total: number;
}

export function getDemoBillingStatus(): DemoBillingStatus {
  const tokens = getStorage<number>("tokens_remaining", INITIAL_DEMO_TOKENS);
  const leads = getStorage<Lead[]>("leads", DEFAULT_LEADS);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const leadsThisWeek = leads.filter((l) => +new Date(l.created_at) >= weekAgo).length;
  const leadsRepliedTotal = leads.filter((l) => l.status === "REPLIED").length;

  return {
    credit_balance: 0,
    free_demo_credits_remaining: tokens,
    free_demo_reset_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    leads_this_week: leadsThisWeek,
    leads_replied_total: leadsRepliedTotal,
  };
}

export function consumeDemoToken(leadId: string): { success: boolean; remaining: number } {
  const tokens = getStorage<number>("tokens_remaining", INITIAL_DEMO_TOKENS);
  if (tokens <= 0) {
    return { success: false, remaining: 0 };
  }

  const nextTokens = tokens - 1;
  setStorage("tokens_remaining", nextTokens);

  // Add ledger entry
  const ledger = getStorage<BillingEntry[]>("ledger", DEFAULT_LEDGER);
  const newEntry: BillingEntry = {
    id: `led-${Date.now()}`,
    profile_id: "demo-user-undercut",
    lead_id: leadId,
    amount_usd: 0,
    transaction_type: "FREE_DEMO",
    created_at: new Date().toISOString(),
  };
  setStorage("ledger", [newEntry, ...ledger]);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("billing-updated"));
  }

  return { success: true, remaining: nextTokens };
}

export function listDemoLedger(): BillingEntry[] {
  return getStorage<BillingEntry[]>("ledger", DEFAULT_LEDGER);
}

export function listDemoTransactions(): Transaction[] {
  return getStorage<Transaction[]>("transactions", DEFAULT_TRANSACTIONS);
}

// ────────────────────────────────────────────────────────────
// SMART DRAFT GENERATOR (FALLBACK & DEMO)
// ────────────────────────────────────────────────────────────

const SAMPLE_REPLY_TEMPLATES: Record<string, string[]> = {
  friendly: [
    "Ouch, that downtime is super frustrating 🙌 We actually built Undercut to solve this exact problem with instant zero-lag syncing. Feel free to check out our demo if you need a reliable alternative!",
    "That lag is really rough 🙌 Our team switched away from heavy tools because of this. We made Undercut lightweight and snappy (loads in under 50ms). Hope your workflow recovers soon!",
    "Totally feel your pain on this 🙌 That's why we focused on a clean, distraction-free workflow with zero memory bloat. Might be worth taking a look if you're exploring alternatives!",
  ],
  professional: [
    "Workflow interruptions like this cause significant productivity loss. Undercut was engineered specifically for sub-50ms response times and 99.99% uptime for team workflows.",
    "Database latency and memory overhead are common pain points in legacy tools. Undercut delivers streamlined performance with enterprise-grade stability and zero bloat.",
  ],
  casual: [
    "Man that really sucks, lost flow is the worst. We got so tired of crashes that we built Undercut — super fast and lightweight. Hope you get it sorted out!",
    "Ugh, memory hogs are the worst. We made Undercut specifically to be featherweight and fast on any machine.",
  ],
  playful: [
    "Oof, looks like the gremlins got into the servers again 😅 If you ever want a tool that doesn't melt your laptop fans, Undercut is here to save the day!",
    "Your fans shouldn't sound like a rocket launch just for a few tasks 😅 Check out Undercut for butter-smooth speed without the noise!",
  ],
};

export function generateSmartDemoReply(
  rawContent: string,
  tone: string = "friendly"
): string {
  const templates = SAMPLE_REPLY_TEMPLATES[tone] || SAMPLE_REPLY_TEMPLATES.friendly;
  const randomIndex = Math.floor(Math.random() * templates.length);
  return templates[randomIndex];
}
