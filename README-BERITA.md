# Modul Berita — Penjelasan Perubahan Teknis

Dokumen ini menjelaskan apa yang ditambahkan dan bagaimana bagian teknisnya bekerja,
supaya reviewer yang belum mengikuti proyek ini bisa memahami tanpa harus membaca
seluruh kode.

Terakhir diperbarui: 6 November 2026.

---

## 1. Ringkasan

Aplikasi arsip DPRD (`kp-frnt`) tidak diubah perilakunya. Yang ditambahkan adalah
**satu view baru bernama "Berita"** di sidebar, berisi:

- daftar **artikel manual** (dibuat admin lewat form),
- daftar **artikel hasil scraping** harian (read-only),
- kartu status scraping (kapan terakhir jalan, berhasil/gagal, jumlah artikel).

Backend Berita **tidak memakai Railway**. Berita memakai **Supabase** (Postgres, Auth,
Storage, Edge Function) sebagai layanan terpisah dari backend arsip. Backend arsip
(FastAPI di Railway) tetap dipakai untuk dokumen, Drive, dan login arsip seperti biasa.

Prinsip pemisahan:

| Kebutuhan | Jalur |
|---|---|
| Login arsip, dokumen, Drive | FastAPI Railway + Supabase arsip (tidak berubah) |
| Baca berita | Supabase Berita, anon key + RLS |
| Tulis berita | Edge Function `news-admin` (service role) setelah cek admin |
| Scraping harian | GitHub Actions (Python), tulis lewat service role |

---

## 2. Dua repo yang terlibat

| Repo | Isi | Peran |
|---|---|---|
| `pathospratama/kp-frnt` | Frontend arsip (Next.js SPA) | Menampilkan view Berita dan form tulis artikel |
| `akuakun1226-source/aartikel-dprd-frontend` | Situs berita publik, scraper Python, migrasi Supabase, Edge Function | Sumber data dan situs publik read-only |

Repo arsip **tidak** memuat migrasi Supabase, Edge Function, atau scraper. File-file itu
ada di repo berita. Yang ada di repo arsip hanya:

- `src/lib/news/*` — client Supabase + pemanggil Edge Function,
- `src/components/yudit/news/*` — komponen UI Berita,
- `src/components/yudit/views/news-view.tsx` — halaman view Berita,
- `.env.example` — daftar variabel environment.

---

## 3. Alur data

```
GitHub Actions (06.00 WIB)
  └─ scripts/run_scrape.py
       ├─ fetch sumber (paralel 6 worker)
       └─ sync_supabase.py
              │
              ▼
        Supabase Postgres
   scraped_articles · manual_articles · scrape_runs
   Storage bucket: article-images
              │
     baca: anon key + RLS (SELECT)
     ┌────────┴─────────────────────────┐
     ▼                                  ▼
Situs publik (Next.js)            Arsip DPRD (SPA)
/  /berita  /berita/[slug]        view "Berita"
/api/news
     ▲                                  │
     │        tulis: admin saja         │
     └──── Edge Function news-admin ◄────┘
              (Deno + service role)
```

Alur tulis artikel manual:

1. Admin membuka view Berita di arsip, klik **"Masuk untuk menulis"**.
2. Login memakai akun **Supabase Auth** (bukan akun arsip).
3. Form mengirim `POST /news-admin/manual` dengan Bearer token.
4. Edge Function memverifikasi `app_metadata.news_role === "admin"`.
5. Baris ditulis ke `manual_articles` memakai service role.
6. Situs publik langsung menampilkan artikel (auto-publish, tanpa draft).

---

## 4. Database dan Supabase

Project Supabase Berita: `mpvfywmhlgzrdhqtndok` (terpisah dari project arsip).

### 4.1 Tabel

