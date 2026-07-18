# ARCHITECTURE.md — Undercut

> **Untuk AI Agent:** Baca file ini sebelum mengerjakan task apapun di repo ini.
> Dokumen ini menjelaskan bagaimana sistem bekerja secara nyata — bukan yang direncanakan, tapi yang sudah ada di kode. Setiap klaim di sini punya referensi ke file aktual.

---

## 1. Gambaran Sistem

**Undercut** adalah SaaS intelijen pasar yang memantau keluhan publik tentang kompetitor di X (Twitter) dan Instagram, lalu menghasilkan draf balasan promosi yang dipersonalisasi menggunakan LLM.

**Model bisnis:** Prepaid credit wallet. Top-up sekali pakai, dipotong $0.10 per draf balasan yang berhasil dibuat. Gate 1 (filter relevansi) selalu gratis — biaya hanya muncul saat Gate 2 berhasil.

**Stack utama:**
| Layer | Teknologi |
|---|---|
| Framework | Next.js (App Router) |
| Database & Auth | Supabase (PostgreSQL + RLS + Realtime) |
| LLM Gate 1 | OpenRouter (model gratis, fallback chain) |
| LLM Gate 2 | DeepSeek API resmi (`deepseek-chat`) + fallback OpenRouter |
| Scraper | RapidAPI: `twitter-api45` (X) + `instagram-scraper-stable-api` (IG) |
| Payment | Stripe Checkout |
| Hosting | Vercel (CI/CD via GitHub) |

---

## 2. Peta Komponen

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page (/)
│   ├── login/                    # Google OAuth entry point
│   ├── profile/                  # Onboarding & edit profil aplikasi
│   ├── dashboard/                # Dashboard utama (/dashboard/x, /dashboard/instagram)
│   ├── billing/                  # Riwayat transaksi
│   └── api/
│       ├── auth/                 # Supabase Auth callback
│       ├── profile/              # GET/PUT profil user
│       ├── competitors/          # CRUD competitor targets
│       ├── leads/                # GET leads_queue per platform
│       ├── ingest/               # POST /api/ingest/scrape — trigger scraping manual
│       ├── pipeline/
│       │   ├── process-lead/     # POST — user klik "Generate Draft" → jalankan pipeline
│       │   └── process-batch/    # POST — batch scraping semua target aktif
│       └── billing/
│           ├── topup/            # POST — buat Stripe Checkout Session
│           ├── webhook/stripe/   # POST — Stripe webhook handler
│           ├── status/           # GET — saldo & demo credits
│           └── history/          # GET — riwayat ledger
│
└── lib/
    ├── scraper.ts                # RapidAPI integration (scrapeX, scrapeInstagram)
    ├── normalizer.ts             # Normalisasi raw payload → NormalizedPost
    ├── fud-keywords.ts           # Fuzzy pre-filter (FUD_KEYWORDS dictionary + fuzzyPreFilter())
    ├── llm-client.ts             # Provider-agnostic LLM wrapper (callWithFallback)
    ├── types.ts                  # Semua TypeScript types domain
    ├── server-data.ts            # Supabase query helpers (server-side only)
    ├── stripe.ts                 # Stripe client init
    └── pipeline/
        ├── gate1.ts              # Relevance & Sentiment Classifier
        ├── gate2.ts              # Contextual Reply Generator
        ├── helpers.ts            # processScrapeTarget(), processLeadPipeline()
        └── concurrency.ts        # mapWithConcurrency(), CONCURRENCY_SCRAPE_TARGETS
```

---

## 3. Alur Data — Request Lifecycle Lengkap

### 3A. Alur Scraping (Background / Manual Trigger)

```
User / Cron Job
     │
     ▼
POST /api/ingest/scrape
  atau
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
         body: username_or_url={username}           ← ⚠️ POST, bukan GET
         response shape: varies (lihat §7 Gotchas)
         Limit: 12 posts
              │
              ▼
     normalizer.ts → normalizeTweets / normalizeIGPosts
     (ubah raw payload → NormalizedPost standar)
              │
              ▼
     fud-keywords.ts → fuzzyPreFilter(text, competitorName)
     Score ≥ 0.20 → lolos filter   Score < 0.20 → dibuang
     (murah — tidak ada LLM call di tahap ini)
              │
              ▼
     Deduplication: cek external_post_id di leads_queue
     (scoped by profile_id, bukan global)
              │
              ▼
     INSERT ke leads_queue
     status='PENDING', gate_1_passed=false
     (Gate 1 BELUM dijalankan di sini)
