# KBM Berkah Ceria

Aplikasi berbagi biaya perjalanan untuk tim KBM Berkah Ceria. Menggunakan Next.js 14 (App Router) dan Supabase agar tim bisa mencatat pengeluaran, membagi biaya dalam Rupiah, mengatur armada, serta memantau saldo akhir secara real time.

## Kapabilitas Saat Ini

- Dashboard host menampilkan daftar trip aktif, total pengeluaran, tombol bikin trip, modul berbagi trip via email, dan manajer metode pembayaran pribadi/host.
- Form pembuatan trip membuat leg awal, kendaraan default, peserta perdana beserta status supir, dan jadwal keberangkatan dasar agar perjalanan siap dipakai instan.
- Halaman detail perjalanan menyajikan saldo peserta (dengan badge supir & host-only badge saat relevan), daftar pengeluaran lengkap, serta kartu metode pembayaran siap salin.
- Pencatatan pengeluaran mendukung scope leg/kendaraan, edit & hapus, pengecualian dari perhitungan, format Rupiah otomatis, validasi Zod, dan lampiran bukti opsional.
- **Pemberhentian makan** — mode khusus di form pengeluaran untuk mencatat tagihan makan per orang dalam satu mobil; satu orang bayar duluan, tiap peserta punya jumlah berbeda, total dihitung otomatis. Rincian per orang tampil di kartu pengeluaran (app) maupun laporan PDF.
- Mode host menyediakan kontrol split manual per expense, toggle pengecualian, penyesuaian saldo (draft/applied/void), histori penyesuaian, serta laporan status peserta real time.
- Manajemen armada/penumpang digabung dalam satu panel: tambah leg, hubungkan kendaraan, atur jadwal, assign peserta massal, pindah penumpang, ubah supir/penumpang, tambah/edit peserta.
- Fitur berbagi trip mengundang email read-only via `trip_shares`, menjaga RLS Supabase; halaman ringkasan komunitas menampilkan agregat perjalanan.
- Generator laporan HTML (`GET /api/trips/:tripId/report`) menyusun Metode Pembayaran, Saldo Peserta (kolom Biaya, Talangan, Saldo, Status), dan Daftar Pengeluaran (dengan rincian tagihan makan per orang); dapat disimpan sebagai PDF via print dialog.
- Fitur "Salin Tagihan WA" menghasilkan template pesan WhatsApp otomatis yang mencakup ringkasan tagihan ("Siapa bayar berapa" dan "Siapa terima berapa") beserta metode pembayaran host untuk kemudahan penagihan.

## Tech Stack

- Next.js 14 (App Router, Server Components) + React 18 + TypeScript
- **Cloudflare Pages** (edge runtime) untuk deployment
- Supabase Postgres + Auth + Storage via `@supabase/ssr`
- Tailwind CSS 3, clsx untuk styling
- Zod untuk validasi form, date-fns dan Intl untuk format tanggal & Rupiah
- ESLint, Prettier, Husky, lint-staged, pnpm
- Wrangler untuk Cloudflare Pages configuration

## Prasyarat

- Node.js >= 18.18
- pnpm `npm install -g pnpm`
- Akun Supabase beserta project baru

## Cara Jalanin

### Development

```bash
pnpm install
pnpm dev
```

### Build untuk Cloudflare Pages

```bash
pnpm run build:cf
```

## Variabel Lingkungan

Buat file `.env.local` berdasarkan contoh di bawah:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di sisi server (API route) untuk perhitungan saldo, jadi jangan dibagikan ke klien.

### Login Google Supabase

1. Di dashboard Supabase → **Authentication → Providers**, aktifkan Google dan isi Client ID/Secret dari Google Cloud Console.
2. Di Google Cloud Console tambahkan seluruh redirect berikut pada OAuth client kamu:
   - `https://<project>.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback`
   - `https://<cloudflare-pages-domain>/auth/callback`
3. Pastikan `.env.local` memiliki `NEXT_PUBLIC_APP_URL` yang menunjuk ke origin saat ini (lokal atau Cloudflare Pages domain). Nilai ini dipakai ketika memanggil `signInWithOAuth`.
4. Tombol "Masuk dengan Google" tersedia di header aplikasi; setelah login pengguna diarahkan kembali ke halaman sebelumnya.

## Integrasi Supabase

1. Opsional: `pnpm supabase login` untuk memakai Supabase CLI.
2. Jalankan migrasi ke project Supabase kamu (lihat bagian berikut) agar skema dan RLS sinkron.
3. Isi `.env.local` dengan kredensial Supabase sebelum menjalankan aplikasi.

### Skema & Migrasi

Seluruh SQL berada di `supabase/migrations`. Sorotan penting:

- `0001_init.sql` mendefinisikan trips, participants, trip_legs, trip_vehicles, expense_splits, view `trip_balances`, dan seluruh RLS dasar.
- `0002_host_controls.sql` menambah flag pengecualian pengeluaran, tabel `balance_adjustments`, enum status, dan refresh view penyeimbang.
- `0005_vehicle_departure_schedule.sql` (dan lanjutan) memperkenalkan `leg_vehicle_links` beserta jadwal keberangkatan kendaraan.
- `0008_host_payment_accounts.sql` menambah tabel & RLS untuk daftar rekening host yang ditampilkan di UI.
- `0010_trip_sharing.sql` menyediakan `trip_shares`, helper function anti-recursive, dan kebijakan akses berbasis email untuk akses read-only.

