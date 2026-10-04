# DECISIONS.md — Architecture Decision Records

Log of major architectural decisions made in Undercut. Format: ADR (Architecture Decision Record).

Each entry answers three questions: **What was decided? Why? What alternatives were not chosen?**

> To record a new decision: append a new entry with the next number. Do not modify existing entries — if a decision changes, add a new entry with status "Supersedes ADR-NNN".

---

## ADR-001: Gate 1 Uses OpenRouter (Free Models) instead of DeepSeek Directly

**Date:** 2026-07 (documented from PRD v4.1)
**Status:** Accepted
**Reference File:** `src/lib/pipeline/gate1.ts:11-17`

**Decision:**
Gate 1 (relevance classifier) uses free models via OpenRouter as primary, rather than DeepSeek or paid models.

**Rationale:**
Gate 1 is a filtering stage — its job is only to output a binary `true`/`false` classification per post. This task does not require an expensive model. Since Gate 1 is executed every time a user clicks "Generate Draft", utilizing free models ensures this stage adds zero to operational costs — consistent with the "Gate 1 is always free" product value proposition.

**Alternatives Considered:**
- *DeepSeek directly from the start* — too expensive for a simple binary classifier task. DeepSeek is better suited for the generative task (Gate 2).
- *Rule-based filter only (no LLM)* — kept as a Fuzzy Pre-filter (Gate 0 / `fud-keywords.ts`), but not accurate enough for the final classification filter.

**Consequences:**
- Actual rate limits: 20 rpm / 200 rpd per free model on OpenRouter. Sufficient for early staging, but must be monitored as volume grows.
- An 8+ model fallback chain is required for resilience (see ADR-002 regarding emergency fallback to DeepSeek).

---

## ADR-002: Gate 2 Uses Official DeepSeek API as Primary instead of OpenRouter

**Date:** 2026-07 (documented from PRD v4.1)
**Status:** Accepted
**Reference File:** `src/lib/pipeline/gate2.ts:12,19`

**Decision:**
Gate 2 (reply draft generator) uses `deepseek-chat` via the official DeepSeek API as the primary model, instead of via OpenRouter.

**Rationale:**
Gate 2 generates the text that will be reviewed and sent directly by the user. Output quality is critical here — poor drafts damage user trust. DeepSeek `deepseek-chat` (V4 Flash) offers more consistent quality and lower latency than OpenRouter free models for generative tasks. DeepSeek's cost-per-call is also far below the $0.10 fee charged to the user per successful draft.

**Alternatives Considered:**
- *OpenRouter free models as primary for Gate 2* — inconsistent output quality; some free models frequently generate text that feels generic or off-tone. Kept as fallback.
- *GPT-4 / Claude* — too expensive to maintain margins under the $0.10/cycle model.

**Consequences:**
- `DEEPSEEK_API_KEY` is a mandatory environment variable for Gate 2 to function optimally.
- If the DeepSeek API goes down, it falls back to OpenRouter free models — output quality may degrade temporarily.
- Gate 2 also acts as an emergency fallback for Gate 1 (if all OpenRouter models fail, Gate 1 attempts `deepseek-chat` once).

---

## ADR-003: Instagram Ingestion Uses competitor Username instead of Free-Text Keyword

**Date:** 2026-07 (documented from PRD v4.1 §4.1)
**Status:** Accepted
**Reference File:** `src/lib/scraper.ts:84-137`, `src/lib/types.ts:55`

**Decision:**
For the Instagram platform, users input the **competitor's username** (e.g., `tokopedia`) — not free-text keywords or hashtags. The system then scrapes the latest posts from that competitor's account.

**Rationale:**
The Instagram search endpoints available on RapidAPI (`search_ig.php`) return a mix of accounts, hashtags, locations, and posts, making it difficult to classify competitor complaints reliably. A more predictable strategy is to retrieve the competitor's official posts, then analyze captions and comments. This is also more intuitive for users: "add competitor by their username".

**Alternatives Considered:**
- *Free-text keyword search on Instagram* — available endpoints are not reliable for this use case. Mixed results are difficult to parse consistently.
- *Scrape comments on competitor posts* — ideal, but technically more complex, and standard APIs do not support this easily.

**Consequences:**
- Instagram inputs are validated as usernames (automatic `@` strip).
- Endpoint used: `POST instagram-scraper-stable-api.p.rapidapi.com/get_ig_user_posts.php` (note: this is a POST, not a GET).
- Response shape is unstable — the codebase already handles 4 possible shape wrappers.

---

## ADR-004: Gate 1 Failure Leads to Permanent Deletion of Post from Database

**Date:** 2026-07 (documented from PRD v4.1 §4.2)
**Status:** Accepted
**Reference File:** `src/lib/pipeline/helpers.ts:151-153`

