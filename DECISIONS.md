# DECISIONS.md — Architecture Decision Records

Log keputusan arsitektur besar di Undercut. Format: ADR (Architecture Decision Record).

Setiap entry menjawab tiga pertanyaan: **Apa yang diputuskan? Kenapa? Apa alternatif yang tidak dipilih?**

> Buat keputusan baru: tambahkan entry baru dengan nomor berikutnya. Jangan edit entry yang sudah ada — kalau keputusan berubah, tambahkan entry baru dengan status "Supersedes ADR-NNN".

---

## ADR-001: Gate 1 menggunakan OpenRouter (model gratis), bukan DeepSeek langsung

**Tanggal:** 2026-07 (dokumentasi dari PRD v4.1)
**Status:** Accepted
**File referensi:** `src/lib/pipeline/gate1.ts:11-17`

**Keputusan:**
Gate 1 (filter relevansi) menggunakan model gratis via OpenRouter sebagai primary, bukan DeepSeek atau model berbayar.

**Alasan:**
Gate 1 adalah tahap filter — tugasnya hanya menghasilkan `true`/`false` per postingan. Task ini tidak butuh model mahal. Karena Gate 1 dijalankan setiap kali user klik "Generate Draft", menggunakan model gratis berarti tahap ini tidak menambah biaya operasional sama sekali — konsisten dengan prinsip "Gate 1 selalu gratis" yang menjadi nilai jual produk.

**Alternatif yang dipertimbangkan:**
- *DeepSeek langsung dari awal* — terlalu mahal untuk task binary classifier. DeepSeek lebih cocok untuk generative task (Gate 2).
- *Rule-based filter saja (tanpa LLM)* — dipertahankan sebagai Fuzzy Pre-filter (Gate 0/`fud-keywords.ts`), tapi tidak cukup akurat untuk tugas final filter.

**Konsekuensi:**
- Rate limit nyata: 20 rpm / 200 rpd per model gratis OpenRouter. Cukup untuk early-stage, tapi perlu dimonitor saat volume naik.
- Fallback chain 8+ model diperlukan untuk resiliensi (lihat ADR-002 tentang emergency fallback ke DeepSeek).

---

## ADR-002: Gate 2 menggunakan DeepSeek API resmi sebagai primary, bukan OpenRouter

**Tanggal:** 2026-07 (dokumentasi dari PRD v4.1)
**Status:** Accepted
**File referensi:** `src/lib/pipeline/gate2.ts:12,19`

**Keputusan:**
Gate 2 (generator draf balasan) menggunakan `deepseek-chat` via DeepSeek API resmi sebagai model primary, bukan via OpenRouter.

**Alasan:**
Gate 2 menghasilkan teks yang akan langsung dibaca dan dikirim oleh user. Kualitas output sangat penting di sini — draf yang jelek merusak reputasi user. DeepSeek `deepseek-chat` (V4 Flash) memberikan kualitas lebih konsisten dan latency lebih rendah dibanding model gratis OpenRouter untuk generative task. Biaya DeepSeek per-call juga jauh di bawah biaya yang di-charge ke user ($0.10 per siklus).

**Alternatif yang dipertimbangkan:**
- *OpenRouter free models sebagai primary Gate 2* — kualitas output tidak konsisten, beberapa model gratis terlalu sering menghasilkan teks yang terasa generik atau off-tone. Tetap dipakai sebagai fallback.
- *GPT-4 / Claude* — terlalu mahal untuk margin di model $0.10/siklus.

**Konsekuensi:**
- `DEEPSEEK_API_KEY` menjadi env var wajib untuk Gate 2 berfungsi optimal.
- Kalau DeepSeek API down, fallback ke OpenRouter free models — kualitas output bisa menurun sementara.
- Gate 2 juga berfungsi sebagai emergency fallback untuk Gate 1 (kalau semua OpenRouter gagal, Gate 1 mencoba `deepseek-chat` satu kali).

---

## ADR-003: Input Instagram menggunakan username kompetitor, bukan free-text keyword

**Tanggal:** 2026-07 (dokumentasi dari PRD v4.1 §4.1)
**Status:** Accepted
**File referensi:** `src/lib/scraper.ts:84-137`, `src/lib/types.ts:55`