| Tabel | Isi penting | Aturan |
|---|---|---|
| `manual_articles` | `slug`, `title`, `summary`, `content` (HTML), `source_name`, `source_url`, `published_at`, `categories[]`, `image_path`, `created_by` | Slug unik dan **tidak boleh berubah** setelah dibuat; auto-publish |
| `scraped_articles` | `id`, `url` unik, `title`, `published_at`, `summary`, `source`, `image`, `payload jsonb` | Upsert berdasarkan URL; `payload` menyimpan data mentah |
| `scrape_runs` | `started_at`, `finished_at`, `status`, `found`, `inserted`, `updated`, `error` | Status: `running`, `success`, `failed` |

### 4.2 RLS dan hak akses

- Ketiga tabel mengaktifkan **Row Level Security**.
- Policy yang ada hanya `SELECT` untuk `anon` dan `authenticated`.
- Tidak ada policy `INSERT`/`UPDATE`/`DELETE`, sehingga **tidak ada client yang bisa
  menulis langsung**. Semua penulisan lewat service role di Edge Function.
- Bucket Storage `article-images` bersifat publik untuk dibaca; upload hanya lewat
  Edge Function.

### 4.3 Edge Function `news-admin`

Deno, di-deploy dengan `supabase functions deploy news-admin`.

| Method | Path | Fungsi |
|---|---|---|
| `GET` | `/news-admin/health` | Health check |
| `POST` | `/news-admin/manual` | Buat artikel manual |
| `PATCH` | `/news-admin/manual/:id` | Ubah artikel |
| `DELETE` | `/news-admin/manual/:id` | Hapus artikel |
| `POST` | `/news-admin/images` | Upload gambar ke Storage |
| `OPTIONS` | `*` | Preflight CORS |

Keamanan:

- Token Bearer diverifikasi ke Supabase Auth.
- Hanya user dengan `app_metadata.news_role = "admin"` yang diizinkan menulis.
- Service role key **hanya** ada di environment Edge Function, tidak pernah dikirim ke
  browser.
- Origin yang diizinkan diatur lewat `ALLOWED_ORIGINS` (CORS allowlist).

---

## 5. Login dan hak akses

Login arsip **tidak berubah** (tetap lewat FastAPI Railway). Berita punya sesi sendiri
memakai Supabase Auth dengan storage key `dprd-news-auth`, jadi keduanya tidak saling
mengganggu. Saat logout arsip, sesi Berita juga ikut ditutup.

| Aksi | Siapa yang boleh |
|---|---|
| Melihat daftar artikel (manual + scraping) | Semua role arsip (`owner`, `super_admin`, `member`) |
| Membuat / mengubah / menghapus artikel manual | `owner` atau `super_admin` **dan** login Berita sebagai admin |
| Melihat status scraping | Semua role arsip |

Ada dua gerbang yang harus lolos untuk menulis:

1. **Role arsip** harus `owner`/`super_admin` (dicek di UI).
2. **Sesi Berita** harus punya `news_role = "admin"` (dicek di Edge Function).

Member tetap bisa membaca Berita, tetapi tombol tulis tidak muncul.

---

## 6. Scraping harian

File: `.github/workflows/scrape.yml` di repo berita.

- Jadwal: `0 23 * * *` UTC = **06.00 WIB** setiap hari.
- Bisa juga dijalankan manual lewat `workflow_dispatch`.
- Runner: Ubuntu, Python 3.12, timeout 40 menit.
- Concurrency group `scrape-berita`, supaya dua proses tidak tumpang tindih.
- Secret yang dipakai: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- `SCRAPE_PREVIEW=0` di CI agar tidak ada preview terminal yang memperlambat.

Alur:

```
start_run()  →  fetch_all_sources()  →  sync_supabase.py  →  finish_run()
                 (6 worker paralel)      (upsert per URL)
```

Detail teknis:

| Hal | Nilai |
|---|---|
| Jumlah sumber | 21 sumber (resmi + media) |
| Contoh sumber resmi | DPRD Kuningan, Bappeda, Pemkab Kuningan, PPID |
| Contoh media | Antara Jabar, RRI, detik, Radar Kuningan, dll. |
| Request timeout | 30 detik |
| Connect timeout | 10 detik |
| Worker paralel | 6 (`SCRAPE_WORKERS`) |
| Upsert | Berdasarkan `url` unik |
| Log | Satu baris `scrape_runs` per eksekusi |

