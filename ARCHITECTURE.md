# ARCHITECTURE.md — Undercut

> **For AI Agents:** Read this file before working on any task in this repo.
> This document explains how the system works in reality — not what is planned, but what is already implemented in code. Every claim here contains references to actual files.

---

## 1. System Overview

**Undercut** is a market intelligence SaaS that monitors public complaints about competitors on X (Twitter) and Instagram, then generates personalized promotional reply drafts using LLMs.

**Business Model:** Prepaid credit wallet. Pay-per-use model, deducting $0.10 per successfully generated reply draft. Gate 1 (relevance classifier) is always free — charges only apply upon successful Gate 2 execution.

**Core Stack:**
| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Database & Auth | Supabase (PostgreSQL + RLS + Realtime) |
| LLM Gate 1 | OpenRouter (free models, fallback chain) |
| LLM Gate 2 | Official DeepSeek API (`deepseek-chat`) + OpenRouter fallback |
| Scraper | RapidAPI: `twitter-api45` (X) + `instagram-scraper-stable-api` (IG) |
| Payment | Stripe Checkout |
| Hosting | Vercel (CI/CD via GitHub) |

---

## 2. Component Map

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page (/)
│   ├── login/                    # Google OAuth entry point
│   ├── profile/                  # Onboarding & app profile edit
│   ├── dashboard/                # Main dashboard (/dashboard/x, /dashboard/instagram)
│   ├── billing/                  # Transaction history
│   └── api/
│       ├── auth/                 # Supabase Auth callback
│       ├── profile/              # GET/PUT user profile
│       ├── competitors/          # CRUD competitor targets
│       ├── leads/                # GET leads_queue per platform
│       ├── ingest/               # POST /api/ingest/scrape — trigger manual scraping
│       ├── pipeline/
│       │   ├── process-lead/     # POST — user clicks "Generate Draft" → runs pipeline
│       │   └── process-batch/    # POST — batch scraping of all active targets
│       └── billing/
│           ├── topup/            # POST — create Stripe Checkout Session
│           ├── webhook/stripe/   # POST — Stripe webhook handler
│           ├── status/           # GET — credit balance & demo credits
│           └── history/          # GET — ledger history
│
└── lib/
    ├── scraper.ts                # RapidAPI integration (scrapeX, scrapeInstagram)
    ├── normalizer.ts             # Normalization of raw payload → NormalizedPost
    ├── fud-keywords.ts           # Fuzzy pre-filter (FUD_KEYWORDS dictionary + fuzzyPreFilter())
    ├── llm-client.ts             # Provider-agnostic LLM wrapper (callWithFallback)
    ├── types.ts                  # All TypeScript domain types
    ├── server-data.ts            # Supabase query helpers (server-side only)
    ├── stripe.ts                 # Stripe client init
    └── pipeline/
        ├── gate1.ts              # Relevance & Sentiment Classifier
        ├── gate2.ts              # Contextual Reply Generator
        ├── helpers.ts            # processScrapeTarget(), processLeadPipeline()
        └── concurrency.ts        # mapWithConcurrency(), CONCURRENCY_SCRAPE_TARGETS
```

---

## 3. Data Flow — Full Request Lifecycle

### 3A. Scraping Flow (Background / Manual Trigger)

```
User / Cron Job
     │
     ▼
POST /api/ingest/scrape
  or
POST /api/pipeline/process-batch
     │
     ▼