**Keputusan:**
Untuk platform Instagram, user memasukkan **username kompetitor** (contoh: `tokopedia`) — bukan keyword/hashtag bebas. Sistem kemudian scrape postingan terbaru dari akun kompetitor tersebut.

**Alasan:**
Endpoint search Instagram yang ada di RapidAPI (`search_ig.php`) mengembalikan campuran hasil — akun, hashtag, lokasi, postingan — yang sulit diklasifikasikan secara andal. Strategi yang lebih predictable: ambil postingan terbaru dari akun resmi kompetitor, lalu analisis caption/komentar. Ini juga lebih natural bagi pengguna: "tambahkan kompetitor dengan username mereka."

**Alternatif yang dipertimbangkan:**
- *Free-text keyword search di Instagram* — endpoint yang tersedia tidak reliable untuk use case ini. Hasil campuran sulit diparsing secara konsisten.
- *Scrape komentar di postingan kompetitor* — ideal tapi secara teknis lebih kompleks dan API yang tersedia tidak mendukung ini dengan mudah.

**Konsekuensi:**
- Input Instagram divalidasi sebagai username (strip `@` otomatis).
- Endpoint yang digunakan: `POST instagram-scraper-stable-api.p.rapidapi.com/get_ig_user_posts.php` (lihat Gotcha §7.3 di ARCHITECTURE.md — ini POST, bukan GET).
- Response shape tidak stabil — kode sudah handle 4 kemungkinan shape.

---

## ADR-004: Gate 1 failure → lead dihapus permanen dari database

**Tanggal:** 2026-07 (dokumentasi dari PRD v4.1 §4.2)
**Status:** Accepted
**File referensi:** `src/lib/pipeline/helpers.ts:151-153`

**Keputusan:**
Kalau Gate 1 menolak sebuah lead (tidak relevan), baris tersebut langsung di-`DELETE` dari tabel `leads_queue` — bukan diubah statusnya menjadi `REJECTED`.

**Alasan:**
Lead yang ditolak Gate 1 adalah noise — postingan yang lolos fuzzy pre-filter tapi ternyata tidak relevan setelah diperiksa LLM. Menyimpannya hanya memenuhi database tanpa nilai. Penghapusan permanen menjaga kebersihan data dan efisiensi storage. Tidak ada kebutuhan audit trail untuk postingan yang ditolak (tidak ada billing event, tidak ada aksi user).

**Alternatif yang dipertimbangkan:**
- *Simpan dengan status `REJECTED` untuk analytics* — dipertimbangkan, tapi tidak ada use case konkret untuk data ini di MVP. Bisa dipertimbangkan ulang saat fitur "trend analytics" dibangun (lihat UPGRADE.md §4 tentang CockroachDB).
- *Soft delete* — tidak perlu. Tidak ada kebutuhan recovery data ini.

**Konsekuensi:**
- Tidak ada cara untuk mereview lead yang sudah di-reject Gate 1. Ini by design.
- Beda dengan Gate 2 failure: kalau Gate 2 gagal (semua model habis), lead dikembalikan ke status `PENDING` agar user bisa retry. Hanya Gate 1 rejection yang permanent delete.

---

## ADR-005: Model bisnis prepaid credit wallet, bukan charge langsung per transaksi

**Tanggal:** 2026-07 (dokumentasi dari PRD v4.1 §2.2)
**Status:** Accepted
**File referensi:** `src/lib/types.ts:90-102`, `PRDERD.md §2.2`

**Keputusan:**
User top-up saldo kredit terlebih dahulu, lalu dipotong $0.10 per siklus sukses. Tidak ada pembayaran per-transaksi langsung.

**Alasan:**
Tidak ada payment gateway yang efisien untuk transaksi $0.10 (~Rp1.600). Biaya admin fee gateway jauh melebihi nilai transaksinya. Model dompet kredit prabayar menggabungkan banyak micro-transaction menjadi satu top-up yang lebih besar — ekonomis untuk semua pihak.

**Alternatif yang dipertimbangkan:**
- *Subscription bulanan* — tidak cocok untuk early adopters yang mau "coba dulu". Barrier masuk lebih tinggi.
- *Charge per-transaksi langsung* — secara teknis tidak ekonomis (fee gateway > nilai transaksi).
- *Freemium dengan batas fitur* — tetap ada sebagai free demo mingguan, tapi bukan model utama.

