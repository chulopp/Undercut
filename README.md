<p align="center">
  <img src="public/LogoUndercut.svg" alt="Undercut Logo" width="120" />
</p>

<h1 align="center">Undercut</h1>

<p align="center">
  Turn competitor complaints into your next customers.
</p>

<p align="center">
  <a href="https://undercut.app">Website</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#deployment">Deployment</a>
</p>

---

## 🚀 HackOnVibe Hackathon Submission

**Undercut** was built and designed for the **HackOnVibe** hackathon as an AI-powered growth hacking tool. It enables startups and indie hackers to capture high-intent customers by monitoring competitor complaints in real-time.

---

## 🎯 Product Description & Concept

**Undercut** is a social listening and automated lead acquisition platform. Instead of spending hours manual-searching keywords on social media, Undercut automates the entire funnel:
1. **Scrapes** recent posts mentioning competitors on X (Twitter) and Instagram.
2. **Filters** out noise using an AI classification gate (only showing genuine complaints or high-intent posts).
3. **Drafts** custom, contextual, and persuasive pitch replies tailored to the user's product, core differentiators, and preferred brand voice.
4. **Simplifies** the reply process with single-click actions (X tweet intents or copy-paste helpers).

---

## 👥 Target Users

Undercut is designed specifically for:
- **Indie Hackers & Solo Founders**: Acquire early adopters by directly offering your alternative to frustrated users.
- **SaaS Growth Teams**: Scale organic user acquisition by hijacking competitor complaints.
- **Digital Marketers**: Track competitor brand sentiments and capture leads in real-time.

---

## 🛠️ What We Built for HackOnVibe

For the **HackOnVibe** hackathon, we built a fully-functioning end-to-end MVP. Here are the core features implemented:

### 1. Multi-Platform Scraper Ingestion
- Real-time background data fetching from **X (Twitter)** and **Instagram** via RapidAPI.
- Automatically handles normalizations and filters out duplicates.

### 2. High-Performance Two-Gate AI Pipeline
- **Gate 1 (AI Gatekeeper)**: Leverages OpenRouter/Nemotron to inspect the raw content and classify if it is a relevant competitor complaint. Irrelevant posts (noise) are immediately hard deleted.
- **Gate 2 (AI Reply Draftsman)**: Leverages DeepSeek to draft personalized replies containing custom product profile differentiators matching the user's brand voice.

### 3. Interactive Lead Queue & Dashboard
- Clean, responsive platform tabs (X and Instagram).
- **Draft Sorting**: Leads with generated drafts are prioritized and automatically sorted to the top.
- **Inline Editing & Validation**: Edit drafts directly with real-time character limit enforcement (free X plan auto-restricted to `262` chars to prevent Twitter overflow).
- **Delete All**: Clean up queues in one click with stylized action pills.

### 4. Credit-Based Billing & Monetization
- **Free Trial**: New users start with `$0.00` balance and **5 free demo credits** resetting weekly.
- **Stripe Top-ups**: Fully integrated Stripe checkout session flows with bonus reward tiers (3% bonus for $50+, 5% bonus for $100+).
- **Dynamic Success Callback**: Handles Stripe webhooks and callbacks, automatically refreshing balances and displaying success notifications with the exact top-up amount.

### 5. Personalized Onboarding Wizard
- Step-by-step onboarding flow setting up **Product Name**, **Landing Page**, **Core Competitors**, and **Core Differentiators**.
- Interactive **Tone of Voice** selector (Professional, Casual, Supportive, Bold) with real-time AI-generated preview.

---

## Tech Stack

