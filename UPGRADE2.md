# UPGRADE 2 — UX & Onboarding
## Undercut — Berdasarkan Feedback Peserta/Juri Hackathon

**Dokumen pendamping:** PRD & ERD v4.1, UNDERCUT_INFRA_UPGRADE_PLAN.md (upgrade infra/hackathon — dokumen terpisah, tidak dioverlap di sini)
**Sumber:** Feedback tertulis dari peserta hackathon (perspektif first-time user + juri)
**Prinsip utama dokumen ini:** masalah terbesar produk saat ini **bukan kekurangan fitur**, tapi kejelasan value dalam 10 detik pertama dan friksi sebelum user sampai ke momen "aha". Semua item di bawah diprioritaskan berdasarkan itu.

---

## 0. Ringkasan Feedback Asli

Poin kunci dari feedback (first-time user + judge perspective):
- Branding & dark UI dinilai bersih dan profesional — **tidak perlu diubah**.
- Butuh waktu untuk paham cara kerja produk — gak ada penjelasan alur singkat di bagian atas halaman.
- Setelah klik "Start Free," user langsung dilempar ke form app profile tanpa konteks kenapa itu perlu diisi duluan.
- Belum ada contoh konkret (1 komplain + 1 draft balasan AI) yang ditunjukkan sebelum onboarding — padahal itu yang paling cepat bangun kepercayaan.
- **Kesimpulan reviewer, dikutip karena jadi prinsip pengarah dokumen ini**: peluang terbesar bukan nambah fitur, tapi bantu user paham value dalam 10 detik pertama dan kurangi friksi sebelum mereka sampai ke momen "aha".

---

## 1. Perubahan Prioritas Tinggi

### 1.1 Tambahan "3-Step How It Works" di Hero Section

**Masalah:** kartu tweet melayang di hero section terlihat menarik tapi tidak menjelaskan cara kerja produk dengan cepat.

**Perubahan:** tambahkan teks/visual 3 langkah simpel di sekitar (atas atau bawah) kartu tweet melayang:

```
1. Find complaints  →  2. AI drafts reply  →  3. You send
   (kami pantau X/IG)   (dipersonalisasi ke brand kamu)   (kamu yang approve & kirim)
```

- Style: ikon sederhana + label singkat per langkah, bukan paragraf panjang — harus bisa dipahami dalam < 5 detik sekali lihat.
- Penempatan: idealnya di bawah headline utama, sebelum atau berdampingan dengan kartu tweet melayang, supaya user paham konteks SEBELUM melihat animasi kartu.

### 1.2 Ubah Alur Setelah Signup — Jangan Langsung Force ke App Profile Form

**Masalah saat ini:** klik "Start Free" → langsung form app profile, tanpa user pernah melihat produk beneran bekerja. User tidak tahu kenapa mereka harus isi data dulu sebelum lihat value apapun.

**Perubahan alur:**
- Setelah signup berhasil → arahkan ke **dashboard utama dulu** (bukan form app profile).
- Dashboard state kosong (belum ada app profile) menampilkan **interactive demo/animasi singkat** yang menjelaskan seluruh alur fitur aplikasi — bukan cuma statis, tapi walkthrough ringan yang bisa di-skip.
- Form app profile baru muncul di titik yang natural: saat user pertama kali klik "Tambah Target Kompetitor" atau tombol setara — di titik itu, jelas kenapa data profil dibutuhkan (untuk personalisasi draft), bukan gate di depan tanpa konteks.
- Di atas form app profile (kapanpun ditampilkan), tambahkan kalimat penjelas singkat: *"Kami pakai info ini untuk personalisasi draft balasan AI ke calon customer kamu."*

### 1.3 Contoh Konkret Sebelum Onboarding

**Perubahan:** tampilkan **satu contoh nyata** (bisa hardcoded/sample, tidak harus live data) di landing page atau di awal dashboard kosong: 1 contoh tweet komplain tentang kompetitor + 1 contoh draft balasan AI yang dihasilkan. Ini langsung membangun kepercayaan sebelum user commit apapun — sesuai concern reviewer soal "belum ada yang menunjukkan produk benar-benar bekerja sebelum diminta setup."

