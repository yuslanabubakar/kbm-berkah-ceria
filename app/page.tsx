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
import { fetchCommunityStats } from "@/lib/tripQueries";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Zap,
    title: "Split Otomatis",
    desc: "Sistem menghitung pembagian biaya secara adil berdasarkan leg dan kendaraan yang dipakai.",
    badge: "Cerdas",
  },
  {
    icon: Car,
    title: "Kelola Kendaraan",
    desc: "Atur siapa duduk di mobil mana, supir mana, dan biaya dibagi otomatis per penumpang.",
    badge: "Fleksibel",
  },
  {
    icon: Wallet,
    title: "Format Rupiah",
    desc: "Format Rupiah otomatis dengan pembaruan saldo real-time setiap ada pengeluaran baru.",
    badge: "Real-time",
  },
  {
    icon: Users,
    title: "Ajak Lewat Link",
    desc: "Peserta cukup klik link undangan. Tidak perlu daftar akun khusus untuk ikut trip.",
    badge: "Mudah",
  },
  {
    icon: FileText,
    title: "Laporan PDF",
    desc: "Unduh laporan lengkap trip dalam format PDF untuk dokumentasi atau arsip perjalanan.",
    badge: "Terstruktur",
  },
  {
    icon: Share2,
    title: "Bagikan ke WhatsApp",
    desc: "Kirim ringkasan tagihan langsung ke WhatsApp group dengan satu ketukan tombol.",
    badge: "Instan",
  },
];

export default async function PublicHomePage() {
  const stats = await fetchCommunityStats().catch(() => null);
  const heroStats = [
    {
      label: "Perjalanan tercatat",
      value: stats ? `${stats.totalTrip}` : "40+",
    },
    {
      label: "Peserta unik",
      value: stats ? `${stats.uniquePesertaCount}` : "200+",
    },
    {
      label: "Armada terdaftar",
      value: stats ? `${stats.totalVehicles}` : "50+",
    },
  ];

  return (
    <section className="space-y-16 md:space-y-20">
      {/* ── Hero ─────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-4xl gradient-hero text-white"
        style={{ boxShadow: "0 6px 0 var(--ledge-brand)" }}
      >
        <div className="relative px-7 pb-0 pt-12 md:px-12 md:py-16">
          <div className="relative z-10 md:max-w-[50%]">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-white/25 bg-white/15 px-3 py-1 font-display text-[11px] font-extrabold uppercase tracking-[0.08em] text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFE0A3] animate-pulse-soft" />
              KBM Berkah Ceria
            </span>

            <h1 className="mt-5 text-4xl font-black leading-[1.08] md:text-[3.5rem]">
              Bagi biaya trip
              <br />
              <span className="text-[#FFE0A3]">jadi gampang</span>
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-white/85 md:text-lg">
              Catat setiap pengeluaran, ajak teman gabung cukup pakai link, dan
              lihat siapa perlu ganti siapa dalam hitungan detik.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white bg-white px-4 sm:px-6 py-3.5 font-display text-sm font-black tracking-wide text-brand-blue transition-all duration-150 hover:brightness-105 active:translate-y-[3px] active:shadow-none"
                style={{ boxShadow: "0 4px 0 #1A3A75" }}
              >
                Mulai Sekarang
                <ArrowRight size={16} strokeWidth={3} />
              </Link>
              <Link
                href="/ringkasan"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/35 bg-white/10 px-4 sm:px-6 py-3.5 font-display text-sm font-extrabold tracking-wide text-white transition-all duration-150 hover:bg-white/20 active:translate-y-[3px]"
              >
                Lihat Ringkasan
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border-2 border-white/20 bg-white/10 px-3 py-3"
                >
                  <p className="font-display text-2xl font-black text-white md:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold leading-tight text-white/75 md:text-xs">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Illustration */}
          <div className="hero-illustration relative -mx-7 mt-4 md:absolute md:bottom-0 md:right-0 md:mx-0 md:mt-0 md:w-[58%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/hero-route.svg"
              alt=""
              aria-hidden="true"
              width={560}
              height={400}
              className="block h-auto w-full select-none"
              draggable={false}
            />
          </div>
        </div>
      </div>

      {/* ── Features Grid ──────────────────────────────────── */}
      <div>
        <div className="mb-10 flex flex-col items-center text-center">
          <span className="eyebrow">Fitur Utama</span>
          <h2
            className="mt-4 text-3xl font-black md:text-4xl"
            style={{ color: "var(--text-primary)" }}
          >
            Semua yang kamu butuhkan
          </h2>
          <p
            className="mt-3 max-w-md text-base"
            style={{ color: "var(--text-secondary)" }}
          >
            Dirancang khusus untuk kelompok perjalanan Indonesia
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc, badge }, index) => (
            <div
              key={title}
              className="glass-card group cursor-default rounded-3xl p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[color:var(--border-strong)]"
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    background: "var(--brand-soft)",
                    color: "var(--brand-ink)",
                    border: "2px solid var(--border-color)",
                    boxShadow: "0 3px 0 var(--ledge)",
                  }}
                >
                  <Icon size={22} strokeWidth={2.4} />
                </div>
                <span
                  className="font-display text-xs font-black tracking-[0.08em]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {String(index + 1).padStart(2, "0")} · {badge.toUpperCase()}
                </span>
              </div>
              <h3
                className="mt-5 text-lg font-extrabold"
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
        className="relative overflow-hidden rounded-4xl p-8 md:p-12"
        style={{
          background: "var(--brand-soft)",
          border: "2px solid var(--border-color)",
          boxShadow: "0 4px 0 var(--ledge)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage: "url(/brand/doodles.svg)",
            backgroundSize: "320px 320px",
          }}
        />
        <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <span className="eyebrow">Perjalanan berikutnya</span>
            <h2
              className="mt-4 text-2xl font-black md:text-3xl"
              style={{ color: "var(--text-primary)" }}
            >
              Siap mulai perjalanan berikutnya?
            </h2>
            <p
              className="mt-2 text-sm md:text-base"
              style={{ color: "var(--text-secondary)" }}
            >
              Login dengan Google dan buat trip pertamamu dalam hitungan detik.
            </p>
          </div>
          <Link href="/login" className="btn-primary shrink-0 px-6 py-3.5">
            Masuk Sekarang
            <ArrowRight size={16} strokeWidth={3} />
          </Link>
        </div>
      </div>
    </section>
  );
}