**Konsekuensi:**
- `credit_balance` di tabel `profiles` adalah sumber kebenaran saldo user.
- Top-up minimal $2.00 (setara 20 siklus).
- Free tier saat daftar: $2.00 kredit awal.
- Tambahan: 5 free demo per minggu (terpisah dari `credit_balance`, reset otomatis via `consume_cycle_credit()`).

---

## ADR-006: Stripe Checkout sebagai primary payment gateway (bukan Midtrans)

**Tanggal:** 2026-07 (dokumentasi dari PRD v4.1 §3, UPGRADE.md §0)
**Status:** Accepted — akan diperluas dengan Midtrans (Fase 3)
**File referensi:** `src/lib/stripe.ts`, `src/app/api/billing/topup/`, `src/app/api/billing/webhook/`

**Keputusan:**
Stripe Checkout dipakai sebagai gateway pembayaran utama, meskipun target market awal adalah Indonesia.

**Alasan:**
Stripe memungkinkan pemrosesan kartu kredit global, Apple Pay, dan Google Pay dalam USD — menyederhanakan kode dan mempercepat setup untuk hackathon. Untuk hackathon judging, Stripe jauh lebih mudah untuk demo daripada Midtrans yang membutuhkan proses approval merchant lebih panjang.

**Alternatif yang dipertimbangkan:**
- *Midtrans dari awal* — lebih cocok untuk market Indonesia (GoPay, QRIS, transfer bank), tapi approval merchant membutuhkan waktu. Direncanakan sebagai penambahan di Fase 3 (bukan penggantian Stripe).
- *Xendit* — juga dipertimbangkan, sudah ada di `CHECK` constraint tabel `payment_transactions`, tapi belum diimplementasi.

**Konsekuensi:**
- Skema `payment_transactions.gateway` sudah didesain multi-gateway (`CHECK (gateway IN ('stripe', 'midtrans', 'xendit'))`). Menambah Midtrans nanti hanya butuh menambah route baru, tidak perlu migrasi skema.
- Webhook Stripe diverifikasi via `STRIPE_WEBHOOK_SECRET` + dilindungi idempotency guard di tabel `webhook_events`.
- Untuk pembeli Indonesia, saat ini hanya kartu kredit/debit yang tersedia via Stripe — GoPay/QRIS akan tersedia setelah Midtrans diintegrasikan.

---

## ADR-007: CockroachDB sebagai layer tambahan, bukan migrasi total dari Supabase

**Tanggal:** 2026-07 (dokumentasi dari UPGRADE.md §4.2)
**Status:** Planned — belum diimplementasi
**File referensi:** `UPGRADE.md §4`

**Keputusan:**
Ketika CockroachDB diintegrasikan (rencana Fase 1, deadline CockroachDB × AWS Hackathon 18 Agustus 2026), ia akan berfungsi sebagai **layer analitik tambahan** — bukan menggantikan Supabase.

**Alasan:**
Supabase adalah source of truth transaksional yang sudah stabil: billing, RLS, auth, leads_queue aktif. Memindahkan ini ke CockroachDB berisiko tinggi dan tidak memberikan nilai tambah nyata. Use case nyata CockroachDB untuk Undercut adalah menyimpan **embedding historis lead** untuk vector similarity search — fitur yang tidak ada di Supabase saat ini. Dua database untuk dua concern yang berbeda adalah arsitektur yang paling aman.

**Alternatif yang dipertimbangkan:**
- *Migrasi total Supabase → CockroachDB* — terlalu berisiko, RLS dan billing sudah berjalan di Supabase. Tidak ada keuntungan nyata untuk data transaksional.
- *pgvector di Supabase* — Supabase mendukung pgvector, tapi tidak ada distributed SQL + vector index yang dibutuhkan untuk use case trend analytics skala besar. CockroachDB juga merupakan requirement hackathon.

**Konsekuensi:**
- Dua connection string berbeda di env: `DATABASE_URL` (Supabase) dan `COCKROACHDB_CONNECTION_STRING` (CockroachDB).
- CockroachDB hanya menyimpan data analitik: embedding, topic tag, sentiment score per lead.
- Foreign key lintas database tidak ada — hanya referensi ID (`profile_id`, `competitor_target_id`) sebagai plain UUID, bukan FK constraint.
- Write ke CockroachDB dilakukan secara **async setelah Gate 1 selesai** — tidak menambah latency ke jalur kritis Gate 1→Gate 2.

