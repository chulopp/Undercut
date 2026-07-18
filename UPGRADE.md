# INFRASTRUCTURE UPGRADE PLAN
## Undercut — Menuju Business Validation + CockroachDB Hackathon + DataHub Hackathon

**Dokumen pendamping:** PRD & ERD v4.1
**Versi Dokumen:** 1.0
**Filosofi utama dokumen ini:** setiap pekerjaan infra di bawah harus melayani **dua tujuan sekaligus** — (1) langsung berguna buat klien pilot yang sedang di-approach, dan (2) jadi bahan submission hackathon yang genuine, bukan tempelan. Kalau sebuah pekerjaan cuma melayani satu dari dua tujuan itu, taruh di prioritas paling akhir.

---

## 0. Prinsip Kerja Selama Fase Ini

1. **Business validation tidak boleh terhambat oleh infra work.** Outreach ke calon klien & pencarian nomor owner tetap jalan paralel, bukan menunggu infra "siap dulu".
2. **Jangan optimasi masalah yang belum ada.** Arsitektur untuk ribuan user concurrent, multi-region, dsb — **ditunda**, dicatat di §5, bukan dikerjakan sekarang. Sistem sekarang (Supabase/Postgres single-instance) sanggup menampung ratusan-low thousands user tanpa masalah.
3. **Stripe checkout TETAP DIPERTAHANKAN sebagai gateway aktif** untuk saat ini. Skema `payment_transactions.gateway` di PRD v4.1 sudah didesain multi-gateway (`stripe | midtrans | xendit`) — jadi swap ke Midtrans nanti adalah *menambah* implementasi baru, bukan *mengganti/merombak* skema yang sudah ada. Migrasi ke Midtrans produksi baru dieksekusi setelah badan usaha resmi terbentuk (lihat §6).
4. **Setiap fitur baru untuk hackathon harus fitur yang juga akan ditawarkan ke klien berbayar** — kalau tidak, itu bukan prioritas.

---

## 1. Kondisi Sistem Saat Ini (Ringkasan dari PRD v4.1)

| Layer | Status Sekarang |
|---|---|
| Compute/Hosting | Vercel, Next.js App Router, CI/CD via GitHub |
| Database | Supabase (Postgres) — single instance, RLS aktif semua tabel |
| Realtime | Supabase Realtime (notifikasi lead baru) |
| Scraper | RapidAPI (`twitter-api45`, `instagram-scraper-stable-api`), polling cron 10–15 menit per target, mock fallback |
| LLM Gate 1 | OpenRouter, fallback chain 12 model gratis |
| LLM Gate 2 | DeepSeek API resmi (`deepseek-chat`), fallback ke OpenRouter |
| Payment | Stripe Checkout (demo hackathon sebelumnya) |
| Memory/Histori | Tidak ada — `leads_queue` cuma snapshot per-lead, gate 1 gagal langsung dihapus permanen |
| Audit trail keputusan AI | Minim — cuma `gate_1_model_used`, `gate_2_model_used`, `processing_time_ms` per lead, tidak ada lineage antar tahap |
| Caching | Tidak ada layer cache — tiap polling langsung hit RapidAPI |

**Dua gap terbesar yang relevan buat rencana ini**: (1) tidak ada memori historis/tren lintas waktu, dan (2) tidak ada lineage/audit trail yang bisa "diceritakan" ke user atau juri. Dua gap ini yang jadi fokus utama upgrade.

---

## 2. Roadmap Fase — Selaras dengan Deadline Hackathon

| Fase | Minggu | Fokus | Deadline terkait |
|---|---|---|---|
| **Fase 0** | Minggu 1 | Quick wins cost & efficiency (tidak mengubah fitur, tidak butuh testing lama) | — |
| **Fase 1** | Minggu 1–3 | Fitur *Competitor Trend Memory* (CockroachDB) | CockroachDB × AWS — 18 Agustus |
| **Fase 2** | Minggu 2–4 | Fitur *Decision Lineage & Trust Log* (DataHub) | DataHub Agent Hackathon — 10 Agustus |
| **Fase 3** | Setelah badan usaha resmi | Swap Stripe → Midtrans produksi | Tidak terikat hackathon |
| **Fase 4** | Kondisional (baru dikerjakan kalau traksi nyata) | Scaling: queue system, multi-region, dsb | Tidak terikat hackathon |