```

### 3B. Alur Generate Draft (User-Triggered)

```
User klik "Generate Draft" di dashboard
     │
     ▼
POST /api/pipeline/process-lead
  body: { leadId }
     │
     ▼
helpers.ts → processLeadPipeline(userId, leadId)
     │
     ▼
[STEP 1] Fetch lead dari leads_queue
         Validasi: profile_id harus = userId (owner check)
     │
     ▼
[STEP 2] Gate 1 — hanya dijalankan kalau gate_1_passed=false
         │
         ├── llm-client.ts → callWithFallback(openrouter, GATE1_MODELS)
         │       timeout per model: 15.000ms
         │       output: "true" / "false" (diparse dengan regex)
         │
         ├── [gate_1_passed = false]
         │       DELETE leads_queue WHERE id = leadId    ← dihapus permanen
         │       return { result: 'REJECTED' }
         │
         └── [gate_1_passed = true]
                 UPDATE leads_queue SET gate_1_passed=true, gate_1_model_used=...
     │
     ▼
[STEP 3] Billing Check — atomic (Postgres RPC)
         consume_cycle_credit(profile_id, lead_id)
         Priority:
           1. free_demo_credits_remaining > 0  → pakai FREE_DEMO (gratis)
           2. credit_balance >= 0.10           → potong $0.10 (GATE_2_GENERATION_FEE)
           3. keduanya 0                       → return 'INSUFFICIENT_BALANCE'
         │
         ├── [INSUFFICIENT_BALANCE]
         │       UPDATE leads_queue SET status='PENDING_PAYMENT'
         │       return { result: 'PENDING_PAYMENT' }
         │
         └── [FREE_DEMO atau CHARGED]
                 lanjut ke Gate 2
     │
     ▼
[STEP 4] Gate 2 — generate draf balasan
         │
         ├── gate2.ts → runGate2(rawContent, authorUsername, platform, profile)
         │       Timeout: max(10.000, 145.000 - elapsedMs - 2.000) ms
         │       Char limit:
         │         X (free plan)  = 262 karakter
         │         X (paid plan)  = 24.900 karakter
         │         INSTAGRAM      = 490 karakter
         │
         ├── [Primary] callWithFallback(deepseek, ['deepseek-chat'])
         │       temperature: 0.7 (sedikit kreatif, bukan deterministik)
         │
         └── [Fallback] callWithFallback(openrouter, GATE2_FALLBACK_MODELS)
                 dipanggil kalau DeepSeek gagal
     │
     ▼
[STEP 5] Update leads_queue
         status='PENDING' (siap direview user)
         gate_2_generated_reply = draf yang dihasilkan
         gate_2_model_used = nama model yang sukses
         processing_time_ms = total waktu pipeline
     │
     ▼
return { result: 'SUCCESS', reply, credit_type, processing_time_ms }
```

### 3C. Alur Billing — Top-Up Kredit

```
User klik "Top Up" → isi nominal
     │
     ▼
POST /api/billing/topup
  body: { amount_usd }
     │
     ▼
Hitung bonus:
  ≥ $100 → +5% bonus
  ≥ $50  → +3% bonus
  lainnya → tidak ada bonus
     │
     ▼
Stripe Checkout Session dibuat
User diarahkan ke hosted Stripe page
     │
     ▼
Setelah payment sukses:
Stripe → POST /api/billing/webhook/stripe
     │
     ▼
Verifikasi Stripe-Signature header
Idempotency check: webhook_events.event_id UNIQUE
Jika sudah ada → skip (safe to retry)
     │
     ▼
UPDATE profiles SET credit_balance = credit_balance + credit_granted_usd
INSERT billing_ledger (transaction_type='TOPUP')
INSERT payment_transactions (status='SETTLED')
```

---

## 4. Dependensi Eksternal

### 4.1 API Eksternal

| Layanan | Kegunaan | Env Var Kunci | Catatan |
|---|---|---|---|
| RapidAPI `twitter-api45` | Scraping X/Twitter | `RAPIDAPI_KEY`, `RAPIDAPI_HOST_TWITTER` | GET `/search.php?query=...&search_type=Latest` |
| RapidAPI `instagram-scraper-stable-api` | Scraping Instagram | `RAPIDAPI_KEY`, `RAPIDAPI_HOST_INSTAGRAM` | POST `get_ig_user_posts.php` (bukan GET) |
| OpenRouter | Gate 1 + Gate 2 fallback | `OPENROUTER_API_KEY` | Free models, rate limit 20rpm/200rpd per model |
| DeepSeek API | Gate 2 primary | `DEEPSEEK_API_KEY` | Endpoint: `https://api.deepseek.com/chat/completions` |
| Supabase | Database, Auth, Realtime | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Service role key: server-side only |
| Stripe | Payment gateway | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Webhook signature wajib diverifikasi |