---

## ADR-008: Semi-automated (Human-in-the-Loop) — tidak ada bot auto-reply

**Tanggal:** 2026-07 (dokumentasi dari PRD v4.1 §4.3)
**Status:** Accepted — keputusan produk permanen
**File referensi:** `PRDERD.md §4.3`, `PRDERD.md §4.3 C.4`

**Keputusan:**
Undercut tidak pernah mem-posting balasan secara otomatis. Semua pengiriman balasan membutuhkan satu klik eksplisit dari user, menggunakan akun mereka sendiri (via X Intent URL atau clipboard + tab baru untuk Instagram).

**Alasan:**
Posting otomatis oleh bot adalah risiko utama shadowban dari platform sosial. Ini bukan trade-off — ini line merah yang tidak boleh dilewati. Platform seperti X dan Instagram secara aktif mendeteksi dan membatasi akun yang menggunakan otomasi untuk memposting. Selain itu, dari perspektif regulasi, pesan yang dikirim dari akun user harus melalui persetujuan eksplisit user.

**Alternatif yang dipertimbangkan:**
- *Auto-reply background* — ditolak. Risiko shadowban terlalu tinggi dan mengurangi nilai produk (user kehilangan kontrol atas apa yang diposting atas nama mereka).
- *Approval workflow dengan auto-post setelah approve* — masih berisiko karena posting dilakukan oleh sistem, bukan user secara langsung via browser.

**Konsekuensi:**
- Tombol "Reply on X": buka `https://twitter.com/intent/tweet?in_reply_to={id}&text={encoded_reply}` di tab baru.
- Tombol "Reply on IG": salin teks balasan ke clipboard + buka URL postingan IG di tab baru.
- Setelah klik, status lead diubah ke `REPLIED` (optimistic UI — tidak menunggu response server).

---

## ADR-009: Fuzzy pre-filter (Gate 0) dijalankan sebelum insert ke database

**Tanggal:** 2026-07 (dari pattern aktual di kode)
**Status:** Accepted
**File referensi:** `src/lib/fud-keywords.ts`, `src/lib/pipeline/helpers.ts:54-62`

**Keputusan:**
Sebelum postingan dimasukkan ke `leads_queue`, mereka melewati fuzzy keyword pre-filter (`fuzzyPreFilter()`) berbasis dictionary. Postingan dengan score < 0.20 dibuang tanpa pernah masuk database.

**Alasan:**
Gate 1 LLM lebih akurat tapi lebih mahal secara latency (15 detik per model, bisa retry hingga 8 model). Fuzzy pre-filter berjalan dalam microsecond dan tanpa biaya API. Membuang noise yang jelas (postingan terlalu pendek, sentimen positif murni, spam) di sini menghemat banyak waktu dan potensial LLM call.

**Alternatif yang dipertimbangkan:**
- *Langsung Gate 1 tanpa pre-filter* — terlalu boros. Gate 1 sudah punya cost latency yang signifikan.
- *Pre-filter lebih agresif (threshold lebih tinggi)* — terlalu banyak true positive yang terbuang. Threshold 0.20 dipilih karena sangat permisif — tujuannya hanya membuang noise yang benar-benar jelas.

**Konsekuensi:**
- Dictionary `FUD_KEYWORDS` di `fud-keywords.ts` harus di-update kalau ada kategori keluhan baru yang relevan.
- Dictionary sudah mencakup keywords Bahasa Indonesia (`indonesian_fud` category) — ini penting untuk target market SEA.
- Kalau ada keluhan yang seharusnya masuk tapi tidak, kemungkinan tertahan di fuzzy filter, bukan Gate 1.

---

## ADR-010: Gate 1 dijalankan on-demand saat user klik "Generate Draft", bukan saat scraping

**Tanggal:** 2026-07 (dari pattern aktual di kode, `helpers.ts:22-24`)
**Status:** Accepted
**File referensi:** `src/lib/pipeline/helpers.ts:22-24`, `src/lib/pipeline/helpers.ts:139-171`

**Keputusan:**
Gate 1 (LLM classifier) tidak dijalankan saat postingan di-scrape. Postingan masuk ke `leads_queue` dengan status `PENDING` dan `gate_1_passed=false`. Gate 1 baru dijalankan saat user secara eksplisit menekan tombol "Generate Draft" di dashboard.