Catatan urutan: Fase 2 (DataHub, deadline 10 Agustus) **harus lebih dulu selesai** dari Fase 1 (CockroachDB, deadline 18 Agustus) meski nomornya lebih besar — tapi keduanya bisa dikerjakan overlap karena tidak saling bergantung.

---

## 3. FASE 0 — Quick Wins (Minggu 1, prioritas tertinggi karena murah & langsung hemat biaya)

Ini murni soal efisiensi biaya operasional, bukan soal scale — worth dikerjakan duluan karena effort kecil, manfaat langsung terasa di cost RapidAPI & LLM.

### 3.1 Caching Layer — Upstash Redis

- **Masalah:** kalau 2+ user memantau kompetitor yang sama (misal beberapa klien F&B sama-sama track kompetitor besar yang sama), sistem sekarang akan hit RapidAPI terpisah per user tiap siklus polling — boros quota & biaya.
- **Solusi:** tambahkan cache layer sebelum insert ke `leads_queue`:
  - Key cache: hash dari `platform + search_query/username`.
  - TTL: 10–15 menit (selaras siklus polling).
  - Kalau cache hit → skip request RapidAPI baru, langsung pakai hasil yang sudah ada untuk semua user yang overlap target-nya.
- **Dampak:** langsung mengurangi request RapidAPI proporsional dengan jumlah overlap target antar klien — makin banyak klien di industri sama, makin besar penghematannya (ini juga jadi bukti nyata buat argumen "data moat per-industri" ke calon klien).

### 3.2 Dedup di Level Scraping (Bukan Cuma Level Lead)

- Skema sekarang dedup pakai `external_post_id UNIQUE` di `leads_queue` — ini dedup **setelah** proses, bukan mencegah pemanggilan API-nya.
- Tambahkan dedup **sebelum** panggil RapidAPI: cek dulu apakah `platform + search_query` yang sama sudah di-poll dalam window cache (lihat 3.1) sebelum bikin request baru.

### 3.3 Rate/Abuse Guard untuk Free Tier

- Karena model bisnis pakai kredit gratis ($2 signup + 5 siklus/minggu forever), perlu pagar sederhana supaya tidak dieksploitasi (signup massal pakai email baru terus-terusan untuk grinding kredit gratis).
- Tambahan minimal: rate-limit signup per IP/device fingerprint di level middleware, dan flag akun dengan pola penggunaan free-tier-only tanpa top-up dalam waktu lama untuk review manual (bukan diblokir otomatis, cukup ditandai).

**Estimasi effort Fase 0:** 2–4 hari kerja. Tidak mengubah UX yang sudah ada, aman dikerjakan tanpa mengganggu outreach.

---

## 4. FASE 1 — Competitor Trend Memory (CockroachDB)

### 4.1 Kenapa Ini Genuine Use Case, Bukan Tempelan

Sistem sekarang **menghapus lead yang gagal Gate 1 secara permanen** dan tidak menyimpan histori tren dari waktu ke waktu — setiap lead diproses sebagai kejadian berdiri sendiri. Fitur ini mengubah itu jadi *memory* yang bisa dijual sebagai fitur baru: **"Tren keluhan kompetitor dari waktu ke waktu"** — misal "Komplain soal kecepatan pengiriman kompetitor X naik 3x bulan ini." Ini butuh vector similarity search di atas data historis besar → use case natural buat CockroachDB (distributed SQL + vector index), bukan cuma migrasi Postgres→CockroachDB tanpa alasan.

### 4.2 Arsitektur

Untuk menghindari resiko ke sistem inti yang sudah stabil (billing, RLS, dsb), fitur ini dibangun sebagai **layer tambahan**, bukan migrasi total dari Supabase:

- Supabase tetap jadi source of truth transaksional (profiles, billing, leads_queue) — **tidak diubah**.
- CockroachDB cluster baru (CockroachDB Cloud, sesuai requirement hackathon) menyimpan **embedding tiap lead yang lolos Gate 1** (baik yang lanjut ke Gate 2 maupun tidak), plus metadata ringkas (`competitor_name`, `platform`, `sentiment_topic`, `created_at`, `profile_id` sebagai foreign reference — bukan foreign key lintas DB, cukup referensi ID).
- Event baru ditulis ke CockroachDB secara async setelah Gate 1 selesai (tidak menambah latency ke jalur kritis Gate 1→Gate 2 yang punya batas 150 detik).

