# Panduan Penggunaan KBM Berkah Ceria

Dokumen ini menjelaskan alur kerja utama aplikasi berbagi biaya perjalanan. Gunakan panduan ini sebagai referensi singkat untuk host maupun peserta yang diberi akses.

## 1. Masuk & Hak Akses

- Buka `NEXT_PUBLIC_APP_URL` (default `http://localhost:3000`).
- Klik **Masuk dengan Google**.
- Host (pemilik trip) otomatis memiliki akses penuh. Tamu yang diundang via email hanya dapat melihat ringkasan.

## 2. Membuat Perjalanan Baru

1. Dari dashboard pilih **Buat perjalanan**.
2. Isi nama perjalanan, lokasi, tanggal mulai, dan tanggal selesai.
3. Simpan. Sistem otomatis:
   - Membuat leg pertama.
   - Menyiapkan kendaraan default.
   - Menambahkan diri Anda sebagai peserta awal (status supir).

## 3. Mengelola Metode Pembayaran Host

1. Di dashboard, buka kartu **Metode pembayaran host**.
2. Tambah rekening atau e-wallet baru (label, tipe kanal, nomor, nama pemilik, instruksi opsional).
3. Metode pembayaran muncul di halaman perjalanan dan pada laporan PDF halaman pertama.

## 4. Manajemen Peserta & Kendaraan

1. Buka halaman **perjalanan** yang diinginkan (`/perjalanan/{id}`).
2. Pada kartu **Armada & penumpang**:
   - Gunakan tombol **Tambah kendaraan trip** atau **Tambah leg** sesuai kebutuhan.
   - Tambah peserta baru dari panel **Masukkan penumpang baru**.
   - Edit nama peserta/supir di panel **Edit penumpang terdaftar**.
   - Gunakan daftar penumpang untuk memilih peserta lalu tempatkan massal ke leg/kendaraan.
   - Klik **Pilih tujuan** pada peserta untuk memindahkan secara manual dan tetapkan peran (supir/penumpang).
   - Tautkan kendaraan ke leg, atur jadwal keberangkatan, dan kosongkan kendaraan bila perlu.

## 5. Mencatat Pengeluaran

1. Di bagian **Pengeluaran** pada halaman perjalanan, klik **Tambah pengeluaran**.
2. Isi judul, jumlah, tanggal, pihak yang membayar, dan scope (leg atau kendaraan).
3. Simpan. Pengeluaran otomatis terbagi rata ke peserta sesuai scope.
4. Untuk penyesuaian khusus:
   - Gunakan mode split manual untuk mengatur porsi setiap peserta.
   - Tandai pengeluaran sebagai dikecualikan bila tidak memengaruhi saldo.
   - Edit/hapus pengeluaran melalui menu aksi tiap item.

## 6. Penyesuaian Saldo

- Di panel **Penyesuaian saldo**, host dapat menambahkan entri **talangan/penyesuaian**:
  1. Pilih peserta, isi nilai, beri catatan.
  2. Simpan sebagai draft lalu tandai **Applied** ketika sudah final, atau **Void** bila dibatalkan.
- Riwayat penyesuaian otomatis tercatat dan memengaruhi saldo peserta.

## 7. Berbagi Perjalanan dengan Tamu

1. Pada halaman perjalanan, buka panel **Bagikan perjalanan**.
2. Masukkan email penerima, klik **Kirim undangan**.
3. Penerima akan mendapat akses baca melalui Supabase RLS (tidak bisa mengubah data).
4. Cabut akses dari daftar share jika tidak lagi diperlukan.

## 8. Mengunduh Laporan PDF

1. Pada halaman perjalanan, buka menu aksi laporan (atau panggil langsung API `GET /api/trips/{id}/report`).
2. Laporan berisi tiga halaman:
   - Halaman 1: Metode pembayaran host.
   - Halaman 2: Ringkasan peserta (biaya, talangan, kembalian, harus bayar) dengan highlight kewajiban.
   - Halaman 3: Daftar pengeluaran kronologis.
3. Bagikan PDF kepada peserta untuk referensi akhir perjalanan.

## 9. Tips Operasional

- Pastikan setiap leg memiliki kendaraan sebelum melakukan penempatan massal.
- Untuk perjalanan panjang, gunakan penyesuaian saldo untuk merekam pembayaran manual di luar aplikasi.
- Setelah finalisasi, kunci akses tamu yang tidak lagi diperlukan untuk menjaga kerahasiaan data.

---

Jika menemukan bug atau membutuhkan fitur baru, laporkan melalui issue tracker repositori ini.
