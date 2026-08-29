# KBM Berkah Ceria 🚗💨

Aplikasi web modern untuk manajemen perjalanan konvoi dan berbagi biaya (_expense splitting & settlement_) untuk komunitas **KBM Berkah Ceria**. Dibangun dengan **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, dan **Drizzle ORM**, dioptimalkan untuk performa tinggi di **Edge Runtime / Cloudflare Pages** serta **100% Mobile-Friendly**.

---

## 🌟 Fitur & Kapabilitas Utama

### 1. 🧙 Wizard Pembuatan Perjalanan (4-Step Stepper)

- **Langkah 1: Rute & Jadwal** — Mendukung multi-leg/etape rute lanjutan (misal Leg 1: Bandung ➔ Cirebon, Leg 2: Cirebon ➔ Semarang).
- **Langkah 2: Armada & Peserta** — Multi-armada mobil (nama mobil & plat nomor), input peserta cepat, paste banyak nama sekaligus (_bulk paste_), dan penandaan supir (_diskon 50% biaya perjalanan_).
- **Langkah 3: Pengeluaran Awal & Rekening Pembayaran** — Deteksi otomatis kategori biaya (BBM, Tol, Makan, Parkir, dll.), mode tagihan makan perorangan (_Food Stop individual split_), serta pemilihan rekening tujuan transfer host.
- **Langkah 4: Review & Simpan** — Ringkasan menyeluruh sebelum disimpan ke database dalam satu transaksi aman.

### 2. 📱 Dashboard & Manajemen Akun Host

- Ringkasan statistik perjalanan aktif vs selesai.
- Pengelolaan rekening bank dan e-wallet pribadi host dengan prioritas transfer.
- Fitur berbagi perjalanan (_Trip Sharing_) via email dengan hak akses read-only maupun edit.
- **Mobile Experience**: Dilengkapi _Bottom Navigation Bar_ modern (dengan _safe-area padding_ untuk iOS/Android) dan tombol aksi cepat (_Floating Action Button_ `+ Trip Baru`).

### 3. 🗺️ Halaman Detail Perjalanan Interaktif (`/perjalanan/[id]`)

- **Hero Header**: Informasi rute, tanggal, total rupiah, tombol **Salin Tagihan WhatsApp** otomatis, dan ekspor **Laporan Cetak PDF / HTML**.
- **Tab 1: Saldo & Settlement** — Tabel & kartu saldo ringkas, pembagian talangan vs hutang, status lunas, serta kartu metode pembayaran dengan fitur salin rekening 1-klik.
- **Tab 2: Pengeluaran** — Tabel/kartu pengeluaran _high-density_, penyesuaian porsi makan per orang (_Food Stop Accordion_), pencatatan nota baru, edit, dan hapus transaksi.
- **Tab 3: Rute & Armada** — Menggunakan sistem **Accordion Row Cards 1-Baris**:
  - 🗺️ _Ikhtisar Penugasan Etape & Mobil_
  - 🚗 _Master Armada Kendaraan Konvoi_
  - 🚩 _Pengaturan Etape (Leg) & Armada_
  - 👥 _Penempatan & Pembagian Penumpang_ dengan dialog modal popup `🚗 Atur Mobil` yang terpusat.
- **Tab 4: Peserta** — Pengelolaan anggota trip dan pengalihan peran supir/penumpang.

### 4. 📊 Ringkasan & Statistik Komunitas (`/ringkasan`)

- **KPI Metrics Grid**: Total Rupiah dikelola, Total Perjalanan (Aktif & Selesai), Partisipasi Kursi & Peserta Unik, serta Rata-rata Biaya per Orang.
- **Distribusi Kategori Pengeluaran**: _Multi-Segment Progress Bar_ dan kartu kategori proporsional (BBM ⛽, Tol 🛣️, Makan 🍽️, Parkir 🅿️, Hotel 🏨, Tiket 🎟️, dll.).
- **Interactive Trip Ledger**: Tabel & kartu riwayat seluruh perjalanan dilengkapi **Pencarian Langsung (Live Search)**, **Filter Status Pills (Semua, Aktif, Selesai)**, dan **Pagination Interaktif** (5/10/20 item per halaman).

### 5. 🧮 Settlement & Algoritma Pembagian Biaya

- Bobot pembagian supir: 0.5 (diskon 50% untuk biaya etape/mobil) vs penumpang: 1.0.
- Cakupan biaya fleksibel: per leg (lintas mobil) atau khusus kendaraan tertentu.
- _Food Stop Split_: Tagihan makan dengan nominal custom per individu.
- Penyesuaian saldo manual (_Balance Adjustments_) oleh host.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components & Server Actions)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com/), Lucide React Icons, clsx
- **Database & ORM**: [Drizzle ORM](https://orm.drizzle.team/) (SQLite / Cloudflare D1 / Better-SQLite3)
- **Runtime**: Edge Runtime & Node.js (Kompatibel dengan Cloudflare Pages / Workers)
- **Autentikasi**: Google OAuth + JWT Session Cookie yang aman
- **Validasi**: [Zod](https://zod.dev/)
- **Date Utilities**: [date-fns](https://date-fns.org/) (dengan locale Indonesia `id`)
- **Testing**: Node.js Native Test Runner (`node:test`)

---

## 🚀 Memulai Pengembangan Lokal

### Prasyarat

- Node.js >= 18.18
- npm / pnpm / yarn

### Instalasi & Menjalankan Server

1. **Clone repository dan install dependensi**:

   ```bash
   git clone https://github.com/yuslanabubakar/kbm-berkah-ceria.git
   cd kbm-berkah-ceria
   npm install
   ```

2. **Setup Environment Variables**:
   Salin `.env.example` ke `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

   Pastikan variabel berikut terkonfigurasi:

   ```env
   # Google OAuth (Opsional untuk login)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   SESSION_SECRET=your_jwt_secret_key_min_32_chars
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Jalankan Database Migration**:

   ```bash
   npm run db:migrate
   # atau seed data contoh:
   npm run db:seed
   ```

4. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```
   Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 🧪 Pengujian & Kualitas Kode

Proyek ini dilengkapi dengan unit test menyeluruh untuk memastikan akurasi perhitungan saldo, validasi form, deteksi kategori, dan otentikasi:

```bash
# Menjalankan seluruh test suite (94+ passing tests)
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## 📂 Struktur Direktori

```
kbm-berkah-ceria/
├── app/
│   ├── api/                   # API Routes (Trips, Expenses, Participants, Auth)
│   ├── dashboard/             # Halaman Dashboard Host
│   ├── perjalanan/
│   │   ├── baru/              # 4-Step Wizard Pembuatan Perjalanan
│   │   └── [id]/              # Detail Trip (Saldo, Pengeluaran, Armada, Peserta)
│   ├── ringkasan/             # Statistik & Ringkasan Komunitas
│   ├── layout.tsx             # Root layout & Navbar
│   └── page.tsx               # Landing page
├── src/
│   ├── components/            # Komponen UI Reusable (Wizard, Ledger, Modals, Forms)
│   ├── db/                    # Drizzle ORM Schema, Migrations, & Connection
│   ├── hooks/                 # Custom React Hooks
│   ├── lib/                   # Query Helpers, Formatters (formatRupiah), Auth Engine
│   └── types/                 # TypeScript Types & Interfaces
├── tests/
│   └── unit/                  # Unit tests (tripQueries, settlement, createTrip, currency)
└── docs/                      # Dokumentasi tambahan
```

---

## 📄 Lisensi

Dikelola secara privat dan terbuka untuk kebutuhan komunitas **KBM Berkah Ceria**.