### 4.3 Skema Baru (CockroachDB)

```sql
CREATE TABLE competitor_signal_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL,              -- referensi ke profiles.id di Supabase
    competitor_target_id UUID NOT NULL,    -- referensi ke competitor_targets.id di Supabase
    platform VARCHAR(20) NOT NULL,
    raw_content_summary TEXT NOT NULL,     -- ringkasan singkat isi komplain
    embedding VECTOR(1536),                -- embedding dari model yang dipakai (mis. text-embedding-3-small)
    topic_tag VARCHAR(100),                -- hasil klasifikasi ringan: "shipping", "pricing", "cs_response", dst
    sentiment_score DECIMAL(3,2),
    gate_1_passed BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE VECTOR INDEX idx_signal_embedding ON competitor_signal_embeddings (embedding);
CREATE INDEX idx_signal_target_time ON competitor_signal_embeddings (competitor_target_id, created_at);
```

### 4.4 Fitur yang Dihasilkan (dijual + didemo hackathon)

- **Trend widget baru di dashboard**: grafik volume komplain per topik per kompetitor, per minggu.
- **Semantic search lintas waktu**: "tunjukkan komplain yang mirip dengan pola bulan lalu" pakai vector similarity, bukan cuma keyword match.
- **MCP Server exposure** (requirement hackathon): expose tool seperti `get_competitor_trend(competitor_id, timeframe)` dan `find_similar_signals(text)` supaya bisa dipanggil agent eksternal (Claude Code, Cursor, dsb) — ini juga bisa jadi fitur "tanya AI soal tren kompetitor kamu" langsung di dashboard.
- **ccloud CLI**: dipakai untuk provisioning & manajemen cluster CockroachDB Cloud sebagai bagian dari deployment pipeline (memenuhi requirement teknis hackathon).
- **AWS service** (requirement minimal 1 layanan AWS): kandidat paling natural adalah **AWS Lambda** untuk job async yang menulis embedding ke CockroachDB (dipicu setelah Gate 1 selesai), atau **Amazon Bedrock** kalau ingin sekalian pindahkan sebagian proses embedding generation ke sana.

**Estimasi effort Fase 1:** 2–3 minggu (termasuk testing vector search & MCP server).

---

## 5. FASE 2 — Decision Lineage & Trust Log (DataHub)

### 5.1 Kenapa Ini Genuine Use Case

Saat ini, kalau user (atau calon klien enterprise) bertanya "kenapa saya di-charge $0.10 untuk lead ini?" atau "kenapa lead ini di-reject Gate 1?", jawabannya cuma ada di kolom `gate_1_model_used`/`gate_2_model_used` — tidak ada cerita lineage yang bisa ditelusuri. Ini gap nyata, terutama untuk menaikkan produk ke tier klien yang lebih besar (butuh accountability/audit trail atas keputusan AI yang menyentuh uang & reputasi brand mereka).

### 5.2 Yang Dikatalogkan di DataHub

- **Data asset**: `leads_queue`, `competitor_signal_embeddings`, `billing_ledger` — didaftarkan sebagai dataset dengan skema & deskripsi jelas.
- **Lineage graph per lead**:
  `raw scraped post (RapidAPI)` → `Gate 1 decision (model + alasan)` → `Gate 2 decision (model + draft dihasilkan)` → `billing event (FREE_DEMO/CHARGED)` → `status akhir (REPLIED/REJECTED)`.
- **Agent Context Kit**: dipakai supaya agent yang membantu proses (mis. saat debugging kenapa suatu lead diproses aneh) punya akses konteks penuh ke lineage ini, bukan cuma raw log.
- **Skills**: dokumentasi terstruktur soal "bagaimana cara membaca lineage log Undercut" sebagai skill yang bisa dipanggil ulang.

### 5.3 Implementasi Praktis

