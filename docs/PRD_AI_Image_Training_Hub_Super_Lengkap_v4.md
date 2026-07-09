# PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Nama Produk:** AI Image Generation Training & Creator Hub (Internal)  
**Status Dokumen:** Final / Super Lengkap (Versi 4.0)  
**Tahun Rilis:** 2026  

---

## 1. Ringkasan Eksekutif (Executive Summary)
Produk ini adalah aplikasi *web-based* internal berskala *enterprise* yang berfungsi sebagai platform pelatihan terstruktur dan *hub* kreasi bagi karyawan untuk menguasai teknologi *Generative AI* (khususnya gambar). Aplikasi ini menggabungkan eksekusi *prompting* *hybrid*, manajemen aset (*image bank*), dan sistem edukasi adaptif (AI Mentor). Sistem ini dilengkapi dengan **Token Tracker** berakurasi tinggi yang mengekstrak data biaya langsung dari *payload* API, kontrol kuota per divisi, dan fleksibilitas integrasi dengan model AI kustom apa pun (via `base_url`).

---

## 2. Tujuan Produk (Product Objectives)
* **Standarisasi Kemampuan:** Menyediakan wadah tunggal untuk melatih tim merakit *prompt* gambar yang presisi dan konsisten.
* **Akurasi & Efisiensi Biaya:** Mencegah kebocoran anggaran melalui pelacakan token absolut (berdasarkan *usage metadata* respons API), laporan per divisi, dan sinkronisasi harga dinamis.
* **Membangun Aset Internal:** Menciptakan *Image Bank* terpusat dari karya-karya terbaik tim.
* **Personalisasi Edukasi (Adaptive Learning):** Aplikasi yang mampu mempelajari perilaku pengguna (*telemetry*) untuk mempersonalisasi rekomendasi gaya, parameter, dan tantangan.

---

## 3. Target Pengguna & Peran (User Personas)
1. **Admin / System Manager:** Mengatur peran pengguna, menetapkan kuota token, mengelola `base_url` untuk model kustom, dan memonitor laporan biaya lintas divisi.
2. **Mentor / Creative Director:** Menyusun struktur tantangan (studi kasus), meninjau hasil, dan memberikan *feedback* teknis.
3. **Trainee / Creator:** Pengguna akhir dari berbagai divisi perusahaan (ditandai dengan kolom `division` pada profil) yang berinteraksi di *Creator Studio* untuk meng-generate gambar dan belajar dari AI Mentor.

---

## 4. Ruang Lingkup Fitur Utama (Core Features Scope)

### 4.1. Modul Token Tracker & Manajemen Infrastruktur (Admin)
* **Absolute Cost Tracking Logic:** Sistem pelacakan biaya tidak menggunakan estimasi statis, melainkan mengekstrak nilai `total_tokens` atau `cost_incurred` langsung dari *metadata JSON response* penyedia API setiap kali proses *generate* selesai.
* **Division-Based Quota Management:** Alokasi kuota token dan dasbor laporan pengeluaran (Rp) yang di-filter dan dikelompokkan berdasarkan divisi pengguna.
* **Custom Model Configuration (Base URL):** Fleksibilitas menambahkan API dari luar atau *endpoint* kustom internal (misal: model *open-source* lokal) melalui pengaturan `base_url`. Jika menggunakan server lokal, *cost tracker* akan otomatis mencatat biaya sebagai Rp 0.
* **Dynamic Auto-Pricing:** Sistem otomatis menyinkronkan tarif per *generate* langsung dari penyedia API secara berkala (*cron job*).

### 4.2. Creator Studio (Workspace Eksekusi Hybrid)
* **Hybrid Prompt Creator:** Integrasi Form Terstruktur (*Subject, Action, Lighting, Style*) yang disandingkan dengan **AI Chat Assistant**. Pengguna mengetik ide mentah di *chat*, dan AI mengonversinya menjadi *prompt* teknis yang otomatis mengisi Form.
* **X-Ray Parameter:** Tampilan transparan untuk *Seed, CFG Scale, Aspect Ratio*, dan *Steps* pada setiap karya.
* **Real-time Cost Predictor:** Tombol *Generate* menampilkan estimasi token yang akan terpotong sebelum eksekusi (berdasarkan tarif di *database*).

### 4.3. Behavioral Learning & AI Mentor System
* **Personalized Default Parameters:** Aplikasi merekam *CFG* dan rasio favorit pengguna dari sesi yang sukses (diunduh), menjadikannya pengaturan *default* untuk sesi berikutnya.
* **Smart Autocomplete & Negative Prompt Profiling:** Menyarankan kata kunci dan menyuntikkan *Negative Prompt* bawaan berdasarkan sejarah koreksi visual pengguna.
* **The "Creative Director" AI Persona:** LLM (misal: Gemini Flash) di *backend* dikonfigurasi untuk memandu pengguna dengan pertanyaan pancingan, bukan menyuapi *prompt* secara instan.