Catatan operasional:

- Beberapa host pemerintah (`kuningankab.go.id`, `bappeda.kuningankab.go.id`) tidak bisa
  diakses dari IP runner GitHub. Circuit breaker akan melewati host tersebut dengan
  cepat agar tidak memblokir sumber lain. Scraper tetap mencoba jalur alternatif
  (RSS/API) bila tersedia.
- Artikel **manual menang** atas hasil scraping jika `source_url`-nya sama. Hasil
  scraping dengan URL tersebut tidak ditampilkan ganda.

---

## 7. Frontend arsip

Arsip adalah **SPA**. Berita bukan route `/berita`, melainkan key view `"news"` di
sidebar yang dirender oleh `YuditCloud`.

File utama:

| File | Fungsi |
|---|---|
| `src/components/yudit/views/news-view.tsx` | Halaman view Berita, tab, dan gerbang login |
| `src/components/yudit/news/manual-articles-tab.tsx` | Daftar + aksi artikel manual |
| `src/components/yudit/news/manual-article-form.tsx` | Form create/edit |
| `src/components/yudit/news/news-article-editor.tsx` | Editor HTML (Tiptap) |
| `src/components/yudit/news/scraped-articles-tab.tsx` | Daftar hasil scraping (read-only) |
| `src/components/yudit/news/news-status-card.tsx` | Status scraping |
| `src/components/yudit/news/news-login-dialog.tsx` | Dialog login Berita |
| `src/lib/news/api.ts` | Baca via Supabase, tulis via Edge Function |
| `src/lib/news/supabase.ts` | Inisialisasi client dan resolver URL |
| `src/lib/news/use-news-session.ts` | Hook sesi Supabase Auth |
| `src/lib/news/schedule.ts` | Hitung jadwal scrape berikutnya (06.00 WIB) |

Environment variables (isi di Vercel / `.env.local`):

| Variabel | Fungsi |
|---|---|
| `NEXT_PUBLIC_SUPABASE_NEWS_URL` | URL project Supabase Berita |
| `NEXT_PUBLIC_SUPABASE_NEWS_ANON_KEY` | Anon key untuk baca (aman, dibatasi RLS) |
| `NEXT_PUBLIC_NEWS_API_URL` | Opsional; default `${URL}/functions/v1/news-admin` |

Kalau variabel belum diisi:

- view Berita tetap terbuka dan tidak crash,
- daftar artikel kosong,
- aksi tulis menampilkan pesan "Konfigurasi Berita belum diset.",
- fitur arsip lain tidak terpengaruh.

---

## 8. Build dan deploy

### 8.1 Perubahan build (commit `82c2de0`)

| Perubahan | Alasan |
|---|---|
| `yarn.lock` dihapus | Lockfile kedaluwarsa; `yarn install --frozen-lockfile` gagal di branch ini |
| `vercel.json` memakai `npm ci --no-audit --no-fund`, `npm run build`, `npm run dev` | Menyelaraskan dengan `package-lock.json` yang jadi satu-satunya lockfile |
| README lama menandai BUILD-01 selesai | Bug package manager yang sudah diperbaiki |

Sisa file di root repo sekarang hanya file proyek standar. Tidak ada artefak build,
`node_modules`, atau dokumen internal yang ikut ter-commit.

### 8.2 Verifikasi yang sudah dijalankan

Dijalankan dari **clone bersih** repo yang dipush (bukan folder kerja lokal):

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Install bersih | `npm ci --no-audit --no-fund` | 975 paket, sukses |
| Unit test | `npm test` | 23/23 passed |
| Typecheck | `npm run typecheck` | tanpa error |
| Build | `npm run build` | sukses |
| Runtime | `/`, `/drives`, `/oauth-callback`, `/api` | semua `200` |

### 8.3 Target deploy