helpers.ts → processScrapeTarget(userId, target)
     │
     ├─ [Platform = X]─────────────────────────────┐
     │   scraper.ts → scrapeX(query, name)         │
     │   GET twitter-api45.p.rapidapi.com           │
     │   /search.php?query=...&search_type=Latest   │
     │   response: { timeline: [...] }              │
     │   Limit: 20 posts                            │
     │                                              │
     └─ [Platform = INSTAGRAM]─────────────────────┘
         scraper.ts → scrapeInstagram(username)
         POST instagram-scraper-stable-api.p.rapidapi.com
         /get_ig_user_posts.php
         body: username_or_url={username}           ← ⚠️ POST, not GET
         response shape: varies (see §7 Gotchas)
         Limit: 12 posts
              │
              ▼
     normalizer.ts → normalizeTweets / normalizeIGPosts
     (converts raw payload → standardized NormalizedPost)
              │
              ▼
     fud-keywords.ts → fuzzyPreFilter(text, competitorName)
     Score ≥ 0.20 → passes filter   Score < 0.20 → discarded
     (local evaluation — no LLM call at this stage)
              │
              ▼
     Deduplication: check external_post_id in leads_queue
     (scoped by profile_id, not global)
              │
              ▼
     INSERT into leads_queue
     status='PENDING', gate_1_passed=false
     (Gate 1 is NOT run yet)
```

### 3B. Generate Draft Flow (User-Triggered)

```
User clicks "Generate Draft" on dashboard
     │
     ▼
POST /api/pipeline/process-lead
  body: { leadId }
     │
     ▼
helpers.ts → processLeadPipeline(userId, leadId)
     │
     ▼
[STEP 1] Fetch lead from leads_queue
         Validation: profile_id must equal userId (owner check)
     │
     ▼
[STEP 2] Gate 1 — only runs if gate_1_passed=false
         │
         ├── llm-client.ts → callWithFallback(openrouter, GATE1_MODELS)
         │       timeout per model: 15,000ms
         │       output: "true" / "false" (parsed using regex)
         │
         ├── [gate_1_passed = false]
         │       DELETE leads_queue WHERE id = leadId    ← permanently deleted
         │       return { result: 'REJECTED' }
         │
         └── [gate_1_passed = true]
                 UPDATE leads_queue SET gate_1_passed=true, gate_1_model_used=...
     │
     ▼
[STEP 3] Billing Check — atomic (Postgres RPC)
         consume_cycle_credit(profile_id, lead_id)
         Priority:
           1. free_demo_credits_remaining > 0  → use FREE_DEMO (free)
           2. credit_balance >= 0.10           → deduct $0.10 (GATE_2_GENERATION_FEE)
           3. both 0                           → return 'INSUFFICIENT_BALANCE'
         │
         ├── [INSUFFICIENT_BALANCE]
         │       UPDATE leads_queue SET status='PENDING_PAYMENT'
         │       return { result: 'PENDING_PAYMENT' }
         │
         └── [FREE_DEMO or CHARGED]
                 proceed to Gate 2
     │
     ▼
[STEP 4] Gate 2 — generate reply draft
         │
         ├── gate2.ts → runGate2(rawContent, authorUsername, platform, profile)
         │       Timeout: max(10,000, 145,000 - elapsedMs - 2,000) ms
         │       Char limit:
         │         X (free plan)  = 262 characters
         │         X (paid plan)  = 24,900 characters
         │         INSTAGRAM      = 490 characters
         │
         ├── [Primary] callWithFallback(deepseek, ['deepseek-chat'])
         │       temperature: 0.7 (slightly creative, not deterministic)
         │
         └── [Fallback] callWithFallback(openrouter, GATE2_FALLBACK_MODELS)
                 called if DeepSeek fails
     │
     ▼
[STEP 5] Update leads_queue
         status='PENDING' (ready for user review)
         gate_2_generated_reply = generated draft
         gate_2_model_used = name of the successful model
         processing_time_ms = total pipeline execution time
     │
     ▼
return { result: 'SUCCESS', reply, credit_type, processing_time_ms }
```

### 3C. Billing Flow — Credit Top-Up

```
User clicks "Top Up" → enters amount
     │
     ▼
POST /api/billing/topup
  body: { amount_usd }
     │
     ▼
Calculate bonus:
  ≥ $100 → +5% bonus
  ≥ $50  → +3% bonus
  others → no bonus
     │
     ▼
Stripe Checkout Session is created
User is redirected to hosted Stripe page
     │
     ▼
After successful payment:
Stripe → POST /api/billing/webhook/stripe
     │
     ▼
Verify Stripe-Signature header
Idempotency check: webhook_events.event_id UNIQUE
If already exists → skip (safe to retry)
     │
     ▼