- Tambah kolom `decision_trace_id` (UUID) di `leads_queue` — satu ID yang menghubungkan semua event terkait satu lead.
- Tiap tahap pipeline (`/api/ingest/scrape`, `/api/pipeline/process-lead`, `consume_cycle_credit()`) mengirim event lineage ke DataHub via MCP Server/API resmi mereka, ditandai dengan `decision_trace_id` yang sama.
- Fitur baru di dashboard: tombol **"Kenapa keputusan ini?"** di tiap lead card → tampilkan lineage lengkap ke user (dibungkus jadi fitur trust/transparency, bukan cuma internal tooling).

**Estimasi effort Fase 2:** 2 minggu (deadline lebih ketat dari Fase 1, prioritaskan versi minimal dulu: lineage 4 tahap di atas, tanpa perlu fitur UI lengkap kalau waktu mepet — untuk submission, yang penting lineage graph-nya nyata dan bisa didemo).

---

## 6. FASE 3 — Payment Expansion: Midtrans (Lokal) + Merchant of Record (Global)

*Direvisi setelah keputusan untuk menyiapkan jalur pembayaran global sejak awal, mengingat channel akuisisi utama (komunitas hackathon, exchange crypto) punya kemungkinan klien luar Indonesia yang signifikan.*

### 6.1 Kenapa Dua Jalur, Bukan Satu

Midtrans dan MoR **melayani kasus yang beda, bukan saling gantiin**:

| | Midtrans | Merchant of Record |
|---|---|---|
| Untuk klien | Indonesia (bayar IDR) | Luar negeri (bayar USD/mata uang lain) |
| Yang urus pajak | Kamu sendiri (PPh final UMKM dsb) | MoR jadi legal seller, otomatis handle VAT EU/GST Australia/sales tax AS |
| Fee | ~2-3% | ~4-5% + fee tetap per transaksi |
| Kompleksitas integrasi | Rendah (sudah ada di skema) | Sedang (provider baru, tapi cakupan sempit — lihat §6.3) |

**Momentum yang tepat**: migrasi/tambah payment provider itu jauh lebih gampang **sebelum** ada subscriber aktif dibanding sesudahnya — migrasi MoR di kemudian hari butuh re-create subscription yang sedang jalan, jadi menyiapkan ini sekarang (saat belum ada billing history sama sekali) adalah timing yang paling murah untuk dikerjakan.

### 6.2 Midtrans — Lokal (Tidak Berubah dari Revisi Sebelumnya)

**Koreksi dari versi dokumen sebelumnya:** Midtrans **tidak** mewajibkan badan usaha untuk mulai, termasuk untuk kartu kredit. Individu cukup KTP + NPWP; kartu kredit/debit butuh proses approval tambahan ±10 hari kerja, bukan status badan usaha. Tidak ada batasan minimal/maksimal transaksi untuk bergabung jadi merchant. NPWP sendiri sekarang cukup aktivasi NIK lewat Coretax DJP (gratis, online, bisa selesai dalam hitungan jam).

Yang sudah benar dari desain sekarang: kolom `payment_transactions.gateway` sudah `CHECK (gateway IN ('stripe', 'midtrans', 'xendit'))` — menambah Midtrans nanti adalah **menambah implementasi API route baru** (`/api/billing/topup/midtrans`, `/api/billing/webhook/midtrans`) tanpa perlu migrasi skema.

**Checklist Midtrans:**
- [ ] Aktivasi NIK jadi NPWP via coretaxdjp.pajak.go.id (gratis, bisa hari ini).
- [ ] Daftar akun Midtrans individu, ajukan sekalian aktivasi kartu kredit/debit (approval ±10 hari kerja, submit lebih awal).
- [ ] Implementasi `/api/billing/topup/midtrans` — generate Snap token, konversi USD→IDR pakai rate server, Midtrans Snap popup.
- [ ] Implementasi `/api/billing/webhook/midtrans` — verifikasi signature key, guard idempotency pakai tabel `webhook_events` yang sudah ada.
- [ ] Testing end-to-end dengan Midtrans sandbox sebelum go-live production.

### 6.3 Merchant of Record — Global

**Perbandingan provider (fee & fit, per riset terkini):**