**Decision:**
If Gate 1 rejects a lead (irrelevant), the row is immediately deleted (`DELETE`) from the `leads_queue` table — rather than updating its status to `REJECTED`.

**Rationale:**
Leads rejected by Gate 1 are noise — posts that passed the fuzzy pre-filter but were deemed irrelevant by the LLM. Storing them fills up the database without adding value. Permanent deletion keeps data clean and storage efficient. There is no audit trail requirement for rejected posts since no billing event occurred and no user action was taken.

**Alternatives Considered:**
- *Save with status `REJECTED` for analytics* — considered, but no concrete use case exists in the MVP. Can be revisited when "trend analytics" are built (see `ROADMAP.md` §2 regarding CockroachDB).
- *Soft delete* — unnecessary. There is no recovery requirement for this data.

**Consequences:**
- There is no way to review leads rejected by Gate 1. This is by design.
- Different from Gate 2 failures: if Gate 2 fails (all fallback models fail), the lead is returned to `PENDING` status to allow user retries. Only Gate 1 rejection results in permanent deletion.

---

## ADR-005: Prepaid Credit Wallet Model instead of Charging per Transaction

**Date:** 2026-07 (documented from PRD v4.1 §2.2)
**Status:** Accepted
**Reference File:** `src/lib/types.ts:90-102`, `docs/INTERNAL_PRD.md §2.2`

**Decision:**
Users top-up credit balance in advance, and the system deducts $0.10 per successful draft generation. There is no direct pay-as-you-go billing per transaction.

**Rationale:**
No payment gateway is efficient enough to process $0.10 microtransactions. The administrative fees exceed the transaction value. The prepaid wallet model aggregates small microtransactions into a single larger top-up — making it economical for both parties.

**Alternatives Considered:**
- *Monthly subscription* — high friction for early adopters who want a low-risk trial.
- *Direct charge per transaction* — technically uneconomical (gateway fees > transaction value).
- *Freemium with feature gating* — exists as a weekly free demo, but not the primary monetization model.

**Consequences:**
- `credit_balance` in the `profiles` table is the source of truth for user balances.
- Minimum top-up amount is $2.00 (equivalent to 20 cycles).
- New users receive a $2.00 trial balance upon registration.
- Added: 5 free weekly demo credits (tracked separately from `credit_balance` and automatically reset via `consume_cycle_credit()`).

---

## ADR-006: Stripe Checkout as Primary Payment Gateway (instead of Midtrans)

**Date:** 2026-07 (documented from PRD v4.1 §3, ROADMAP.md §0)
**Status:** Accepted — to be extended with Midtrans (Phase 3)
**Reference File:** `src/lib/stripe.ts`, `src/app/api/billing/topup/`, `src/app/api/billing/webhook/`

**Decision:**
Stripe Checkout is used as the primary payment gateway, even though the initial target market is Indonesia.

**Rationale:**
Stripe supports global credit card processing, Apple Pay, and Google Pay in USD — simplifying the billing codebase and speeding up setup. For hackathon judging, Stripe is significantly easier to configure and demo than Midtrans, which requires a longer merchant approval process.

**Alternatives Considered:**
- *Midtrans from the start* — better suited for the Indonesian market (GoPay, QRIS, local bank transfers), but merchant approval takes time. Planned for integration in Phase 3 (not replacing Stripe).
- *Xendit* — also considered, placeholder exists in `CHECK` constraint of `payment_transactions`, but not implemented.

**Consequences:**
- The `payment_transactions.gateway` schema is already designed for multiple gateways (`CHECK (gateway IN ('stripe', 'midtrans', 'xendit'))`). Adding Midtrans later will only require adding new routes, not database schema migrations.
- Stripe webhooks are verified using `STRIPE_WEBHOOK_SECRET` and protected by the `webhook_events` idempotency guard.
- Indonesian buyers currently must pay via credit/debit card on Stripe — GoPay/QRIS will be available after Midtrans is integrated.

---

## ADR-007: CockroachDB as an Analytics Layer, Not a Total Migration from Supabase

**Date:** 2026-07 (documented from ROADMAP.md §2)
**Status:** Planned — not yet implemented
**Reference File:** `ROADMAP.md §2`

**Decision:**
When CockroachDB is integrated (planned for Phase 2), it will act as an **additional analytics layer** — not replacing Supabase.

**Rationale:**
Supabase is a mature transactional source of truth (Auth, Billing, Active Queue RLS). Migrating all data to CockroachDB carries high operational risk without clear transactional benefits. The primary use case for CockroachDB in Undercut is storing **historical lead text embeddings** for vector similarity searches and trend analysis. Keeping transactional data and analytical data separated is the safest architectural approach.

**Alternatives Considered:**
- *Total migration from Supabase to CockroachDB* — high risk, RLS and billing are already working smoothly in Supabase.
- *pgvector in Supabase* — Supabase supports pgvector, but lacks the distributed SQL scalability and analytics indexing required for high-volume historical trends. CockroachDB is also a core requirement for its respective hackathon.