| Layer           | Technology                                                                 |
| --------------- | -------------------------------------------------------------------------- |
| Framework       | [Next.js 16](https://nextjs.org) (App Router, Turbopack)                  |
| Language        | TypeScript                                                                 |
| Styling         | Tailwind CSS v4                                                            |
| UI / Animation  | React 19, Framer Motion, Lucide Icons                                      |
| Auth & Database | [Supabase](https://supabase.com) (Auth, PostgreSQL, Row Level Security)    |
| LLM Providers   | [OpenRouter](https://openrouter.ai), [DeepSeek](https://deepseek.com)     |
| Scraping        | [RapidAPI](https://rapidapi.com) (twitter-api45, instagram-scraper-stable) |
| Payments        | [Stripe](https://stripe.com) (Checkout, Webhooks)                         |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/callback/       # Supabase OAuth callback
│   │   ├── billing/
│   │   │   ├── history/         # GET  — transaction history
│   │   │   ├── status/          # GET  — credit balance & billing status
│   │   │   ├── topup/           # POST — create Stripe checkout session
│   │   │   └── webhook/stripe/  # POST — Stripe webhook handler
│   │   ├── competitors/         # CRUD for competitor targets
│   │   ├── ingest/scrape/       # POST — trigger scrape for a target
│   │   ├── leads/               # CRUD for leads, draft & reply actions
│   │   ├── pipeline/
│   │   │   ├── process-batch/   # POST — batch-process multiple leads
│   │   │   └── process-lead/    # POST — process single lead (Gate 1 → Gate 2)
│   │   └── profile/             # GET/PUT user profile
│   ├── billing/                 # Billing & top-up page
│   ├── dashboard/               # Lead queue (X and Instagram tabs)
│   ├── privacy/                 # Privacy policy
│   ├── profile/                 # Profile & onboarding settings
│   ├── terms/                   # Terms of service
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Landing page
├── components/
│   ├── dashboard/               # LeadCard, LeadQueue, MobileTabBar, etc.
│   ├── landing/                 # Hero, Pricing, HowItWorks, LiveDemoWidget
│   ├── onboarding/              # OnboardingWizard, TonePreview
│   └── ui/                      # Toast, shared UI primitives
├── lib/
│   ├── pipeline/
│   │   ├── concurrency.ts       # Concurrency limiter utility
│   │   ├── gate1.ts             # Gate 1: complaint classification
│   │   ├── gate2.ts             # Gate 2: reply generation
│   │   └── helpers.ts           # Pipeline orchestration helpers
│   ├── data.ts                  # Client-side data fetching
│   ├── fud-keywords.ts          # Keyword lists for relevance filtering
│   ├── llm-client.ts            # LLM provider abstraction (OpenRouter / DeepSeek)
│   ├── normalizer.ts            # Raw API response normalization
│   ├── scraper.ts               # X & Instagram scraper integration
│   ├── server-data.ts           # Server-side Supabase data access
│   ├── stripe.ts                # Stripe client initialization
│   ├── types.ts                 # Shared TypeScript interfaces
│   └── utils.ts                 # General utilities
└── proxy.ts                     # Next.js middleware (auth & onboarding gate)
```

---

## Architecture

```
┌─────────────┐       ┌──────────────────────────────────────────────────┐
│  Landing     │       │                   Dashboard                      │
│  Page        │──────▶│  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
└─────────────┘       │  │ Lead Queue │  │  Profile   │  │  Billing  │  │
                      │  └─────┬──────┘  └────────────┘  └─────┬─────┘  │
                      └────────┼───────────────────────────────┼────────┘
                               │                               │
                      ┌────────▼────────┐             ┌────────▼────────┐
                      │  /api/ingest    │             │  /api/billing   │
                      │  Scrape targets │             │  Stripe topup   │
                      └────────┬────────┘             └────────┬────────┘
                               │                               │
                      ┌────────▼────────┐             ┌────────▼────────┐
                      │   RapidAPI      │             │     Stripe      │
                      │  X + Instagram  │             │   Checkout +    │
                      └────────┬────────┘             │   Webhooks      │
                               │                      └─────────────────┘
                      ┌────────▼────────┐
                      │  /api/pipeline  │
                      │  Gate 1 + 2     │
                      └────────┬────────┘
                               │
                      ┌────────▼────────┐
                      │  LLM Providers  │
                      │  OpenRouter /   │
                      │  DeepSeek       │
                      └────────┬────────┘
                               │
                      ┌────────▼────────┐
                      │    Supabase     │
                      │  PostgreSQL +   │
                      │  Auth + RLS     │
                      └─────────────────┘
```

### Pipeline Flow

1. **Scrape** — User triggers a scrape for a competitor target. The scraper fetches recent posts from X or Instagram, normalizes the data, deduplicates against existing leads, and inserts new leads with `status = PENDING` and `gate_1_passed = false`.

2. **Gate 1 (Classification)** — When the user clicks "Generate Draft" on a lead, Gate 1 runs first. An LLM evaluates whether the post is a genuine complaint about the target competitor. If it passes, the lead advances to Gate 2.

3. **Gate 2 (Reply Generation)** — A second LLM call generates a contextual reply draft using the user's product profile, differentiators, and selected tone of voice. Credits are consumed at this stage.

4. **Review & Send** — The user reviews the AI draft, optionally edits it, and marks the lead as replied.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account (test mode is sufficient for development)
- A [RapidAPI](https://rapidapi.com) account with subscriptions to:
  - `twitter-api45`
  - `instagram-scraper-stable-api`
- An [OpenRouter](https://openrouter.ai) API key
- A [DeepSeek](https://deepseek.com) API key (used as fallback)

### Installation

```bash
# Clone the repository
git clone git@github.com:chulopp/Undercut.git
cd Undercut

# Install dependencies
npm install

# Copy the environment template and fill in your credentials
cp .env.example .env.local

# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# LLM Providers
OPENROUTER_API_KEY=<your-openrouter-key>
DEEPSEEK_API_KEY=<your-deepseek-key>
DEEPSEEK_BASE_URL=https://api.deepseek.com

# LLM Models
GATE1_MODEL_PRIMARY=nvidia/nemotron-3-super-120b-a12b:free
GATE1_MODEL_FALLBACK=<comma-separated fallback model list>
GATE2_MODEL=deepseek-chat
GATE2_MODEL_FALLBACK=<comma-separated fallback model list>

# RapidAPI
RAPIDAPI_KEY=<your-rapidapi-key>
RAPIDAPI_HOST_TWITTER=twitter-api45.p.rapidapi.com
RAPIDAPI_HOST_INSTAGRAM=instagram-scraper-stable-api.p.rapidapi.com

# Stripe
STRIPE_SECRET_KEY=<your-stripe-secret-key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
STRIPE_WEBHOOK_SECRET=<your-webhook-signing-secret>

# Business Config
TOPUP_BONUS_TIER_1_THRESHOLD=50
TOPUP_BONUS_TIER_1_PERCENT=3
TOPUP_BONUS_TIER_2_THRESHOLD=100
TOPUP_BONUS_TIER_2_PERCENT=5
```

---

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Post-Deployment Checklist

After deploying to your hosting provider, complete the following configuration steps:

#### 1. Google OAuth (Supabase Auth)

Add your production callback URL to the Google Cloud Console:

```
https://<your-domain>/api/auth/callback
```

Configure the same URL in **Supabase Dashboard → Authentication → Providers → Google**.

#### 2. Stripe Webhooks

Create a webhook endpoint in the Stripe Dashboard pointing to:

```
https://<your-domain>/api/billing/webhook/stripe
```

Subscribe to the following events:
- `checkout.session.completed`

Update `STRIPE_WEBHOOK_SECRET` with the signing secret from the newly created endpoint.

#### 3. Supabase Database Functions

Execute the following SQL in your Supabase SQL Editor to create the credit consumption function:

```sql
CREATE OR REPLACE FUNCTION consume_cycle_credit(
  p_profile_id UUID,
  p_lead_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_tx_type TEXT;
  v_actual_amount NUMERIC;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  IF v_profile.free_demo_credits_remaining > 0 THEN
    UPDATE profiles
    SET free_demo_credits_remaining = free_demo_credits_remaining - 1
    WHERE id = p_profile_id;

    v_tx_type := 'FREE_DEMO';
    v_actual_amount := 0;
  ELSIF v_profile.credit_balance >= p_amount THEN
    UPDATE profiles
    SET credit_balance = credit_balance - p_amount
    WHERE id = p_profile_id;

    v_tx_type := 'GATE_2_GENERATION_FEE';
    v_actual_amount := p_amount;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  END IF;

  INSERT INTO billing_ledger (profile_id, lead_id, amount_usd, transaction_type)
  VALUES (p_profile_id, p_lead_id, v_actual_amount, v_tx_type);

  RETURN jsonb_build_object('ok', true, 'type', v_tx_type, 'charged', v_actual_amount);
END;
$$;
```

#### 4. Environment Variables

Set all variables from [Environment Variables](#environment-variables) in your hosting provider's settings. Update `NEXT_PUBLIC_APP_URL` to your production domain.

---

## API Reference

| Method | Endpoint                          | Description                                |
| ------ | --------------------------------- | ------------------------------------------ |
| GET    | `/api/profile`                    | Fetch current user profile                 |
| PUT    | `/api/profile`                    | Update profile and onboarding settings     |
| GET    | `/api/competitors`                | List all competitor targets                |
| POST   | `/api/competitors`                | Create a new competitor target             |
| DELETE | `/api/competitors/[id]`           | Remove a competitor target                 |
| GET    | `/api/leads`                      | List leads (filterable by platform/status) |
| GET    | `/api/leads/[id]`                 | Fetch a single lead                        |
| DELETE | `/api/leads/[id]`                 | Delete a lead                              |
| POST   | `/api/leads/[id]/draft`           | Generate AI reply draft (Gate 1 + Gate 2)  |
| POST   | `/api/leads/[id]/reply`           | Mark lead as replied                       |
| POST   | `/api/ingest/scrape`              | Trigger scrape for a competitor target     |
| POST   | `/api/pipeline/process-lead`      | Process a single lead through the pipeline |
| POST   | `/api/pipeline/process-batch`     | Batch-process multiple leads               |
| GET    | `/api/billing/status`             | Fetch credit balance and billing status    |
| POST   | `/api/billing/topup`              | Create a Stripe checkout session           |
| GET    | `/api/billing/history`            | Fetch transaction history                  |
| POST   | `/api/billing/webhook/stripe`     | Stripe webhook handler                     |

All authenticated endpoints require a valid Supabase session cookie. Row Level Security (RLS) policies enforce per-user data isolation at the database level.

---

## Scripts

| Command         | Description                           |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start development server (Turbopack)  |
| `npm run build` | Create production build               |
| `npm start`     | Start production server               |
| `npm run lint`  | Run ESLint                            |

---

## License

This project is proprietary software. All rights reserved.

---

<p align="center">
  <a href="https://undercut.app"><strong>https://undercut.app</strong></a>
</p>
