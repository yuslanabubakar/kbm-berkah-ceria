# Panduan Penggunaan KBM Berkah Ceria 🚗

Dokumen ini menjelaskan alur kerja utama aplikasi berbagi biaya perjalanan untuk tim & komunitas KBM Berkah Ceria.

---

## 1. Masuk & Autentikasi

- Akses aplikasi di browser Anda.
- Klik **Masuk dengan Google** di sudut kanan atas.
- Host (pembuat trip) otomatis memiliki hak akses penuh untuk mengedit, menambah pengeluaran, mengatur armada, dan membagikan akses trip.

---

## 2. Membuat Perjalanan Baru (4-Step Wizard)

1. Di Dashboard, klik tombol **+ Trip Baru**.
2. **Langkah 1: Rute & Jadwal**
   - Masukkan Nama Perjalanan, Tanggal Mulai & Selesai.
   - Tambahkan etape (leg) perjalanan jika rute memiliki beberapa titik singgah.
3. **Langkah 2: Armada & Peserta**
   - Tambah mobil konvoi (nama mobil & plat nomor).
   - Masukkan nama peserta satu per satu atau gunakan **Paste Banyak** untuk menempelkan daftar nama sekaligus.
   - Tandai siapa saja yang bertindak sebagai supir (**🚗 Supir** mendapat diskon 50% biaya leg/kendaraan).
4. **Langkah 3: Pengeluaran Awal & Rekening**
   - Masukkan nota awal (bila sudah ada nota sebelum trip).
   - Kategori biaya (BBM, Tol, Makan, Parkir) akan terdeteksi otomatis dari judul nota.
   - Gunakan fitur **Pemberhentian Makan** jika tagihan makan berbeda per orang.
   - Pilih rekening/e-wallet pembayaran host yang ingin dilampirkan ke trip.
5. **Langkah 4: Review & Simpan**
   - Periksa ringkasan data, lalu klik **Simpan Perjalanan**.

---

## 3. Mengelola Rekening Pembayaran Host

1. Di Dashboard pada tab **Rekening Host**, klik **+ Tambah Rekening**.
2. Masukkan label rekening, jenis saluran (Bank Transfer / E-Wallet), nomor rekening/HP, dan nama pemilik rekening.
3. Rekening ini dapat dilampirkan ke setiap trip untuk memudahkan peserta menyalin nomor transfer saat settlement.

---

## 4. Manajemen Rute, Armada & Penumpang (`/perjalanan/{id}`)

Pada halaman detail perjalanan, buka tab **Armada**:

- **🗺️ Ikhtisar Penugasan Etape & Mobil**: Pantau jumlah penumpang di setiap mobil per etape.
- **🚗 Master Kendaraan Konvoi**: Tambah mobil baru atau edit plat nomor.
- **🚩 Pengaturan Etape (Leg)**: Hubungkan mobil yang beroperasi di etape terkait.
- **👥 Penempatan Penumpang**: Klik **🚗 Atur Mobil** untuk memindahkan penumpang ke mobil lain lewat popup modal yang praktis, atau gunakan penempatan massal (_bulk placement_).

---

## 5. Pencatatan Pengeluaran & Pemberhentian Makan

1. Di tab **Pengeluaran**, klik **+ Tambah Pengeluaran**.
2. Masukkan judul nota, nominal Rupiah, tanggal, pembayar (_paid by_), dan scope (seluruh etape atau khusus kendaraan tertentu).
3. **Pemberhentian Makan (Food Stop)**:
   - Centang opsi **🍽️ Pemberhentian Makan**.
   - Masukkan nominal tagihan masing-masing peserta di mobil tersebut. Total nota akan dihitung otomatis.
4. Klik simpan. Saldo peserta langsung diperbarui secara _real-time_.

---

## 6. Salin Tagihan WhatsApp & Ekspor Laporan

1. Di banner atas detail perjalanan:
   - **Tombol 💬 Salin Tagihan WA**: Menghasilkan template pesan WhatsApp berisi ringkasan "Siapa Bayar Berapa" & "Siapa Terima Berapa" lengkap dengan detail rekening transfer host.
   - **Tombol 📄 Cetak Laporan PDF**: Membuka laporan resmi yang siap dicetak atau disimpan sebagai PDF (Ctrl+P / Cmd+P).

---

## 7. Ringkasan & Statistik Komunitas (`/ringkasan`)

- Buka menu **Ringkasan** di bilah navigasi atas.
- Pantau total dana yang dikelola, rata-rata biaya per orang, diagram bar alokasi kategori pengeluaran, serta riwayat seluruh trip dengan fitur live search & pagination.