### 4.2 Env Vars Wajib (sistem tidak bisa jalan tanpanya)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       # ⚠️ jangan expose ke client

# LLM
OPENROUTER_API_KEY              # Gate 1 + Gate 2 fallback
DEEPSEEK_API_KEY                # Gate 2 primary

# Scraper
RAPIDAPI_KEY                    # shared oleh X dan Instagram

# Payment
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET           # ⚠️ wajib untuk verifikasi webhook
```

### 4.3 Env Vars Opsional / Override

```bash
# Override model LLM (sudah ada default di kode)
GATE1_MODEL_PRIMARY=nvidia/nemotron-3-super-120b-a12b:free
GATE1_MODEL_FALLBACK=...       # comma-separated
GATE2_MODEL=deepseek-chat
GATE2_MODEL_FALLBACK=...       # comma-separated

# Override RapidAPI host (sudah ada default)
RAPIDAPI_HOST_TWITTER=twitter-api45.p.rapidapi.com
RAPIDAPI_HOST_INSTAGRAM=instagram-scraper-stable-api.p.rapidapi.com

# Konfigurasi bisnis
USD_TO_IDR_RATE=16000
TOPUP_BONUS_TIER_1_THRESHOLD=50
TOPUP_BONUS_TIER_1_PERCENT=3
TOPUP_BONUS_TIER_2_THRESHOLD=100
TOPUP_BONUS_TIER_2_PERCENT=5

# Development
USE_MOCK_SCRAPER=false         # true = pakai mock data, skip RapidAPI
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. Peta API Routes

| Method | Route | Handler | Kegunaan |
|---|---|---|---|
| POST | `/api/auth/callback` | Supabase Auth | OAuth callback setelah Google sign-in |
| GET/PUT | `/api/profile` | server-data.ts | Ambil / update profil user |
| GET/POST/DELETE | `/api/competitors` | server-data.ts | Kelola competitor targets |
| GET | `/api/leads` | server-data.ts | Ambil leads_queue (difilter per platform) |
| POST | `/api/ingest/scrape` | processScrapeTarget() | Trigger scraping manual satu target |
| POST | `/api/pipeline/process-lead` | processLeadPipeline() | Jalankan Gate 1 + Gate 2 per lead |
| POST | `/api/pipeline/process-batch` | mapWithConcurrency() | Scraping batch semua target aktif |
| POST | `/api/billing/topup` | stripe.ts | Buat Stripe Checkout Session |
| POST | `/api/billing/webhook/stripe` | — | Terima & proses notifikasi Stripe |
| GET | `/api/billing/status` | — | Saldo kredit + sisa free demo |
| GET | `/api/billing/history` | — | Riwayat billing_ledger |

---

## 6. Skema Database (Ringkasan)

Skema SQL lengkap ada di `PRDERD.md` §8. Ringkasan tabel utama:

| Tabel | Fungsi |
|---|---|
| `profiles` | Source of truth user: profil aplikasi, saldo kredit, free demo quota |
| `competitor_targets` | Daftar kompetitor yang dipantau per user, per platform |
| `leads_queue` | Antrean postingan: dari scrape mentah sampai draf balasan siap kirim |
| `billing_ledger` | Riwayat setiap charge/topup/free_demo (append-only) |
| `payment_transactions` | Record setiap transaksi top-up Stripe |
| `webhook_events` | Idempotency guard untuk webhook Stripe |

**Postgres RPC penting:**
- `consume_cycle_credit(p_profile_id, p_lead_id)` — dipanggil di `helpers.ts:175`. Menggunakan `SELECT ... FOR UPDATE` agar atomic, aman dari race condition concurrent requests.

**RLS:** Aktif di semua tabel. Service role key (`SUPABASE_SERVICE_ROLE_KEY`) wajib dipakai di server-side untuk bypass RLS pada operasi pipeline — jangan pernah expose ke client.

