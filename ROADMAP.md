# Undercut Roadmap

This document outlines the planned infrastructure and UX upgrades for Undercut, aligned with business validation goals and the CockroachDB × AWS Hackathon & DataHub Hackathon deadlines.

---

## 0. Guiding Principles

1. **Business Validation Takes Precedence:** Active customer outreach must continue in parallel. Infrastructure work must not block landing pilot clients.
2. **Avoid Premature Optimization:** Scalability for millions of concurrent users is deferred. The current architecture (single-instance Supabase/PostgreSQL) is sufficient to handle thousands of users.
3. **Stripe Checkout Remains Active:** The database schema is already designed for multiple gateways. Integrating alternative local payment gateways (such as Midtrans or Xendit) will be added as new implementations rather than rewrites of the active system.
4. **Hackathon Features Must Serve Real Users:** Any feature built for hackathons should also add direct value to paid users.

---

## 1. Current System Status

| Layer | Status |
| --- | --- |
| **Compute & Hosting** | Vercel, Next.js App Router, CI/CD via GitHub |
| **Database** | Supabase (PostgreSQL) — single instance, RLS active on all tables |
| **Realtime** | Supabase Realtime (live new lead notifications) |
| **Scraper** | RapidAPI (`twitter-api45`, `instagram-scraper-stable-api`), manual and batch triggers, mock fallbacks |
| **LLM Gate 1** | OpenRouter, free model fallback chain (Nvidia Nemotron primary) |
| **LLM Gate 2** | Official DeepSeek API (`deepseek-chat`), fallback to OpenRouter free models |
| **Payment** | Stripe Checkout Sessions & Webhooks |
| **Lead Memory** | Stateless — `leads_queue` is a snapshot of active items; Gate 1 rejected items are deleted |
| **AI Audit Trail** | Basic logging: model used, processing time per lead |
| **Caching** | No caching layer — each poll hits RapidAPI directly |

---

## 2. Infrastructure Upgrade Plan (Hackathon Phase)

### Phase 1: Performance & Caching (HackOnVibe Clean Up)
- **Shared Scraper Cache:** Implement Upstash Redis caching layer to avoid duplicate RapidAPI calls for popular competitor handles across different users.
- **Anti-Abuse Circuit Breaker:** Protect free tier from exploiters by applying sliding window rate limiting on manual scrape triggers.
- **Deduplication Improvements:** Scope deduplication per user profile while preserving memory safety on large queue insertions.

### Phase 2: Competitor Trend Memory (CockroachDB Integration)
*Target Deadline: CockroachDB × AWS Hackathon — August 18, 2026*
- **Database Architecture:** Deploy CockroachDB as a distributed analytics store. Supabase continues to act as the primary transactional database for Auth, Billing, and Active Queues.
- **Historical Leads Archiving:** Instead of hard-deleting Gate 1 rejected tweets, stream all scraped posts to CockroachDB.
- **Vector Search & Trend Analysis:** Generate text embeddings for all historical leads and store them in CockroachDB. Provide users with competitor complain topics, trend charts, and semantic similarity checks.
- **Async Write Pipeline:** Perform all writes to CockroachDB asynchronously behind the main request lifecycle to prevent latency overhead on the active dashboard.

### Phase 3: AI Trust Log & Decision Lineage (DataHub Integration)
- **Decision Lineage Metadata:** Track the exact flow of data through the classification funnel (Scrape -> Normalizer -> Gate 0 -> Gate 1 classification -> Credit debit -> Gate 2 reply draft generation).
- **Metadata Catalog:** Publish lead transformation schemas, model configuration specs, and execution times to DataHub for auditability.
- **AI Audit Trail:** Show users exactly why a lead was matched and which prompt guidelines were used to draft the pitch.

---

## 3. UX & Onboarding Upgrade Plan (User Feedback Phase)

### 3.1 3-Step "How It Works" on Hero
- **Issue:** The floating tweet card animations look clean but don't explain the value proposition in the first 5 seconds.
- **Action:** Add a clean 3-step banner directly under the hero subtitle:
  `1. Track Competitors → 2. AI Writes Reply → 3. Hit Send`
  *Implemented: Done (mobile & desktop visual paths).*

### 3.2 Post-Signup Navigation Flow
- **Issue:** Forcing users to fill out the onboarding profile form immediately after signing up creates high friction before they see any value.
- **Action:**
  - Route users to the main dashboard immediately after signup.
  - Display an interactive demo/mock queue on the empty state dashboard so they see the product in action.
  - Delay the onboarding profile form until the user tries to add their first competitor or generate a real draft.

### 3.3 Product Walkthrough & Previews
- **Action:** Show a live, interactive demo widget on the public landing page displaying a sample competitor complaint and the AI-generated reply. Add a mini-preview of the selected tone of voice inside the onboarding settings page.

---

## 4. Dedeferred & Out-of-Scope Items

- **Platform Expansion (TikTok, YouTube):** Deferred. Video-based scraping requires transcriptions and a completely different ingestion pipe. Focus is on X & Instagram quality first.
- **Automatic Auto-Replies (Zero Human-in-the-loop):** Out of scope. Bot-like auto-posting violates platform policies and poses severe risk of accounts getting shadowbanned.