---

## 2. Keputusan: Ekspansi Platform (TikTok, YouTube) — DITUNDA

**Pertanyaan yang dievaluasi:** apakah perlu ekspansi cakupan dari X + Instagram ke TikTok dan YouTube sekarang?

**Keputusan: Tidak sekarang.** Alasan:

1. **Kontradiksi langsung dengan feedback yang baru diterima.** Kesimpulan eksplisit reviewer: peluang terbesar bukan nambah fitur, tapi kejelasan value & pengurangan friksi. Menambah platform baru adalah menambah fitur — arah yang berlawanan dari rekomendasi yang baru saja divalidasi oleh orang luar.
2. **Bug relevansi query di X (tweet tidak sesuai) belum diperbaiki.** Menambah platform baru sebelum masalah kualitas di platform yang sudah ada selesai berarti melipatgandakan permukaan masalah yang sama, bukan menyelesaikannya.
3. **TikTok dan YouTube secara teknis bukan perluasan kecil.** Komplain di platform ini berbentuk video/komentar, bukan teks singkat seperti tweet — butuh pipeline scraping & processing yang berbeda (potensi butuh transkripsi video), bukan sekadar menambah endpoint RapidAPI baru dengan pola yang sama seperti X/IG.
4. **Belum ada outreach nyata yang terkirim ke calon klien.** Belum ada bukti apakah cakupan X + Instagram saat ini sudah cukup untuk meyakinkan klien pilot pertama. Menambah platform sebelum divalidasi mengulang pola yang sudah beberapa kali diidentifikasi di proses ini: menambah cakupan sebelum yang sudah ada teruji.

**Kapan ini relevan direvisit:** setelah (a) bug query X/IG sudah stabil, (b) minimal beberapa klien pilot sudah pakai produk dan memberi feedback langsung soal keterbatasan platform, dan/atau (c) ada pola konkret dari klien yang menyebutkan kompetitor mereka lebih aktif dibicarakan di TikTok/YouTube dibanding X/IG. Sampai saat itu, dicatat di roadmap sebagai item kondisional, bukan dikerjakan.

---

## 3. Prioritas Pengerjaan & Hubungannya dengan Dokumen Infra

Item di dokumen ini (§1) secara sengaja **diprioritaskan sejajar atau bahkan sebelum** fitur CockroachDB/DataHub di UNDERCUT_INFRA_UPGRADE_PLAN.md, karena:
- Sifatnya mayoritas frontend/copy/alur — risiko teknis rendah, effort lebih kecil dibanding vector search/lineage backend.
- Berdampak langsung ke conversion rate dari outreach yang segera dikirim ke builder/target lain — onboarding yang lebih jelas berarti trial-to-paid lebih tinggi untuk orang-orang yang akan segera didekati.

**Urutan disarankan:**
1. §1.1–1.3 (hero 3-step, alur onboarding, contoh konkret) — dikerjakan lebih dulu atau paralel dengan Fase 0 di dokumen infra.
2. Fase 0 infra (caching/dedup) — paralel, tidak saling bergantung.
3. Fase 2 (DataHub) dan Fase 1 (CockroachDB) sesuai urutan deadline yang sudah ditetapkan di dokumen infra.
4. §2 (TikTok/YouTube) — kondisional, revisit nanti sesuai kriteria di atas.

---

## 4. Checklist Implementasi

- [ ] Desain & tulis copy 3-step "How It Works" untuk hero section.
- [ ] Redesain alur post-signup: dashboard dulu, form app profile dipindah ke titik kontekstual (saat tambah target kompetitor pertama).
- [ ] Tambahkan interactive demo/animasi ringan di dashboard state kosong.
- [ ] Tambah kalimat penjelas di atas form app profile.
- [ ] Siapkan 1 contoh sampel (komplain + draft balasan) untuk ditampilkan sebelum onboarding.
- [ ] (Ditunda, bukan dikerjakan) TikTok/YouTube — dicatat sebagai item kondisional, revisit setelah kriteria di §2 terpenuhi.