| Provider | Fee | Catatan |
|---|---|---|
| **Dodo Payments** | ~4% + $0.40 | Secara eksplisit dibangun untuk **AI SaaS dengan model credit-based billing** (beli kredit, konsumsi per pemakaian) — cocok langsung dengan model wallet kredit Undercut. Menyasar founder di kawasan yang tidak dilayani Stripe langsung (match dengan situasi Indonesia). Platform masih baru (~3 tahun), dokumentasi & dukungan belum sematang Paddle — **wajib dicek langsung di situsnya apakah Indonesia ada di daftar negara payout mereka sebelum commit.** |
| **Paddle** | 5% + $0.50 | Paling matang/enterprise-grade, fee transparan tanpa biaya tambahan untuk sales global, native usage-based billing, terintegrasi tools afiliasi. Pilihan paling "aman" kalau mau stabilitas jangka panjang. |
| **Lemon Squeezy** | 5% + $0.50 | Sudah diakuisisi Stripe (2024), developer experience masih bagus tapi ada ketidakpastian arah produk pasca-akuisisi, native usage-based billing lebih lemah dari Paddle/Dodo. |
| **Gumroad** | 10% + $0.50 | Lebih untuk digital creator/produk sekali beli, kurang cocok untuk subscription/credit-based SaaS. |

**Rekomendasi awal: Dodo Payments** sebagai kandidat utama karena model billing-nya (credit-based) paling match dengan wallet kredit Undercut tanpa perlu remap logic. **Paddle sebagai fallback** kalau saat verifikasi ternyata Dodo tidak mendukung payout ke Indonesia atau dokumentasinya kurang memadai untuk kebutuhan produksi.

### 6.4 Cara Kerja Integrasi MoR (Penjelasan Teknis)

Kabar baiknya: **cakupan integrasinya sempit**, karena MoR cuma perlu menangani transaksi top-up kredit, bukan tiap $0.10 per-draft (itu tetap logic internal `consume_cycle_credit()` yang sudah ada, tidak berubah sama sekali).

1. **Setup produk di dashboard provider**: definisikan paket top-up kredit (mis. $5, $10, $20) sebagai "product" di dashboard Dodo/Paddle — mirip Stripe Checkout, tidak perlu bangun UI pembayaran sendiri.
2. **Checkout flow**: user pilih paket top-up → redirect/embed ke checkout hosted milik provider → provider handle input kartu, deteksi lokasi buyer, hitung pajak lokal otomatis, proses pembayaran.
3. **Webhook event**: provider kirim event (`order_created`/`payment_succeeded`) ke endpoint baru `/api/billing/webhook/[provider]` → verifikasi signature → **pola identik dengan webhook Stripe/Midtrans yang sudah ada** → update `billing_ledger` & `payment_transactions`, kredit ditambahkan ke wallet user.
4. **Siapa yang jadi "penjual" di invoice**: karena MoR bertindak sebagai *legal seller of record*, invoice yang diterima customer atas nama entitas MoR (bukan nama kamu/Undercut langsung) — ini trade-off yang perlu kamu terima, tapi keuntungannya kamu tidak perlu urus VAT/GST/sales tax di puluhan yurisdiksi berbeda.
5. **Payout**: provider transfer dana terkumpul ke rekening kamu (jadwal biasanya mingguan/bulanan tergantung provider, cek threshold minimum payout masing-masing).
6. **Skema**: tambah value baru di `CHECK (gateway IN ('stripe', 'midtrans', 'xendit', 'dodo'))` (atau nama provider yang akhirnya dipilih) — konsisten dengan pola multi-gateway yang sudah didesain dari awal, tidak perlu migrasi struktural.

**Checklist MoR:**
- [ ] Verifikasi langsung di situs Dodo Payments apakah Indonesia termasuk negara yang didukung untuk payout (langkah pertama, sebelum kerja lain).
- [ ] Kalau Dodo tidak mendukung, cek Paddle sebagai fallback dengan proses yang sama.
- [ ] Daftar akun provider terpilih, setup produk top-up kredit di dashboard mereka.
- [ ] Tambah value provider baru ke `CHECK` constraint kolom `gateway`.
- [ ] Implementasi `/api/billing/topup/[provider]` dan `/api/billing/webhook/[provider]` — pola sama persis dengan Stripe/Midtrans yang sudah ada.
- [ ] Testing end-to-end di sandbox provider sebelum go-live.

### 6.5 Pemilihan Negara Sebelum Checkout (Routing ke Gateway yang Tepat)

