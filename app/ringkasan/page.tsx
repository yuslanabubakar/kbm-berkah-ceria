import { formatRupiah } from "@/lib/formatCurrency";
import { fetchCommunityStats } from "@/lib/tripQueries";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function RingkasanPage() {
  const stats = await fetchCommunityStats();

  return (
    <section className="space-y-10">
      <header>
        <p className="text-sm text-slate-500">
          Insight untuk seluruh perjalanan
        </p>
        <h1 className="text-3xl font-bold text-slate-900">
          Ringkasan komunitas
        </h1>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border bg-white/90 p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total perjalanan</p>
          <p className="text-3xl font-semibold">{stats.totalTrip}</p>
        </div>
        <div className="rounded-2xl border bg-white/90 p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total keikutsertaan</p>
          <p className="text-3xl font-semibold">{stats.totalPeserta}</p>
        </div>
        <div className="rounded-2xl border bg-white/90 p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total Rupiah dikelola</p>
          <p className="text-3xl font-semibold text-brand-blue">
            {formatRupiah(stats.totalPengeluaran)}
          </p>
        </div>
      </div>
    </section>
  );
}