Terapkan seluruh migrasi dengan:

```bash
supabase db reset --local
# atau deploy ke project langsung
supabase db push
```

Pastikan sudah login ke Supabase CLI dan environment berisi kredensial yang benar.

### Deployment ke Cloudflare Pages

1. Install Wrangler: `pnpm install -D wrangler`
2. Konfigurasi `wrangler.toml` sesuai Cloudflare project kamu (lihat `compatibility_date`, `pages_build_output_dir`)
3. Deploy menggunakan:
   ```bash
   pnpm run build:cf
   pnpm wrangler pages deploy .vercel/output/static
   ```
4. Aplikasi berjalan pada edge runtime (semua pages dan routes gunakan `runtime = "edge"`) untuk kompatibilitas Cloudflare Workers.
5. Pastikan `.env` berisi kredensial Supabase yang valid; selama build, isi variabel `NEXT_PUBLIC_*` agar tidak menyebabkan prerender crash.

### Contoh Seed Data

File `supabase/seed.sql` menyediakan contoh trip Bandung <-> Jakarta (24-28 Nov 2025) lengkap dengan peserta, leg, kendaraan, assignment, dan beberapa pengeluaran.

```bash
supabase db seed --file supabase/seed.sql
```

Gunakan seed ini untuk uji tampilan sebelum data produksi siap.

## API Ringkas

### Trips

- `POST /api/trips` membuat perjalanan baru beserta leg & kendaraan awal.
- `GET /api/trips/:tripId` mengambil metadata trip dan akun pembayaran host.
- `PATCH /api/trips/:tripId` memperbarui nama, kota, tanggal mulai/selesai.
- `DELETE /api/trips/:tripId` menghapus perjalanan dan dependensinya.

### Peserta & Armada

- `POST /api/trips/:tripId/participants` menambah peserta; `PATCH`/`DELETE` pada `/participants/:participantId` untuk ubah/hapus.
- `POST /api/trips/:tripId/legs` membuat leg baru; `/legs/:legId/vehicles` untuk hubungkan kendaraan atau atur jadwal keberangkatan.
- `POST /api/trips/:tripId/vehicles` menambah kendaraan; `/vehicles/:vehicleId/assignments` mengatur penempatan peserta.

### Pengeluaran & Host Controls

- `POST /api/expenses` mencatat pengeluaran dengan scope leg/kendaraan.
- `PATCH`/`DELETE /api/expenses/:expenseId` untuk edit/hapus; `/splits` mengatur bobot manual; `/exclude` toggle pengecualian.
- `POST /api/trips/:tripId/adjustments` mencatat penyesuaian saldo; `PATCH /adjustments/:adjustmentId` menandai apply/void.

### Metode Pembayaran & Sharing

- `POST /api/trips/:tripId/host-accounts` menambah rekening/e-wallet host; `PATCH` dan `DELETE` tersedia per `accountId`.
- `POST /api/trips/:tripId/shares` mengundang email; `GET` menampilkan daftar share; `DELETE /shares/:shareId` mencabut akses.
- `GET /api/trips/:tripId/report` menghasilkan laporan HTML tiga halaman (metode pembayaran, ringkasan peserta, daftar pengeluaran) yang dapat disimpan sebagai PDF via browser print.

## Panduan Penggunaan

Dokumentasi langkah demi langkah (buat trip, kelola peserta/kendaraan, catat pengeluaran, undang tamu, terbitkan laporan) tersedia di `docs/how-to-use.md`.

## Struktur Folder

```
app/
  page.tsx              -> Beranda publik
  dashboard/            -> Dashboard setelah login
  perjalanan/[id]/      -> Detail perjalanan, host controls, armada
  ringkasan/            -> Preview ringkasan komunitas
src/
  components/           -> Form trip, pengeluaran, host controls, armada, sharing
  hooks/                -> Supabase session hook
  lib/                  -> Klien Supabase + query trip
  types/                -> Definisi TypeScript
supabase/
  migrations/           -> Skema Postgres + RLS
  seed.sql              -> Data contoh
```

## Catatan Teknis

### Edge Runtime & Cloudflare Pages

- Semua pages dan API routes menggunakan `runtime = "edge"` untuk kompatibilitas Cloudflare Pages.
- Node.js APIs (seperti `pdfkit`) tidak tersedia; laporan menggunakan HTML + browser print dialog.
- Build output menggunakan `.vercel/output/static` (from `@cloudflare/next-on-pages`).

### Report Generation

- Laporan yang dulu menggunakan PDF binary (`pdfkit`) sekarang menggunakan HTML yang fully-styled.
- User membuka laporan di tab baru dan menekan Ctrl+P (Windows/Linux) atau Cmd+P (macOS) untuk save as PDF.
- Eliminates external dependencies dan memastikan kompatibilitas edge runtime.

## Next Steps

- Tambahkan opsi akses edit pada sharing serta UI untuk mencabut/upgrade hak akses tamu.
- Sambungkan halaman Ringkasan ke agregasi Supabase agar tidak bergantung pada data statis.
- Integrasikan channel realtime Supabase untuk update saldo dan pengeluaran instan.
- Siapkan pengujian (unit/integration) untuk API routes kritikal sebelum rilis produksi.
- Monitor edge runtime performance dan cold start times setelah migration.