**Consequences:**
- Two distinct database connection strings will exist in the environment: `DATABASE_URL` (Supabase) and `COCKROACHDB_CONNECTION_STRING` (CockroachDB).
- CockroachDB only stores analytical data: text embeddings, topic tags, and sentiment scores.
- No foreign keys will cross the database boundaries — profile IDs and competitor target IDs will be stored as plain UUIDs instead of foreign key constraints.
- Writes to CockroachDB will run **asynchronously after Gate 1 finishes** — preventing write latency on the critical Gate 1 → Gate 2 user path.

---

## ADR-008: Semi-Automated (Human-in-the-Loop) — No Auto-Reply Bots

**Date:** 2026-07 (documented from PRD v4.1 §4.3)
**Status:** Accepted — permanent product decision
**Reference File:** `docs/INTERNAL_PRD.md` §4.3, §4.3 C.4

**Decision:**
Undercut never publishes replies automatically. All reply actions require an explicit click by the user, sending the pitch from their own account (via X Intent URL or clipboard helper + new tab for Instagram).

**Rationale:**
Automated posting by background bots is the primary cause of social account suspensions and shadowbans. Platform algorithms actively detect and restrict automated posting behaviors. From a compliance and trust perspective, pitches published on behalf of users must pass through explicit human review first.

**Alternatives Considered:**
- *Background auto-replying* — rejected. Shadowban risk is too high, and users lose control over what is posted in their name.
- *Approval workflow with automated background posting* — still risky since posting originates from a server rather than the user's browser context.

**Consequences:**
- "Reply on X" button: opens `https://twitter.com/intent/tweet?in_reply_to={id}&text={encoded_reply}` in a new tab.
- "Reply on IG" button: copies the draft to clipboard and opens the target IG post in a new tab.
- Clicking reply updates the lead status to `REPLIED` optimistically without waiting for server verification.

---

## ADR-009: Fuzzy Pre-Filter (Gate 0) Runs Before Database Insertion

**Date:** 2026-07 (from active code patterns)
**Status:** Accepted
**Reference File:** `src/lib/fud-keywords.ts`, `src/lib/pipeline/helpers.ts:54-62`

**Decision:**
Before posts are saved to the `leads_queue` database table, they must pass through a local, dictionary-based fuzzy pre-filter (`fuzzyPreFilter()`). Posts with scores < 0.20 are immediately discarded.

**Rationale:**
Gate 1 LLM classification is highly accurate but introduces latency (15s per model, multiple fallback attempts). The fuzzy pre-filter runs locally in microseconds at zero cost. Discarding obvious noise (short ads, pure positive reviews, generic spam) at the edge saves substantial API call budgets and latency.

**Alternatives Considered:**
- *Run Gate 1 directly on all scraped posts* — highly inefficient. Gate 1 introduces high latency.
- *Aggressive pre-filtering (higher threshold)* — risks discarding true positives. The 0.20 threshold is intentionally permissive to catch most potential leads while filtering out obvious junk.

**Consequences:**
- The `FUD_KEYWORDS` dictionary in `fud-keywords.ts` must be updated if new categories of complaints need to be monitored.
- The dictionary includes Indonesian FUD keywords (`indonesian_fud` category) to support Southeast Asian targets.
- If a relevant complaint is missed, check if it was discarded by the fuzzy filter before blaming Gate 1.

---

## ADR-010: Gate 1 Runs On-Demand when User Clicks "Generate Draft"

**Date:** 2026-07 (from active code patterns)
**Status:** Accepted
**Reference File:** `src/lib/pipeline/helpers.ts:22-24`, `src/lib/pipeline/helpers.ts:139-171`

**Decision:**
Gate 1 LLM classification does not run during scraping. Scraped posts enter `leads_queue` as `PENDING` with `gate_1_passed=false`. Gate 1 is executed on-demand when the user clicks the "Generate Draft" button on the dashboard.

**Rationale:**
Running Gate 1 during scraping would immediately exhaust OpenRouter free model rate limits (20 rpm / 200 rpd) across multiple active targets and users. By running Gate 1 on-demand, LLM calls are only made when a user is actively engaging with the dashboard. This also gives users visibility over raw scraped posts, letting them choose which leads to process.

**Alternatives Considered:**
- *Run Gate 1 during background scraping* — exhausts free tier OpenRouter limits quickly.
- *Background queue execution* — viable but requires a dedicated queue infrastructure (e.g., BullMQ or QStash), which is not yet implemented (see `ROADMAP.md` Phase 4).

**Consequences:**
- The dashboard renders unfiltered raw posts (status `PENDING`, `gate_1_passed=false`).
- Users can review raw content before committing to draft generation.
- Unprocessed posts remain in the queue as `PENDING` indefinitely.