**Kenapa perlu:** dua gateway ini melayani buyer yang beda (§6.1) — Midtrans untuk pembeli Indonesia (GoPay/QRIS/transfer bank, murah, familiar), Dodo untuk pembeli luar (kartu internasional, kepatuhan pajak otomatis). Tanpa routing eksplisit, user bisa nyasar ke gateway yang gak pas buat lokasi mereka (mis. user Indonesia diarahkan ke Dodo, jadi gak bisa pakai QRIS).

**Desain:**
- Sebelum masuk halaman top-up, tampilkan pemilihan negara (dropdown sederhana), dengan **default terdeteksi otomatis** dari locale/IP browser tapi **tetap bisa diganti manual** — jangan auto-force, karena ada kasus tepi (WNI yang browsing dari luar negeri, atau user asing yang kebetulan IP-nya kedeteksi Indonesia).
- Simpan pilihan ini di `profiles` (kolom baru `country_code VARCHAR(2)`) supaya user **gak ditanya ulang tiap kali top up** — cukup sekali, bisa diubah lagi lewat pengaturan akun kalau perlu.
- Logic routing di endpoint top-up: `country_code = 'ID'` → arahkan ke flow Midtrans, selain itu → arahkan ke flow Dodo.
- Tambah kolom `buyer_country VARCHAR(2)` di `payment_transactions` juga (dicatat per transaksi, bukan cuma di profile) — selain untuk akurasi histori kalau user pindah negara nanti, ini juga jadi **data lacak porsi klien luar negeri dari waktu ke waktu**, berguna untuk evaluasi lanjutan apakah Dodo/MoR worth terus di-invest atau butuh gateway tambahan lain.

**Checklist tambahan:**
- [ ] Tambah kolom `country_code` di `profiles` dan `buyer_country` di `payment_transactions`.
- [ ] Komponen UI pemilihan negara (dropdown + deteksi otomatis locale/IP sebagai default).
- [ ] Routing logic di endpoint top-up berdasar `country_code`.

**Estimasi effort Fase 3 (Midtrans + MoR):** riset & keputusan provider bisa dikerjakan sekarang (tidak butuh sentuh kode, aman dikerjakan sambil masa judging hackathon). Implementasi teknis kedua jalur + routing negara ±1-2 minggu setelah Fase 0-2 selesai, dikerjakan santai sesuai kapasitas.

---

## 7. FASE 4 — Scaling Infra (Kondisional, Jangan Dikerjakan Sekarang)

Ditulis di sini murni sebagai referensi masa depan — **bukan todo list saat ini**. Baru relevan kalau sudah ada traksi nyata (bukan cuma pilot 10 klien):

- Queue-based processing (mis. Upstash QStash / BullMQ) untuk decouple polling dari processing.
- Read replica / horizontal scaling database kalau volume transaksional Supabase mulai jadi bottleneck (indikatornya: query latency naik signifikan, bukan asumsi).
- Multi-region deployment kalau ekspansi ke luar Indonesia sudah konkret.
- Upgrade Gate 1 ke model berbayar otomatis saat rate limit gratis (20 rpm/200 rpd) mulai jadi bottleneck nyata — ini sudah dicatat sebagai roadmap di PRD v4.1 §13, pertahankan di sana.

---

## 8. Environment Variables Tambahan

```
# CockroachDB (Fase 1)
COCKROACHDB_CONNECTION_STRING=
COCKROACHDB_CLUSTER_ID=
EMBEDDING_MODEL=text-embedding-3-small

# AWS (requirement hackathon CockroachDB x AWS)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_LAMBDA_EMBEDDING_FN_NAME=

# DataHub (Fase 2)
DATAHUB_GMS_URL=
DATAHUB_API_TOKEN=

# Redis Cache (Fase 0)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Midtrans (Fase 3 — bisa diisi sekarang, individu sudah cukup)
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

# Merchant of Record — Dodo Payments atau Paddle (Fase 3, provider final ditentukan setelah verifikasi payout Indonesia)
MOR_PROVIDER_API_KEY=
MOR_PROVIDER_WEBHOOK_SECRET=
MOR_PROVIDER_NAME=  # "dodo" atau "paddle"
```

---

## 9. Ringkasan Prioritas Minggu Ini