**Realtime:** Dashboard subscribe ke event `INSERT` di `leads_queue`, difilter `profile_id = current_user.id`. Ini yang membuat lead card muncul otomatis tanpa refresh.

---

## 7. Known Limitations & Gotchas

Ini adalah bagian yang paling penting untuk dibaca sebelum menyentuh kode apapun.

### 7.1 Gate 1 — Fallback Chain & Rate Limit

- **Rate limit OpenRouter (model gratis): 20 rpm / 200 rpd per model.** Ini batas nyata. Untuk early-stage SaaS dan demo hackathon cukup, tapi perlu diperhatikan saat volume naik.
- **Timeout per model: 15 detik** (`gate1.ts:47`). Kalau model tidak response dalam 15 detik, langsung lompat ke model berikutnya.
- **Urutan fallback Gate 1** (dari `gate1.ts:11-15`):
  1. `nvidia/nemotron-3-super-120b-a12b:free` (primary)
  2. `nvidia/nemotron-3.5-content-safety:free`
  3. `nvidia/nemotron-3-nano-30b-a3b:free`
  4. `nvidia/nemotron-nano-12b-v2-vl:free`
  5. `poolside/laguna-m.1:free`
  6. `poolside/laguna-xs-2.1:free`
  7. `cohere/north-mini-code:free`
  8. `openai/gpt-oss-20b:free`
  9. `cognitivecomputations/dolphin-mistral-24b-venice-edition:free`
  10. **Emergency fallback: `deepseek-chat` (berbayar)** — dipanggil kalau semua OpenRouter gagal
- **Kalau semua model gagal:** Gate 1 return `{ passed: false }` (konservatif — tidak ada charge ke user, lead tidak diproses). Lihat `gate1.ts:87-93`.
- **Parsing output:** Model kadang menambahkan preamble sebelum "true"/"false". Dihandle dengan regex `\b(true|yes|1)\b` dan negative check `\b(false|no|0)\b` (`gate1.ts:54`).

### 7.2 Gate 2 — Timeout Math & Char Limit

- **Total pipeline timeout: 150 detik** (`PIPELINE_TIMEOUT_MS = 145_000` plus 2s buffer di `helpers.ts:209-210`).
- **Gate 2 timeout dihitung dinamis:** `max(10.000, 145.000 - elapsedMs - 2.000)` — makin lama Gate 1 menghabiskan waktu, makin sempit window Gate 2.
- **Karakter limit penting** (`gate2.ts:22-25`):
  - X (free plan): **262** karakter (280 max dikurangi buffer untuk handle)
  - X (paid plan / X Premium): **24.900** karakter
  - Instagram: **490** karakter (500 max dikurangi buffer)
  - Limit diambil dari `profile.x_plan` — pastikan field ini terisi saat onboarding
- **Kalau Gate 2 gagal sepenuhnya:** lead dikembalikan ke status `PENDING` (bukan dihapus) agar user bisa retry. Berbeda dengan Gate 1 failure yang menghapus lead secara permanen.

### 7.3 Instagram Scraper

- **Endpoint pakai POST, bukan GET** (`scraper.ts:98-106`). Body: `application/x-www-form-urlencoded` dengan field `username_or_url`.
- **Response shape tidak konsisten** antar versi API. Kode handle 4 kemungkinan shape (`scraper.ts:118-126`): `data` (array langsung), `data.data`, `data.items`, `data.posts`. Kalau semua kosong → throw error.
- **Input: username tanpa @.** Ada auto-strip `@` di UI, tapi kalau menambah fitur yang memproses input IG secara langsung, ingat untuk strip `@` terlebih dahulu.
- **Limit 12 posts** per scrape (berbeda dengan X yang 20 posts).

### 7.4 X (Twitter) Scraper

- **Input: free-text query** (contoh: `"@CompetitorApp crash OR #CompetitorFail"`).
- **Auto-expand:** kalau query terdeteksi sebagai simple username (cuma huruf, angka, underscore), scraper otomatis mengembangkan jadi `@{username} OR to:{username} OR from:{username}` (`scraper.ts:9-17`).
- **Response shape:** `{ timeline: [...] }` — tapi ada fallback kalau response langsung array (`scraper.ts:63-67`).
- **Limit 20 posts** per scrape.

