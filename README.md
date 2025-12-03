# KBM Berkah Ceria

Aplikasi berbagi biaya perjalanan untuk tim KBM Berkah Ceria. Menggunakan Next.js 14 (App Router) dan Supabase agar tim bisa mencatat pengeluaran, membagi biaya dalam Rupiah, mengatur armada, serta memantau saldo akhir secara real time.

## Kapabilitas Saat Ini

- Dashboard pemilik menampilkan daftar trip aktif, total pengeluaran, tombol bikin trip, modul berbagi trip via email, dan manajer metode pembayaran host.
- Form pembuatan trip instan membuat leg pertama, kendaraan utama, dan peserta awal lengkap dengan penandaan supir & jadwal default.
- Halaman detail perjalanan menyajikan saldo per peserta (dengan badge supir), daftar pengeluaran editable, dan kartu metode pembayaran yang siap disalin peserta.
- Pencatatan pengeluaran mendukung scope leg/kendaraan, edit & hapus, pengecualian dari perhitungan, format Rupiah otomatis, serta validasi dengan Zod.
- Mode host menyediakan kontrol split manual per expense, toggle pengecualian, penyesuaian saldo (draft/applied/void), dan histori penyesuaian.
- Manajemen armada meliputi tambah leg, hubungkan kendaraan ke leg, atur jadwal keberangkatan, assign peserta massal, pindah penumpang, serta ubah supir/penumpang.
- Berbagi trip memungkinkan host mengundang email (akses read-only) via `trip_shares`, menjaga RLS Supabase; halaman Ringkasan komunitas tersedia sebagai preview statis.

## Tech Stack

- Next.js 14 (App Router, Server Components) + React 18 + TypeScript
- Supabase Postgres + Auth + Storage via `@supabase/ssr`
- Tailwind CSS 3, clsx untuk styling
- Zod untuk validasi form, date-fns dan Intl untuk format tanggal & Rupiah
- ESLint, Prettier, Husky, lint-staged, pnpm

## Prasyarat

- Node.js >= 18.18
- pnpm `npm install -g pnpm`
- Akun Supabase beserta project baru

## Cara Jalanin

```bash
pnpm install
pnpm dev
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
   - `https://<domain-vercel>/auth/callback`
3. Pastikan `.env.local` memiliki `NEXT_PUBLIC_APP_URL` yang menunjuk ke origin saat ini (lokal atau Vercel). Nilai ini dipakai ketika memanggil `signInWithOAuth`.
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

## Next Steps

- Tambahkan opsi akses edit pada sharing serta UI untuk mencabut/upgrade hak akses tamu.
- Sambungkan halaman Ringkasan ke agregasi Supabase agar tidak bergantung pada data statis.
- Integrasikan channel realtime Supabase untuk update saldo dan pengeluaran instan.
- Siapkan pengujian (unit/integration) untuk API routes kritikal sebelum rilis produksi.
