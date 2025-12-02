# KBM Berkah Ceria

Aplikasi berbagi biaya perjalanan untuk tim KBM Berkah Ceria. Dibangun dengan Next.js 14 (App Router) dan Supabase sehingga tim bisa mencatat pengeluaran, membagi biaya dengan Rupiah, serta memantau saldo akhir secara real time.

## Fitur Utama

- **Beranda ringkas** menampilkan perjalanan aktif beserta CTA membuat perjalanan baru.
- **Halaman Perjalanan** berisi daftar peserta, form tambah pengeluaran berbasis Rupiah (mendukung desimal), dan saldo otomatis per orang.
- **Leg & kendaraan** lengkap dengan assignment supir/penumpang sehingga pembagian biaya bisa per leg ataupun per kendaraan.
- **Host payment accounts**: pemilik trip dapat menambahkan banyak rekening/e-wallet via API `/api/trips/[tripId]/host-accounts` agar peserta tahu kemana membayar.
- **Halaman Ringkasan** menyoroti siapa bayar paling banyak, rekomendasi pelunasan, serta ekspor ringan.
- Bahasa default **Indonesia kasual** dengan format mata uang Rupiah memakai `Intl.NumberFormat('id-ID', { currency: 'IDR' })`.

## Tech Stack

- Next.js 14 + TypeScript + App Router
- Tailwind CSS untuk styling
- Supabase (Postgres + Auth + Storage)
- ESLint, Prettier, Husky, lint-staged, pnpm

## Prasyarat

- Node.js >= 18.18
- pnpm `npm install -g pnpm`
- Akun Supabase dan project baru

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

`SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di sisi server (API route) untuk perhitungan saldo, jadi jangan disebar ke klien.

## Integrasi Supabase

1. Jalankan `pnpm supabase login` jika memakai Supabase CLI (opsional).
2. Buat tabel berikut (skema ringkas):
   - `trips` (id ulid, nama, tanggal_mulai, tanggal_selesai)
   - `participants` (id, trip_id, nama, kontak)
   - `expenses` (id, trip_id, judul, deskripsi, amount_idr numeric, paid_by uuid, split_with uuid[])
3. Aktifkan Row Level Security dan tulis policy sesuai kebutuhan akses.

### Skema & Migrasi

- File SQL utama berada di `supabase/migrations/0001_init.sql` dan mencakup:
  - `trips` → metadata perjalanan Bandung ⇄ Jakarta (atau kota lain).
  - `trip_legs` → tiap arah perjalanan (pergi/pulang) dengan tanggal berangkat/pulang.
  - `trip_vehicles` → daftar mobil per leg (Avanza, Xenia, dll.) beserta kapasitas.
  - `vehicle_assignments` → siapa duduk di mobil mana pada leg tertentu + role supir/penumpang.
  - `expenses` → pengeluaran wajib memilih leg & (opsional) kendaraan + kolom `share_scope` untuk menentukan dibagi ke seluruh leg atau hanya kendaraan tertentu.
  - `expense_splits` → opsi override pembagian biaya jika tidak ingin memakai perhitungan otomatis.
  - View `expense_share_resolved` + `trip_balances` → menghitung share default sesuai aturan KBM (default dibagi rata ke seluruh penumpang leg; jika `share_scope = 'vehicle'` maka hanya penumpang kendaraan tersebut yang dihitung).
  - `trip_balances`, `settlements`, `trip_invites` + seluruh kebijakan RLS.
- Terapkan migrasi ke proyek Supabase kamu dengan:

```bash
supabase db reset --local    # jika memakai Supabase CLI + docker lokal
# atau untuk deploy langsung
supabase db push --file supabase/migrations/0001_init.sql
```

Pastikan environment sudah login (`supabase login`) dan `.env.local` terisi sebelum menjalankan perintah di atas.

> **Catatan aturan biaya:** setiap expense harus punya leg. Default-nya, sistem akan membagi biaya secara rata ke semua penumpang yang tercatat pada leg tersebut (`share_scope = 'leg'`). Jika kamu memilih opsi "Penumpang kendaraan ini" saat membuat expense, maka hanya penumpang di kendaraan terkait yang ikut menanggung. Override manual tetap bisa dilakukan via `expense_splits` jika perlu pembagian khusus (mis. supir hanya mengganti sebagian, makan siang ditanggung 3 orang saja, dll.).

### Contoh Seed Data

- File `supabase/seed.sql` menyediakan contoh trip Bandung ⇄ Jakarta (24–28 Nov 2025) lengkap dengan peserta, leg, kendaraan, assignment, dan beberapa pengeluaran.
- Jalankan lewat CLI:

```bash
supabase db seed --file supabase/seed.sql
```

Gunakan seed ini untuk uji tampilan sebelum data produksi siap.

## API Ringkas

- `POST /api/trips/[tripId]/host-accounts` → tambah metode pembayaran baru (label, channel `bank|ewallet|cash|other`, nomor rekening, instruksi opsional, prioritas).
- `PATCH /api/trips/[tripId]/host-accounts/[accountId]` → perbarui sebagian/seluruh field di atas.
- `DELETE /api/trips/[tripId]/host-accounts/[accountId]` → hapus rekening. Semua endpoint otomatis menjalankan `revalidatePath` pada beranda dan halaman perjalanan.

Endpoint lain mengikuti pola REST di folder `app/api/trips`, mencakup peserta, kendaraan, leg, dan penyesuaian saldo.

## Komit Konvensi

- Gunakan format commit `feat: ...`, `fix: ...`, dll.
- Husky otomatis menjalankan lint-staged saat commit.

## Struktur Folder

```
app/
  page.tsx          -> Beranda
  perjalanan/[id]/  -> Detail perjalanan + form
  ringkasan/        -> Halaman ringkasan global
src/
  components/       -> UI modular (form, kartu, dsb)
  lib/              -> Helper Supabase & utilitas
  types/            -> Definisi TypeScript
```

## Next Steps

- Hubungkan proyek Supabase sungguhan + migrasi SQL.
- Tambahkan autentikasi (magic link atau OTP) agar peserta bisa login.
- Implementasi realtime channel untuk update saldo instan.
- Bangun UI pengelolaan Host Payment agar tidak perlu memanggil API manual.

Selamat membangun dan semoga setiap perjalanan makin berkah dan ceria! 🎒✨
