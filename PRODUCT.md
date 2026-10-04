# Undercut — Product Overview

Undercut is an AI-powered social listening and automated lead acquisition platform. It helps startups, indie hackers, and SaaS growth teams capture high-intent customers by monitoring competitor complaints on social media in real-time.

---

## 1. Problem & Opportunity

For newly launched applications and early-stage startups, acquiring the first 100 users is a major bottleneck (the *Cold Start Problem*). Standard outreach channels like cold emails and ads are increasingly expensive, noisy, and inefficient.

Meanwhile, thousands of users complain about software bugs, high prices, or poor customer support from established competitors on X (Twitter) and Instagram daily. These complaints represent a goldmine of high-intent buyers looking for better alternatives.

Manual searching for these complaints is slow, tedious, and filled with noise. Undercut automates this entire discovery and outreach funnel.

---

## 2. Product Architecture & Workflow

Undercut operates on a **Semi-Automated (Human-in-the-Loop)** workflow to ensure security, authenticity, and prevent account bans:

```
[Scrape] ──► [Filter (Gate 0 & 1)] ──► [Draft (Gate 2)] ──► [One-Click Send]
```

1. **Scrape:** Undercut pulls recent social media posts targeting competitors from X (via keyword matching) and Instagram (via profile tracking).
2. **Filter (Gate 0 & Gate 1):** Postings are filtered locally by keyword rules (Gate 0) and then passed through an LLM classification gate (Gate 1) to ensure they are genuine competitor complaints. Irrelevant mentions are immediately discarded.
3. **Draft (Gate 2):** An LLM generates a personalized, empathetic pitch reply tailored to your product's profile, core differentiators, and chosen tone of voice.
4. **Send:** The user reviews, edits, and sends the pitch using a native intent URL (X) or clipboard copy-paste helper (Instagram) in one click.

---

## 3. Core Features

- **Multi-Platform Search:** Scrapes X and Instagram targets simultaneously.
- **Double-Gate Relevance Filtering:** Ensures you only pay for highly relevant posts. Gate 1 filtering is 100% free; you only pay when a pitch is successfully generated.
- **Onboarding Personalization:** Capture your product description, URL, unique differentiators, and target audience once to generate highly specific pitch drafts.
- **Dynamic Character Limiting:** Automatically restricts drafted pitch length based on the platform rules and your Twitter account plan (e.g., 262 characters for free X accounts, 25,000 characters for X Premium).
- **Flexible Wallet Top-Ups:** Buy credits on-demand ($2 minimum checkout via Stripe) with tiered bonuses for higher amounts.
- **Free Weekly Demo Credits:** Users receive 5 free demo credits resetting weekly, allowing low-risk evaluation of incoming leads.

---

## 4. Competitive Edge

- **Context-Aware Personalization:** Unlike basic templates, Undercut uses a deep understanding of your unique selling points and chosen brand tone of voice (Professional, Casual, Playful, Supportive) to write drafts.
- **Anti-Spam Safety:** Because posting is manual and human-approved, users do not risk their social handles being flagged, shadowbanned, or suspended for automated API posting.
- **Optimistic Dashboard UX:** Live lead counters, realtime toast notifications, instant optimistic status updates, and inline draft editing ensure a fast, fluid workflow.
