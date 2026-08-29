import Link from "next/link";
import { formatRupiah } from "@/lib/formatCurrency";
import { fetchCommunityStats } from "@/lib/tripQueries";
import { CommunityTripLedger } from "@/components/CommunityTripLedger";
import {
  Map,
  Users,
  CreditCard,
  Car,
  TrendingUp,
  ArrowRight,
  PieChart,
  Sparkles,
} from "lucide-react";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function RingkasanPage() {
  const stats = await fetchCommunityStats();

  return (
    <section className="space-y-8 animate-fade-in pb-12">
      {/* ── Header Banner ────────────────────────────────────────────────── */}
      <div
        className="rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl"
        style={{
          background:
            "linear-gradient(135deg, #1e3a8a 0%, #2E5AAC 50%, #3b82f6 100%)",
        }}
      >
        <div className="relative z-10 text-white space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>KBM Berkah Ceria Analytics</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ringkasan & Statistik Komunitas
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
              Pantau akumulasi biaya, tren pengeluaran, partisipasi anggota, dan
              rekam jejak seluruh perjalanan secara transparan.
            </p>
          </div>

          {/* Quick Stat Badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/20 text-xs font-medium border border-white/10">
              <Map className="w-3.5 h-3.5 text-blue-300" />
              <span>{stats.totalTrip} Perjalanan</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/20 text-xs font-medium border border-white/10">
              <Users className="w-3.5 h-3.5 text-emerald-300" />
              <span>{stats.uniquePesertaCount} Peserta Unik</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/20 text-xs font-medium border border-white/10">
              <Car className="w-3.5 h-3.5 text-amber-300" />
              <span>{stats.totalVehicles} Armada Mobil</span>
            </span>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-2xl" />
      </div>

      {/* ── KPI Metrik Grid (4 Cards) ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {/* Total Rupiah */}
        <div
          className="glass-card rounded-3xl p-4 sm:p-5 flex flex-col justify-between"
          style={{ borderLeft: "4px solid #2E5AAC" }}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Total Rupiah
              </span>
              <CreditCard className="w-4 h-4 text-blue-500" />
            </div>
            <p
              className="mt-2 text-lg sm:text-2xl font-extrabold truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {formatRupiah(stats.totalPengeluaran)}
            </p>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 font-medium">
            Rata-rata: {formatRupiah(stats.avgPengeluaranPerTrip)} / trip
          </p>
        </div>

        {/* Total Perjalanan */}
        <div
          className="glass-card rounded-3xl p-4 sm:p-5 flex flex-col justify-between"
          style={{ borderLeft: "4px solid #3b82f6" }}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Perjalanan
              </span>
              <Map className="w-4 h-4 text-indigo-500" />
            </div>
            <p
              className="mt-2 text-lg sm:text-2xl font-extrabold"
              style={{ color: "var(--text-primary)" }}
            >
              {stats.totalTrip}{" "}
              <span className="text-xs font-semibold text-slate-400">Trip</span>
            </p>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 font-medium truncate">
            {stats.activeTripCount} Aktif · {stats.finishedTripCount} Selesai
          </p>
        </div>

        {/* Total Partisipasi */}
        <div
          className="glass-card rounded-3xl p-4 sm:p-5 flex flex-col justify-between"
          style={{ borderLeft: "4px solid #10b981" }}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Partisipasi
              </span>
              <Users className="w-4 h-4 text-emerald-500" />
            </div>
            <p
              className="mt-2 text-lg sm:text-2xl font-extrabold"
              style={{ color: "var(--text-primary)" }}
            >
              {stats.totalPeserta}{" "}
              <span className="text-xs font-semibold text-slate-400">
                Kursi
              </span>
            </p>
          </div>
          <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
            {stats.uniquePesertaCount} Anggota Unik
          </p>
        </div>

        {/* Biaya per Orang */}
        <div
          className="glass-card rounded-3xl p-4 sm:p-5 flex flex-col justify-between"
          style={{ borderLeft: "4px solid #f59e0b" }}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Rata-rata Biaya
              </span>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <p
              className="mt-2 text-lg sm:text-2xl font-extrabold truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {formatRupiah(stats.avgPengeluaranPerPeserta)}
            </p>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 font-medium">
            Per orang per perjalanan
          </p>
        </div>
      </div>

      {/* ── Distribusi Kategori Pengeluaran ───────────────────────────────── */}
      <div className="glass-card rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-base sm:text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Distribusi Kategori Pengeluaran
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Proporsi alokasi pengeluaran dana komunitas
              </p>
            </div>
          </div>

          <span className="badge badge-amber text-xs font-bold py-1 px-2.5">
            {stats.categoryBreakdown.length} Kategori
          </span>
        </div>

        {stats.categoryBreakdown.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[var(--bg-muted)] text-xs text-slate-400">
            Belum ada data pengeluaran yang tercatat di sistem.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual Multi-Segment Progress Bar */}
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
              {stats.categoryBreakdown.map((cat) => (
                <div
                  key={cat.categoryId}
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color,
                  }}
                  className="h-full transition-all hover:opacity-80"
                  title={`${cat.label}: ${cat.percentage}% (${formatRupiah(cat.totalAmount)})`}
                />
              ))}
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {stats.categoryBreakdown.map((cat) => (
                <div
                  key={cat.categoryId}
                  className="p-3 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-1 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold truncate text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <span>{cat.emoji}</span>
                      <span className="truncate">{cat.label}</span>
                    </span>
                    <span
                      className="text-[11px] font-extrabold shrink-0"
                      style={{ color: cat.color }}
                    >
                      {cat.percentage}%
                    </span>
                  </div>

                  <p
                    className="text-xs sm:text-sm font-extrabold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {formatRupiah(cat.totalAmount)}
                  </p>

                  <p className="text-[10px] text-slate-400">
                    {cat.count} nota transaksi
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Rekapitulasi Riwayat Perjalanan (Interactive Ledger) ─────────── */}
      <div className="glass-card rounded-3xl p-5 sm:p-7 space-y-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Map className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-base sm:text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Rekapitulasi Riwayat Perjalanan
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Pencarian, filter status, dan pagination riwayat trip
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Buka Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <CommunityTripLedger trips={stats.tripList} />
      </div>
    </section>
  );
}