UPDATE profiles SET credit_balance = credit_balance + credit_granted_usd
INSERT billing_ledger (transaction_type='TOPUP')
INSERT payment_transactions (status='SETTLED')
```

---

## 4. External Dependencies

### 4.1 External APIs

| Service | Purpose | Key Env Var | Notes |
|---|---|---|---|
| RapidAPI `twitter-api45` | Scraping X/Twitter | `RAPIDAPI_KEY`, `RAPIDAPI_HOST_TWITTER` | GET `/search.php?query=...&search_type=Latest` |
| RapidAPI `instagram-scraper-stable-api` | Scraping Instagram | `RAPIDAPI_KEY`, `RAPIDAPI_HOST_INSTAGRAM` | POST `get_ig_user_posts.php` (not GET) |
| OpenRouter | Gate 1 + Gate 2 fallback | `OPENROUTER_API_KEY` | Free models, rate limit 20rpm/200rpd per model |
| DeepSeek API | Gate 2 primary | `DEEPSEEK_API_KEY` | Endpoint: `https://api.deepseek.com/chat/completions` |
| Supabase | Database, Auth, Realtime | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Service role key: server-side only |
| Stripe | Payment gateway | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Webhook signature verification is mandatory |

### 4.2 Required Env Vars (system cannot run without them)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       # ⚠️ never expose to client

# LLM
OPENROUTER_API_KEY              # Gate 1 + Gate 2 fallback
DEEPSEEK_API_KEY                # Gate 2 primary

# Scraper
RAPIDAPI_KEY                    # shared by X and Instagram

# Payment
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET           # ⚠️ mandatory for webhook verification
```

### 4.3 Optional / Override Env Vars

```bash
# Override LLM models (defaults exist in code)
GATE1_MODEL_PRIMARY=nvidia/nemotron-3-super-120b-a12b:free
GATE1_MODEL_FALLBACK=...       # comma-separated
GATE2_MODEL=deepseek-chat
GATE2_MODEL_FALLBACK=...       # comma-separated

# Override RapidAPI hosts (defaults exist in code)
RAPIDAPI_HOST_TWITTER=twitter-api45.p.rapidapi.com
RAPIDAPI_HOST_INSTAGRAM=instagram-scraper-stable-api.p.rapidapi.com

# Business Configuration
USD_TO_IDR_RATE=16000
TOPUP_BONUS_TIER_1_THRESHOLD=50
TOPUP_BONUS_TIER_1_PERCENT=3
TOPUP_BONUS_TIER_2_THRESHOLD=100
TOPUP_BONUS_TIER_2_PERCENT=5

# Development
USE_MOCK_SCRAPER=false         # true = use mock data, skip RapidAPI
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. API Routes Map

| Method | Route | Handler | Purpose |
|---|---|---|---|
| POST | `/api/auth/callback` | Supabase Auth | OAuth callback after Google sign-in |
| GET/PUT | `/api/profile` | server-data.ts | Get / update user product profile |
| GET/POST/DELETE | `/api/competitors` | server-data.ts | Manage competitor targets |
| GET | `/api/leads` | server-data.ts | Get leads_queue (filtered by platform) |
| POST | `/api/ingest/scrape` | processScrapeTarget() | Trigger manual scrape for a target |
| POST | `/api/pipeline/process-lead` | processLeadPipeline() | Run Gate 1 + Gate 2 per lead |
| POST | `/api/pipeline/process-batch` | mapWithConcurrency() | Batch-scrape all active targets |
| POST | `/api/billing/topup` | stripe.ts | Create Stripe Checkout Session |
| POST | `/api/billing/webhook/stripe` | — | Receive & process Stripe notification |
| GET | `/api/billing/status` | — | Credit balance & demo credits |
| GET | `/api/billing/history` | — | Transaction history list |

---

## 6. Database Schema Summary

The complete SQL schema is documented in `docs/INTERNAL_PRD.md` §8. Summary of main tables:

