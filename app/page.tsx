import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Car,
  Wallet,
  Users,
  FileText,
  Share2,
} from "lucide-react";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Zap,
    title: "Split Otomatis",
    desc: "Sistem menghitung pembagian biaya secara adil berdasarkan leg dan kendaraan yang dipakai.",
    gradient: "from-blue-500 to-ocean-600",
    badge: "⚡ Cerdas",
  },
  {
    icon: Car,
    title: "Kelola Kendaraan",
    desc: "Atur siapa duduk di mobil mana, supir mana, dan biaya dibagi otomatis per penumpang.",
    gradient: "from-emerald-500 to-emerald-600",
    badge: "🚗 Fleksibel",
  },
  {
    icon: Wallet,
    title: "Format Rupiah",
    desc: "Format Rupiah otomatis dengan pembaruan saldo real-time setiap ada pengeluaran baru.",
    gradient: "from-amber-500 to-amber-600",
    badge: "💰 Real-time",
  },
  {
    icon: Users,
    title: "Ajak Lewat Link",
    desc: "Peserta cukup klik link undangan. Tidak perlu daftar akun khusus untuk ikut trip.",
    gradient: "from-coral-500 to-coral-600",
    badge: "🔗 Mudah",
  },
  {
    icon: FileText,
    title: "Laporan PDF",
    desc: "Unduh laporan lengkap trip dalam format PDF untuk dokumentasi atau arsip perjalanan.",
    gradient: "from-brand-blue to-ocean-700",
    badge: "📄 Terstruktur",
  },
  {
    icon: Share2,
    title: "Bagikan ke WhatsApp",
    desc: "Kirim ringkasan tagihan langsung ke WhatsApp group dengan satu ketukan tombol.",
    gradient: "from-emerald-600 to-emerald-700",
    badge: "📲 Instan",
  },
];

export default function PublicHomePage() {
  return (
    <section className="space-y-16">
      {/* ── Hero ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-4xl gradient-hero px-8 py-16 text-white shadow-glow-blue md:px-14 md:py-20">
        {/* Background blobs */}
        <div
          className="absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, #ffffff 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-10 -left-10 h-56 w-56 rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, #FF7B6A 0%, transparent 70%)",
          }}
        />

        <div className="relative">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
            KBM Berkah Ceria
          </span>

          <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">
            Bagi biaya trip
            <br />
            <span className="text-amber-300">jadi gampang</span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-white/85 md:text-lg">
            Catat setiap pengeluaran, ajak teman gabung cukup pakai link, dan
            lihat siapa perlu ganti siapa dalam hitungan detik.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-brand-blue shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              Mulai Sekarang
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all duration-200 hover:bg-white/20"
            >
              Lihat Demo
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-10 flex flex-wrap gap-6 border-t border-white/20 pt-8">
            {[
              { label: "Perjalanan tercatat", value: "40+" },
              { label: "Peserta aktif", value: "200+" },
              { label: "Pengeluaran tercatat", value: "1.6K+" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-extrabold text-white">
                  {stat.value}
                </p>
                <p className="text-xs text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features Grid ──────────────────────────────────── */}
      <div>
        <div className="mb-8 text-center">
          <p
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color: "#2E5AAC" }}
          >
            Fitur Utama
          </p>
          <h2
            className="mt-2 text-2xl font-bold md:text-3xl"
            style={{ color: "var(--text-primary)" }}
          >
            Semua yang kamu butuhkan
          </h2>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Dirancang khusus untuk kelompok perjalanan Indonesia
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc, badge }) => (
            <div
              key={title}
              className="glass-card group rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 cursor-default"
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-soft"
                  style={{
                    background: "linear-gradient(135deg, #2E5AAC, #3b82f6)",
                  }}
                >
                  <Icon size={22} strokeWidth={2} />
                </div>
                <span className="badge badge-blue text-xs">{badge}</span>
              </div>
              <h3
                className="mt-4 text-base font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA Banner ────────────────────────────────────── */}
      <div
        className="rounded-3xl p-8 text-center md:p-12"
        style={{
          background: "var(--bg-muted)",
          border: "1px solid var(--border-color)",
        }}
      >
        <h2
          className="text-2xl font-bold md:text-3xl"
          style={{ color: "var(--text-primary)" }}
        >
          Siap mulai perjalanan berikutnya?
        </h2>
        <p
          className="mt-3 text-sm md:text-base"
          style={{ color: "var(--text-secondary)" }}
        >
          Login dengan Google dan buat trip pertamamu dalam hitungan detik.
        </p>
        <Link href="/login" className="btn-primary mt-6 inline-flex">
          Masuk Sekarang
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