| Komponen | Platform | Status |
|---|---|---|
| Situs berita publik | Vercel `aartikel-dprd-frontend.vercel.app` | aktif |
| Edge Function `news-admin` | Supabase `mpvfywmhlgzrdhqtndok` | aktif |
| Scraping harian | GitHub Actions | aktif (cron 06.00 WIB) |
| Review arsip | Vercel `kp-frnt-berita-review.vercel.app` | aktif, tanpa git link |
| Arsip produksi | Vercel `clouddatadprd.vercel.app` | **menunggu env Berita + approval owner** |

Catatan soal situs review:

- Review memakai **backend dan database produksi yang sama**, hanya frontend-nya yang
  berbeda.
- Karena CORS Railway hanya mengizinkan domain produksi, review memakai rewrite
  same-origin `/backend/:path*` ke Railway.
- Salinan review menambahkan `skipTrailingSlashRedirect` dan aturan rewrite trailing
  slash. **Dua hal ini tidak ada di repo** dan hanya berlaku untuk situs review.

---

## 9. Yang perlu dilakukan sebelum merge ke produksi

1. **Review branch** `feat/berita-arsip` di
   `akuakun1226-source/kp-frnt` (default branch repo tersebut).
2. **Set environment variables** di Vercel arsip produksi:
   - `NEXT_PUBLIC_SUPABASE_NEWS_URL`
   - `NEXT_PUBLIC_SUPABASE_NEWS_ANON_KEY`
   - `NEXT_PUBLIC_NEWS_API_URL` (opsional)
3. **Tambahkan origin produksi** ke `ALLOWED_ORIGINS` Supabase jika belum ada.
4. **Rotate password** akun admin Berita. Akun saat ini dibuat manual lewat Supabase
   Admin API dan password-nya diserahkan di luar repo. Ganti dengan email pemilik
   sebenarnya bila memungkinkan.
5. Merge / buka PR ke `pathospratama/kp-frnt` setelah disetujui.

---

## 10. Cara mengecek sendiri

```bash
# install & jalankan arsip
npm ci --no-audit --no-fund
npm run dev

# verifikasi
npm test
npm run typecheck
npm run build
```

Cek layanan Berita:

```bash
# health Edge Function
curl https://mpvfywmhlgzrdhqtndok.supabase.co/functions/v1/news-admin/health

# daftar berita publik
curl https://aartikel-dprd-frontend.vercel.app/api/news
```

Di aplikasi arsip:

1. Login seperti biasa.
2. Buka menu **Berita** di sidebar.
3. Tab **Artikel Manual** untuk artikel tulisan admin.
4. Tab **Hasil Scraping** untuk artikel otomatis.
5. Kartu status di atas menunjukkan jadwal dan hasil scraping terakhir.

---

## 11. Riwayat commit modul Berita (repo arsip)

| Commit | Isi |
|---|---|
| `c1a67f2` | Tipe data, validasi, dan jadwal scraping |
| `806d5fc` | Client Supabase + API admin Berita |
| `e0c1d57` | Navigasi dan status shell Berita |
| `0868e3d` | Login dan sesi Berita |
| `5709b12` | CRUD artikel manual |
| `9cd9d51` | Tab artikel hasil scraping |
| `2dafb8e` | Dokumentasi environment Berita |
| `dae6474` | Sinkronisasi `package-lock.json` (dependensi Tiptap) |
| `82c2de0` | Standarisasi npm, hapus `yarn.lock`, rapikan build |

---

## 12. Batasan yang diketahui

- Beberapa host pemerintah tidak dapat diakses dari runner GitHub; scraper memakai
  circuit breaker dan jalur alternatif (RSS/API) bila ada.
- Situs review memerlukan perlakuan trailing slash khusus; situs produksi tidak.
- Env Berita di arsip produksi belum diisi, jadi fitur Berita di
  `clouddatadprd.vercel.app` belum aktif sampai langkah pada bagian 9 dilakukan.
- Artikel manual tidak punya alur draft: begitu disimpan, langsung tampil di situs
  publik.