| Table | Function |
|---|---|
| `profiles` | User source of truth: product profile, credit balance, free demo quota |
| `competitor_targets` | List of monitored competitors per user, per platform |
| `leads_queue` | Ingested posts queue: from raw scrape to reply drafts |
| `billing_ledger` | History of charges, topups, and free demo usage (append-only) |
| `payment_transactions` | Records of Stripe topup transactions |
| `webhook_events` | Idempotency guard for Stripe webhooks |

**Important Postgres RPC:**
- `consume_cycle_credit(p_profile_id, p_lead_id)` — called in `helpers.ts:175`. Uses `SELECT ... FOR UPDATE` to remain atomic and safe from concurrent requests race conditions.

**RLS:** Active on all tables. The service role key (`SUPABASE_SERVICE_ROLE_KEY`) must be used server-side to bypass RLS for pipeline operations — never expose it to the client.

**Realtime:** The dashboard subscribes to `INSERT` events in `leads_queue`, filtered by `profile_id = current_user.id`. This renders new leads dynamically without page refreshes.

---

## 7. Known Limitations & Gotchas

This is the most critical section to read before modifying any code.

### 7.1 Gate 1 — Fallback Chain & Rate Limit

- **OpenRouter Free Tier Rate Limit: 20 rpm / 200 rpd per model.** This is a hard limit. Sufficient for early staging, but must be monitored as traffic grows.
- **Model Timeout: 15 seconds** (`gate1.ts:47`). If a model does not respond within 15 seconds, the pipeline immediately triggers the next model.
- **Gate 1 Fallback Order** (from `gate1.ts:11-15`):
  1. `nvidia/nemotron-3-super-120b-a12b:free` (primary)
  2. `nvidia/nemotron-3.5-content-safety:free`
  3. `nvidia/nemotron-3-nano-30b-a3b:free`
  4. `nvidia/nemotron-nano-12b-v2-vl:free`
  5. `poolside/laguna-m.1:free`
  6. `poolside/laguna-xs-2.1:free`
  7. `cohere/north-mini-code:free`
  8. `openai/gpt-oss-20b:free`
  9. `cognitivecomputations/dolphin-mistral-24b-venice-edition:free`
  10. **Emergency fallback: `deepseek-chat` (paid)** — called if all OpenRouter free models fail.
- **If all models fail:** Gate 1 returns `{ passed: false }` (conservative fallback — no charge to user, lead is not processed). See `gate1.ts:87-93`.
- **Output Parsing:** Models may add a conversational preamble before writing "true"/"false". Handled using regex `\b(true|yes|1)\b` and negative check `\b(false|no|0)\b` (`gate1.ts:54`).

### 7.2 Gate 2 — Timeout Math & Char Limit

- **Total Pipeline Timeout: 150 seconds** (`PIPELINE_TIMEOUT_MS = 145_000` plus 2s buffer in `helpers.ts:209-210`).
- **Dynamic Gate 2 Timeout:** Calculated as `max(10,000, 145,000 - elapsedMs - 2,000)`. The longer Gate 1 takes, the shorter the window for Gate 2.
- **Character Limits** (`gate2.ts:22-25`):
  - X (free plan): **262** characters (280 max minus buffer for handles)
  - X (paid plan / X Premium): **24,900** characters
  - Instagram: **490** characters (500 max minus buffer)
  - Limit is read from `profile.x_plan` — ensure this field is filled during onboarding.
- **If Gate 2 fails completely:** The lead is returned to `PENDING` status (not deleted) to allow user retries. This is different from Gate 1 rejection, which hard-deletes the lead.

### 7.3 Instagram Scraper

- **Endpoint uses POST, not GET** (`scraper.ts:98-106`). Body must be `application/x-www-form-urlencoded` containing `username_or_url`.
- **Inconsistent Response Shapes:** Code handles 4 potential payload wrappers (`scraper.ts:118-126`): direct array, `data`, `data.items`, `data.posts`. If all are empty, it throws an error.
- **Input Rules: Username without @.** Auto-stripped in UI, but remember to strip `@` manually if writing scripts that interact directly with the database.
- **Limit: 12 posts** per scrape (compared to 20 on X).

