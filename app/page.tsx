import Link from "next/link";

export default function PublicHomePage() {
  return (
    <section className="space-y-12">
      <div className="rounded-3xl bg-gradient-to-r from-brand-blue to-brand-coral px-8 py-16 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-white/80">KBM Berkah Ceria</p>
        <h1 className="mt-2 text-5xl font-bold">Bagi biaya trip jadi gampang</h1>
        <p className="mt-6 max-w-2xl text-xl text-white/90">
          Catat setiap pengeluaran, ajak teman gabung cukup pakai link, dan lihat siapa perlu ganti siapa dalam hitungan
          detik.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/login"
            className="rounded-2xl bg-white/90 px-8 py-4 text-lg font-semibold text-brand-blue shadow-lg hover:bg-white"
          >
            Mulai Sekarang
          </Link>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10">
            <span className="text-2xl">💸</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Split otomatis</h3>
          <p className="text-sm text-slate-600">
            Sistem menghitung pembagian biaya secara adil untuk semua peserta berdasarkan leg dan kendaraan yang dipakai.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-coral/10">
            <span className="text-2xl">🚗</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Kelola kendaraan</h3>
          <p className="text-sm text-slate-600">
            Atur siapa duduk di mobil mana, supir mana, dan biaya otomatis dibagi per penumpang atau per leg.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10">
            <span className="text-2xl">💰</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Rupiah & realtime</h3>
          <p className="text-sm text-slate-600">
            Format Rupiah otomatis, mendukung angka desimal, dan saldo langsung update setiap ada pengeluaran baru.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 px-8 py-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Siap mulai perjalanan berikutnya?</h2>
        <p className="mt-2 text-slate-600">Login dengan Google dan buat trip pertamamu dalam hitungan detik.</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-2xl bg-brand-blue px-8 py-3 text-base font-semibold text-white hover:bg-brand-blue/90"
        >
          Masuk Sekarang
        </Link>
      </div>
    </section>
  );
}