---

## ADR-011: Authentication via Google OAuth Only

**Date:** 2026-07 (documented from PRD v4.1 §4.4)
**Status:** Accepted
**Reference File:** `src/app/login/`, `docs/INTERNAL_PRD.md §4.4`

**Decision:**
Authentication is restricted to Google OAuth via Supabase Auth. Email/password, OTP, and other OAuth providers are not supported.

**Rationale:**
Restricting auth to a single OAuth provider reduces codebase complexity (no need for password reset flows, email verification, or session mapping). Google OAuth covers the vast majority of our target audience (developers, indie hackers, SaaS growth marketers). Supabase Auth manages OAuth sessions securely out-of-the-box.

**Alternatives Considered:**
- *Email + Password* — universal but requires password management, reset flows, and email verification overhead.
- *Multiple OAuth providers (GitHub, Twitter)* — useful for developer audiences, but adds integration overhead. Can be added later.

**Consequences:**
- User profiles are created automatically via the PostgreSQL trigger `on_auth_user_created` when signing in for the first time.
- **Active state check:** Google OAuth is hidden for the hackathon judging demo. Temporary login flows are in place. Consult owner before modifying authentication files.

---

## ADR-012: `consume_cycle_credit()` Implemented as a SELECT FOR UPDATE RPC

**Date:** 2026-07 (from SQL schema in PRD v4.1 §8)
**Status:** Accepted
**Reference File:** `src/lib/pipeline/helpers.ts:174-195`, `docs/INTERNAL_PRD.md §8 (consume_cycle_credit)`

**Decision:**
Checking and debiting user credits is handled inside a PostgreSQL Database Function (RPC) `consume_cycle_credit()` using `SELECT ... FOR UPDATE` to lock the profile row during the transaction.

**Rationale:**
Prevents race conditions. If a user opens the dashboard in two separate tabs and clicks "Generate Draft" simultaneously, both client requests could read a positive credit balance and proceed to Gate 2 before either updates the balance. Row-level locking ensures transactions are processed sequentially.

**Alternatives Considered:**
- *Client-side check-and-update* — unsafe. Database rows can be read concurrently.
- *Application-level mutex* — unreliable in stateless serverless environments.

**Consequences:**
- Never modify user `credit_balance` directly from client-side code. Always trigger the database function.
- The database function returns `'FREE_DEMO'`, `'CHARGED'`, or `'INSUFFICIENT_BALANCE'`.
- Weekly free credit reset logic is managed directly inside this database function.

---

## ADR-013: Weekly Free Demo Credits Used Before Paid credit_balance

**Date:** 2026-07 (documented from PRD v4.1 §2)
**Status:** Accepted
**Reference File:** `docs/INTERNAL_PRD.md §8 (consume_cycle_credit)`, `src/lib/pipeline/helpers.ts:184`

**Decision:**
Inside the `consume_cycle_credit()` function, weekly free demo credits (`free_demo_credits_remaining`) are consumed first, before deducting paid `credit_balance`.

**Rationale:**
Acts as an intentional user retention hook. Users get free value at the start of each week, regardless of their paid credit state. This ensures users with $0.00 balances can still generate 5 drafts per week — keeping them engaged and giving them ongoing reasons to top-up.

**Alternatives Considered:**
- *Consume paid credits first* — weakens the retention hook. Users who top up $2 would not benefit from free weekly credits until their paid balance is exhausted.
- *Proportional consumption* — overly complex without clear benefits.

**Consequences:**
- Users with paid credit balances still use free weekly credits first.
- This must be clearly visible in the UI (implemented in the dashboard credit widget).
- Billing ledgers record transaction type `FREE_DEMO` with $0.00 amount.

---

## ADR-014: Landing Page Replaces Dedicated Documentation Section (/docs)

**Date:** 2026-07 (documented from PRD v4.1 §1)
**Status:** Accepted
**Reference File:** `src/app/page.tsx`, `docs/INTERNAL_PRD.md §1`

**Decision:**
The dedicated documentation subroutes (`/docs`) have been removed. All product explanations, setup instructions, and FAQs are combined into the root landing page (`/`).

**Rationale:**
Maintaining separate docs (previously built using Fumadocs) introduces content maintenance overhead. For early-stage startups, keeping all details on a single page ensures visitors can learn everything without navigating away — maximizing conversion rates.

**Alternatives Considered:**
- *Maintain Fumadocs* — discarded to reduce maintenance footprint.
- *Lightweight documentation subpages* — unnecessary. The FAQ accordion and feature checklist on the landing page cover all common technical queries.

**Consequences:**
- Documentation links have been removed from the navigation header and footer.
- Technical updates are added directly to the landing page FAQ.
- SEO efforts are concentrated entirely on the root URL (`/`).