1. **Paralel, tidak saling menunggu:** outreach 10 klien pilot (lihat rencana insight-first sebelumnya) tetap jalan mulai sekarang, tidak menunggu infra ini selesai.
2. **Fase 0** (caching + dedup) — kerjakan duluan, murah, hemat biaya langsung, tidak ganggu apapun yang sedang jalan.
3. **Fase 2 (DataHub)** mulai duluan dari Fase 1 karena deadline lebih dekat (10 Agustus vs 18 Agustus), meski keduanya bisa overlap.
4. **Fase 3 (Midtrans) dan Fase 4 (scaling)** — sengaja tidak disentuh dulu, ditulis di sini supaya tidak hilang dari radar, bukan supaya dikerjakan sekarang.

---

## 10. ADENDUM — Evaluasi Hackathon Tambahan: Snowflake CoCo CLI 2026

*Ditambahkan setelah pertimbangan ikut Snowflake CoCo CLI Hackathon (hack2skill.com/event/cococlihack) sebagai hackathon ke-3.*

### 10.1 Fakta Kunci

| Hal | Detail |
|---|---|
| Deadline submission prototype | **2 Agustus 2026** — lebih cepat dari DataHub (10 Agu) dan CockroachDB (18 Agu) |
| Stack wajib | Snowflake CoCo CLI + Snowflake AI Data Cloud — stack baru, terpisah total dari Supabase & CockroachDB |
| Problem statement (pilih 1) | Intelligent Workflow Automation Agent / Unstructured Data Intelligence System / AI-Native Data Application / Domain-Specific AI Copilot |
| Rubrik | Real-World Relevance 30%, Technical Execution 40%, Solution Completeness 30% |
| Prize pool | $10.000 (juara 1: $4.300) |

### 10.2 Rekomendasi: JANGAN diambil dulu sebagai prioritas penuh

Alasan:
1. Deadline paling mepet (~18 hari dari evaluasi ini dibuat), padahal paling belakangan ditemukan dan butuh belajar platform baru dari nol.
2. Stack ketiga (Snowflake) di atas Supabase + CockroachDB yang sudah direncanakan → resiko nyata memecah fokus dan menurunkan kualitas SEMUA submission, bukan cuma yang baru.
3. Fase 0–2 di dokumen ini belum ada yang mulai dieksekusi. Menambah beban ketiga sebelum yang lama berjalan adalah pola resiko yang sama seperti diskusi ide bisnis sebelumnya: ambisi nambah cepat, eksekusi jadi pecah.

### 10.3 Kalau tetap diambil — problem statement paling cocok & scope minimal

**Problem statement paling natural: Unstructured Data Intelligence System.** Data komplain sosial mentah yang di-scrape Undercut adalah data unstructured (post/komentar) yang dikombinasikan dengan data terstruktur (sentiment score, topic tag) untuk insight — fit tanpa reframing berlebihan.

**Scope minimal yang disarankan (bukan integrasi penuh ke core system):**
- Export berkala/batch (bukan real-time) dari data Gate 1/Gate 2 (`leads_queue`, dan `competitor_signal_embeddings` kalau Fase 1 sudah jalan) ke Snowflake.
- Pakai Snowflake CoCo CLI untuk bangun natural-language query layer di atas data itu — mis. "tunjukkan tren komplain kompetitor F&B bulan ini."
- Dibangun sebagai **read-only analytics layer terpisah**, bukan bagian jalur kritis produksi (Gate 1→Gate 2→billing) — resiko ke sistem inti mendekati nol.

### 10.4 Kalau dikerjakan — urutan prioritas hackathon berubah jadi:

1. Fase 0 (quick wins) — tetap duluan, tidak berubah.
2. **Snowflake scope minimal** (kalau diambil) — deadline 2 Agustus, paling ketat, jadi hackathon yang dikerjakan **lebih dulu** dari CockroachDB & DataHub meski ditemukan belakangan.
3. Fase 2 (DataHub) — 10 Agustus.
4. Fase 1 (CockroachDB) — 18 Agustus, paling longgar, taruh terakhir.

**Catatan jujur:** urutan di atas cuma masuk akal kalau Fase 0 dan business validation (outreach 10 klien, fix query bug) tidak terbengkalai. Kalau minggu depan progress di dua hal itu belum jalan, saran saya Snowflake di-skip sepenuhnya untuk cycle ini — masih ada banyak hackathon lain di masa depan, tapi momentum business validation yang hilang lebih mahal untuk dikejar ulang.