**Alasan:**
Menjalankan Gate 1 saat scraping berarti setiap cron poll akan langsung menghabiskan rate limit OpenRouter (20 rpm/200 rpd) untuk semua target aktif semua user — bisa habis dalam hitungan menit kalau ada banyak user. Dengan on-demand trigger, Gate 1 hanya berjalan kalau ada user yang aktif menggunakan dashboard. Ini juga memberikan user kontrol penuh — mereka bisa melihat postingan raw dulu sebelum memutuskan apakah mau memproses (dan potensial charge) lead tersebut.

**Alternatif yang dipertimbangkan:**
- *Gate 1 berjalan langsung saat scrape* — terlalu boros rate limit OpenRouter, terutama kalau scraping dijadwalkan setiap 10-15 menit untuk banyak user sekaligus.
- *Gate 1 berjalan di background queue* — bisa, tapi belum ada queue infrastructure (BullMQ/QStash) yang diimplementasi. Roadmap Fase 4 di UPGRADE.md.

**Konsekuensi:**
- Dashboard menampilkan postingan yang belum difilter Gate 1 (status `PENDING`, `gate_1_passed=false`).
- User melihat raw content sebelum klik Generate Draft — ini sebenarnya bisa jadi fitur: user bisa review apakah postingan layak diproses.
- Kalau user tidak pernah klik "Generate Draft", postingan tetap tersimpan sebagai `PENDING` selamanya.

---

## ADR-011: Autentikasi hanya Google OAuth, tidak ada email/password

**Tanggal:** 2026-07 (dokumentasi dari PRD v4.1 §4.4)
**Status:** Accepted
**File referensi:** `src/app/login/`, `PRDERD.md §4.4`

**Keputusan:**
Sistem auth hanya mendukung Google OAuth via Supabase Auth. Tidak ada opsi email/password, OTP, atau provider OAuth lain.

**Alasan:**
Satu provider OAuth mengurangi kompleksitas kode auth secara signifikan (tidak perlu handle password reset, email verification, multiple token strategies). Google OAuth mencakup mayoritas target user (developer, indie hacker, tim pemasaran digital) yang hampir pasti sudah punya akun Google. Supabase Auth menangani semua kompleksitas OAuth di background.

**Alternatif yang dipertimbangkan:**
- *Email + password* — lebih universal tapi butuh implementasi password reset, email verification, dan manajemen session yang lebih kompleks.
- *Multiple OAuth providers (GitHub, Twitter)* — bisa berguna untuk developer audience, tapi memperumit codebase. Bisa ditambahkan nanti kalau ada permintaan.

**Konsekuensi:**
- Row `profiles` dibuat otomatis via Postgres trigger `on_auth_user_created` saat user pertama kali sign-in.
- **Catatan saat ini:** Google OAuth sedang di-hidden untuk keperluan judging hackathon. Mekanisme auth sementara mungkin berbeda — tanya ke owner sebelum mengubah kode auth.

---

## ADR-012: `consume_cycle_credit()` menggunakan SELECT FOR UPDATE (atomic RPC)

**Tanggal:** 2026-07 (dari SQL schema di PRD v4.1 §8)
**Status:** Accepted
**File referensi:** `src/lib/pipeline/helpers.ts:174-195`, `PRDERD.md §8 (fungsi consume_cycle_credit)`

**Keputusan:**
Operasi pengecekan dan pengurangan saldo kredit diimplementasi sebagai Postgres RPC (`consume_cycle_credit()`) yang menggunakan `SELECT ... FOR UPDATE` untuk mengunci row selama transaksi.

**Alasan:**
Race condition adalah risiko nyata: kalau user membuka dua tab dan klik "Generate Draft" bersamaan pada dua lead berbeda, kedua request bisa membaca `credit_balance = $0.10` secara bersamaan dan keduanya lanjut ke Gate 2 — padahal saldo seharusnya sudah habis setelah yang pertama. `SELECT FOR UPDATE` memastikan hanya satu transaksi yang bisa mengakses dan mengubah row `profiles` pada satu waktu.