### 7.4 X (Twitter) Scraper

- **Input Rules: Free-text query** (e.g., `"@CompetitorApp crash OR #CompetitorFail"`).
- **Auto-expand:** If a query is a simple username (alphanumeric/underscore only), the scraper automatically expands it to `@{username} OR to:{username} OR from:{username}` (`scraper.ts:9-17`).
- **Response Shape:** Expects `{ timeline: [...] }` but falls back if the response is a direct array (`scraper.ts:63-67`).
- **Limit: 20 posts** per scrape.

### 7.5 Fuzzy Pre-filter (Gate 0)

- **Threshold Score: ≥ 0.20 to pass** (`fud-keywords.ts:166`). Intentionally permissive to filter out obvious noise (promotions, short spam, positive sentiments) before invoking Gate 1 LLM.
- **Indonesian Focus:** Contains Indonesian FUD terms (`indonesian_fud` category) since Southeast Asia is a core audience.
- **Score breakdown:** +0.35 for competitor name match, +0.15 per FUD keyword (capped), -0.40 for strong positive sentiment, -0.30 for spam.

### 7.6 Billing & Deduplication

- **`consume_cycle_credit()` uses `SELECT FOR UPDATE`:** Essential due to risk of concurrent clicks on "Generate Draft" by the same user on multiple tabs. Never bypass this RPC with manual client queries.
- **Deduplication is scoped per `profile_id`**, not globally (`helpers.ts:66-72`). Two separate users can import and pitch the same public tweet.
- **Free Demo Reset:** Occurs dynamically inside the `consume_cycle_credit` RPC when triggered, instead of relying on external cron triggers. Resets once `NOW() >= free_demo_reset_at`.

### 7.7 Auth & Middleware

- **Google OAuth is currently hidden** for hackathon judging purposes.
- **Onboarding Gate Middleware:** Redirects users who haven't completed onboarding to `/profile` (handled in Next.js middleware).
- **`SUPABASE_SERVICE_ROLE_KEY`** is loaded via `createServiceRoleClient()` server-side to execute billing and pipeline operations under RLS bypass.

### 7.8 LLM Client (Provider-Agnostic)

- Supports `openrouter` and `deepseek` endpoints.
- **OpenRouter Headers:** Requires `HTTP-Referer` and `X-Title` for tracking rate limits — handled in `llm-client.ts:64-67`.
- **429/503 HTTP status codes:** Triggers an automatic fallback to the next model in sequence (no errors thrown).
- **Empty content responses:** Also triggers automatic sequence fallback (some free models return empty responses on failure instead of error codes).

---

## 8. Roadmap Dependencies (Planned, Not Yet Implemented)

This section lists features documented in planning guides that **do not have code implementations yet** — do not assume they exist:

| Feature | Status | Reference Doc |
|---|---|---|
| **CockroachDB** — Competitor Trend Memory (vector similarity, historical logs) | Not implemented | `ROADMAP.md §2` |
| **DataHub** — Decision Lineage & Metadata Trust Log | Not implemented | `ROADMAP.md §2` |
| **Midtrans** — Local Indonesian payment gateway | Not implemented | `ROADMAP.md §0` |
| **Merchant of Record** (Paddle/Dodo) | Not implemented | `ROADMAP.md §0` |
| **Upstash Redis** — Scraper caching layer | Not implemented | `ROADMAP.md §2` |
| **Rate/Abuse Guard** — Slide window client rate limit | Not implemented | `ROADMAP.md §2` |
| **Scheduled Polling Cron** — Auto-scrape cron jobs | Status unclear — no active cron codes in repo | `docs/INTERNAL_PRD.md §4.1 A.5` |
| **Email/Push Notifications** — "Weekly reset" alerts | Out of MVP Scope | `docs/INTERNAL_PRD.md §G.11` |

> **For agents:** Do not write code that depends on the services above without confirming they are installed. Especially CockroachDB and Redis — no connection strings are defined in the active `.env.example`.