### 4.4. Modul Edukasi, Komunitas & Image Bank
* **Global Feed & Remix:** Halaman beranda yang menampilkan karya terbaik tim. Tombol *Remix* menyalin *prompt*, *Seed*, dan parameter karya orang lain ke *workspace* pengguna.
* **Master Prompt Library & Challenge System:** Modul studi kasus bawaan:
  * *Konsistensi Sekuensial:* Mempertahankan identitas karakter pada adegan aksi (misal: teks prompt untuk karakter "Kirana"), dan akurasi atribut bawaan (misal: "Loreng" sebagai *white tiger cub*, atau karakter memakai *orange crocs sandals*).
  * *Desain Spasial & Experiential:* Merancang *mockup* aktivasi mall atau latar imersif bersejarah (seperti "MESIN WAKTU JKT-500").

---

## 5. Arsitektur Teknis & Database

### 5.1. Tech Stack
* **Frontend:** Next.js (React) + Tailwind CSS.
* **Backend:** Node.js atau Python (FastAPI).
* **Storage:** Cloudflare R2 (untuk *image bank* internal dengan *$0 egress fees*).

### 5.2. Skema Database (ORM: Prisma / Drizzle)
Dirancang dengan SQLite untuk MVP, siap migrasi *zero-rewrite* ke PostgreSQL.

* **Tabel `Users`**: `id`, `name`, `email`, `role`, **`division`** (String/Enum), `token_balance` (Integer).
* **Tabel `AI_Models`**: `id`, `model_name`, `provider_api`, **`base_url`** (String, nullable), `api_key`, `cost_per_generate`, `auto_sync_pricing` (Boolean).
* **Tabel `Generations`**: `id`, `user_id`, `model_id`, `prompt_text`, `negative_prompt`, `seed`, `parameters_json`, `image_url` (R2 Link).
* **Tabel `Token_Logs`**: `id`, `user_id`, `model_id`, `action` (Generate/Top-up), **`tokens_deducted`** (diambil riil dari *API response payload*), `timestamp`.

---

## 6. System Prompt Bawaan untuk AI Mentor (Backend LLM Configuration)

```text
Kamu adalah "Creative Director", asisten AI di aplikasi internal pembuat gambar. Tugas utamamu adalah melatih trainee merancang prompt gambar yang presisi.

Aturan Interaksi:
1. Bersikap profesional dan suportif layaknya mentor senior.
2. Jika ide trainee mentah, jangan berikan prompt 100% jadi. Berikan draf dasar dan ajukan 1-2 pertanyaan panduan (gaya visual, pencahayaan, suasana).
3. Tuliskan prompt akhir dalam bahasa Inggris.
4. Selalu ingatkan penggunaan 'Seed' dan 'Negative Prompt' untuk konsistensi.

Pedoman Studi Kasus Internal:
- Proyek Desain Spasial/Event (Misal: aktivasi mall, lorong sejarah JKT-500): Selalu instruksikan penggunaan kata "human scale", "wide angle", dan pencahayaan arsitektural.
- Konsistensi Karakter Komik/Animasi:
  - Karakter "Kirana": Fokus perumusan teks prompt yang deskriptif untuk adegan aksi urban.
  - Karakter "Loreng": Prompt akhir SELALU menyertakan definisi "white tiger cub".
  - Karakter "Bombo": Fokus perumusan teks prompt (bukan video).
  - Aksesori spesifik: Jika merujuk sandal, definisikan persis sebagai "orange crocs sandals".
```

---

## 7. Fase Pengembangan (Release Roadmap)

* **Fase 1: Core, Database, & Tracking Engine (Minggu 1-3)**
  * Autentikasi pengguna, Setup ORM SQLite, Integrasi Cloudflare R2.
  * Modul *Admin Dashboard* (`base_url`, `division`).
  * Implementasi *Token Tracker Engine* (ekstraksi token dari *metadata API response*).
* **Fase 2: Creator Studio & AI Mentor (Minggu 4-6)**
  * Form *Hybrid* + Modul Chat LLM terintegrasi.
  * Penyematan *System Prompt* "Creative Director".
* **Fase 3: Ekosistem Edukasi & Image Bank (Minggu 7-8)**
  * Peluncuran *Global Feed*, *Master Library*, dan fitur *Remix/Fork*.
  * Pembuatan sistem *Challenge*.
* **Fase 4: Analytics & Behavioral Learning (Minggu 9-10)**
  * Pemrosesan log pengguna untuk *Smart Autocomplete*.
  * Otomatisasi profil *Negative Prompt* dan *Adaptive Default Parameters*.
  * Laporan final dasbor anggaran divisi.