**Alternatif yang dipertimbangkan:**
- *Optimistic locking (check-then-update)* — tidak safe untuk kasus concurrent ini. Dua query bisa menyelesaikan SELECT di waktu yang sama sebelum salah satunya UPDATE.
- *Application-level mutex* — tidak bisa diandalkan di environment serverless (setiap request bisa berjalan di instance berbeda).

**Konsekuensi:**
- Jangan pernah mengubah logika billing (`credit_balance` update) dari application layer secara langsung. Selalu gunakan RPC `consume_cycle_credit()`.
- RPC ini mengembalikan string: `'FREE_DEMO'`, `'CHARGED'`, atau `'INSUFFICIENT_BALANCE'`.
- Reset free demo juga terjadi di dalam RPC ini (bukan cron terpisah).

---

## ADR-013: Free demo mingguan dipakai duluan sebelum credit_balance

**Tanggal:** 2026-07 (dokumentasi dari PRD v4.1 §2, dari logika `consume_cycle_credit()`)
**Status:** Accepted
**File referensi:** `PRDERD.md §8 (consume_cycle_credit)`, `src/lib/pipeline/helpers.ts:184`

**Keputusan:**
Di dalam `consume_cycle_credit()`, free demo kredit (`free_demo_credits_remaining`) selalu dikonsumsi terlebih dahulu, sebelum `credit_balance` dipotong.

**Alasan:**
Ini adalah retention hook produk yang disengaja: user selalu mendapatkan nilai gratis di awal tiap minggu, terlepas dari apakah mereka punya saldo berbayar atau tidak. Ini memastikan user yang sudah kehabisan saldo ($0) masih bisa menggunakan produk 5x per minggu — cukup untuk merasakan nilai produk dan termotivasi untuk top-up. Kalau dibalik (saldo dulu, demo setelah habis), user tanpa saldo tidak bisa menikmati free demo sama sekali.

**Alternatif yang dipertimbangkan:**
- *Credit_balance dulu, demo sebagai backup* — mengurangi efek retention hook. User yang top-up $2 tidak merasakan manfaat free demo karena langsung dikonsumsi dari saldo.
- *Free demo dan credit_balance dipakai proporsional* — terlalu kompleks tanpa manfaat nyata.

**Konsekuensi:**
- User dengan $10 saldo tetap akan memakai free demo duluan di awal minggu — 5 siklus pertama tiap minggu gratis.
- Ini harus dikomunikasikan dengan jelas di UI (sudah ada di widget saldo dashboard).
- Billing ledger mencatat tipe `FREE_DEMO` (amount_usd=0) untuk siklus gratis, bukan `GATE_2_GENERATION_FEE`.

---

## ADR-014: Landing page menggantikan halaman /docs (single source of truth)

**Tanggal:** 2026-07 (dokumentasi dari PRD v4.1 §1, v3.0→v4.0 changelog)
**Status:** Accepted
**File referensi:** `src/app/page.tsx`, `PRDERD.md §1 (diff v3.0→v4.0)`

**Keputusan:**
Halaman dokumentasi terpisah (`/docs`) dihapus. Semua penjelasan produk — cara kerja, fitur lengkap, FAQ mendalam — sekarang ada di landing page (`/`) dalam satu scroll.

**Alasan:**
Halaman docs terpisah (menggunakan Fumadocs) menambah kompleksitas maintenance — dua tempat yang harus di-update kalau ada perubahan produk. Untuk produk yang masih berkembang cepat, single source of truth lebih pragmatis. Landing page yang komprehensif juga lebih efektif untuk konversi: pengunjung tidak perlu pindah halaman untuk mendapatkan semua informasi.

**Alternatif yang dipertimbangkan:**
- *Tetap pakai Fumadocs* — dibuang karena maintenance overhead dan tidak sesuai dengan strategi single-page landing yang diadopsi dari referensi TweetHunter.io dan ReplyGuy.com.
- *Docs sebagai subhalaman ringan* — tidak perlu. FAQ accordion di landing page sudah cukup untuk menjawab pertanyaan teknis yang biasanya masuk ke docs.

**Konsekuensi:**
- Link "Docs" di navbar dan footer sudah dihapus.
- Kalau ada pertanyaan teknis yang belum dijawab di landing page, jawabnya adalah menambahkan FAQ item baru — bukan membuat halaman docs baru.
- Semua SEO effort difokuskan ke satu URL (`/`), bukan tersebar ke `/docs/*`.