### 7.5 Fuzzy Pre-filter (Gate 0)

- Threshold score: **≥ 0.20 untuk lolos** (`fud-keywords.ts:166`). Sangat permisif — tujuannya hanya membuang noise yang jelas (postingan promo, terlalu pendek, sentimen positif murni). Filtering yang beneran dilakukan Gate 1 LLM.
- Dictionary `FUD_KEYWORDS` mencakup keyword frustasi dalam **Bahasa Indonesia** — ini penting karena mayoritas target market adalah Indonesia/SEA.
- Skor breakdown: +0.35 jika menyebut nama kompetitor, +0.15 per keyword FUD (capped), -0.40 jika positif murni, -0.30 jika spam.

### 7.6 Billing & Deduplication

- **`consume_cycle_credit()` menggunakan `SELECT FOR UPDATE`** — ini penting karena ada risiko concurrent request dari user yang sama (misalnya klik "Generate Draft" dua kali cepat). Jangan bypass RPC ini dengan query manual.
- **Deduplication scoped per `profile_id`**, bukan global (`helpers.ts:66-72`). Artinya dua user berbeda bisa punya lead dari postingan yang sama — ini by design (setiap user punya leads mereka sendiri).
- **Free demo reset** terjadi di dalam RPC `consume_cycle_credit` saat dipanggil, bukan via cron job terpisah. Reset otomatis kalau `NOW() >= free_demo_reset_at`.

### 7.7 Auth & Middleware

- **Google OAuth saat ini di-hidden** untuk keperluan judging hackathon (lihat conversation sebelumnya). Middleware masih ada tapi flow-nya mungkin berbeda dari kondisi normal.
- **Middleware cek `onboarding_completed`**: user yang belum mengisi profil dipaksa redirect ke `/profile`. Ini ditangani di `middleware.ts` (atau equivalent) — pastikan bypass ini tidak dilakukan tanpa alasan jelas.
- **`SUPABASE_SERVICE_ROLE_KEY`** digunakan via `createServiceRoleClient()` di server-side pipeline untuk bypass RLS. Semua operasi pipeline (scrape, Gate 1, Gate 2, billing) berjalan sebagai service role.

### 7.8 LLM Client (Provider-Agnostic)

- `llm-client.ts` mendukung dua provider: `openrouter` dan `deepseek`.
- **OpenRouter** membutuhkan header tambahan `HTTP-Referer` dan `X-Title` untuk rate limit tracking — sudah dihandle di `llm-client.ts:64-67`.
- **Status HTTP 429 atau 503** dari provider → otomatis lanjut ke model berikutnya (bukan throw error).
- **Empty content response** → juga lanjut ke model berikutnya (beberapa free model kadang return kosong tanpa error).

---

## 8. Roadmap Dependencies (Direncanakan, Belum Diimplementasi)

Bagian ini mencatat fitur yang sudah ada di planning docs tapi **belum ada kodenya** — jangan diasumsikan sudah tersedia:

| Fitur | Status | Dokumen Referensi |
|---|---|---|
| **CockroachDB** — Competitor Trend Memory (embedding historis, vector search) | Belum diimplementasi | `UPGRADE.md §4` |
| **DataHub** — Decision Lineage & Trust Log | Belum diimplementasi | `UPGRADE.md §5` |
| **Midtrans** — Payment gateway lokal Indonesia | Belum diimplementasi | `UPGRADE.md §6.2` |
| **Merchant of Record** (Dodo/Paddle) — Payment gateway global | Belum diimplementasi | `UPGRADE.md §6.3` |
| **Upstash Redis** — Caching layer untuk shared scrape targets | Belum diimplementasi | `UPGRADE.md §3.1` |
| **Rate/Abuse Guard** — Anti-exploit free tier | Belum diimplementasi | `UPGRADE.md §3.3` |
| **Scheduled Polling Cron** — Auto-scraping tiap 10-15 menit | Status tidak jelas — tidak ada kode cron ditemukan di repo | `PRDERD.md §4.1 A.5` |
| **Notifikasi email/push** — "Demo mingguanmu sudah reset" | Out of scope MVP | `PRDERD.md §G.11` |

> **Untuk agent:** Jangan menulis kode yang bergantung pada layanan di atas tanpa mengkonfirmasi bahwa layanan tersebut sudah terpasang. Terutama CockroachDB dan Redis — belum ada connection string-nya di `.env.example` aktif.
