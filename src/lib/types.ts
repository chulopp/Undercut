export type Platform = "X" | "INSTAGRAM";
export type ToneOfVoice = "professional" | "friendly" | "casual" | "playful";
export type LeadStatus =
  | "PENDING"
  | "PENDING_PAYMENT"
  | "APPROVED"
  | "REPLIED"
  | "REJECTED";

export interface Differentiators {
  differentiator_1: string;
  differentiator_2: string;
  differentiator_3: string;
  [key: string]: string | undefined;
}

export interface Profile {
  id: string;
  email: string;
  app_name: string;
  app_description: string;
  app_url: string;
  app_category: string;
  target_audience: string;
  tone_of_voice: ToneOfVoice;
  onboarding_completed: boolean;
  differentiators: Differentiators;
  image_placeholder_url: string;
  company_name: string | null;
  credit_balance: number;
  free_demo_credits_remaining: number;
  free_demo_reset_at: string;
  x_plan: "free" | "paid";
  created_at: string;
}

export interface ProfileInput {
  app_name: string;
  app_description: string;
  app_url: string;
  app_category: string;
  target_audience: string;
  tone_of_voice: ToneOfVoice;
  differentiators: Differentiators;
  company_name?: string | null;
  x_plan?: "free" | "paid";
}

export interface Competitor {
  id: string;
  profile_id: string;
  competitor_name: string;
  platform: Platform;
  search_query: string;
  is_active: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  profile_id: string;
  competitor_target_id: string | null;
  platform: Platform;
  external_post_id: string;
  author_username: string;
  raw_content: string;
  post_url: string;
  gate_1_passed: boolean;
  gate_1_model_used: string | null;
  gate_2_generated_reply: string | null;
  gate_2_model_used: string | null;
  status: LeadStatus;
  processing_time_ms: number | null;
  created_at: string;
}

export type BillingType = "GATE_2_GENERATION_FEE" | "FREE_DEMO" | "TOPUP" | "REFUND";

export interface BillingEntry {
  id: string;
  profile_id: string;
  lead_id: string | null;
  amount_usd: number;
  transaction_type: BillingType;
  created_at: string;
}

export type TransactionStatus = "PENDING" | "SETTLED" | "FAILED" | "EXPIRED";

export interface Transaction {
  id: string;
  profile_id: string;
  gateway: "stripe" | "midtrans" | "xendit";
  gateway_order_id: string;
  top_up_amount_usd: number;
  credit_granted_usd: number;
  amount_idr: number;
  status: TransactionStatus;
  paid_at: string | null;
  created_at: string;
}