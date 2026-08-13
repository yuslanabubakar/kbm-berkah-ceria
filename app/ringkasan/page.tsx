import { formatRupiah } from "@/lib/formatCurrency";
import { fetchCommunityStats } from "@/lib/tripQueries";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function RingkasanPage() {
  const stats = await fetchCommunityStats();

  return (
    <section className="space-y-10">
      <header>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Insight untuk seluruh perjalanan
        </p>
        <h1
          className="mt-1 text-3xl font-extrabold"
          style={{ color: "var(--text-primary)" }}
        >
          Ringkasan Komunitas
        </h1>
      </header>

      <div className="grid gap-5 md:grid-cols-3">
        {/* Total Trip */}
        <div
          className="glass-card rounded-3xl p-6"
          style={{ borderLeft: "3px solid #2E5AAC" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "#2E5AAC" }}
          >
            Total perjalanan
          </p>
          <p
            className="mt-2 text-4xl font-extrabold"
            style={{ color: "var(--text-primary)" }}
          >
            {stats.totalTrip}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Trip yang tercatat
          </p>
        </div>

        {/* Total Peserta */}
        <div
          className="glass-card rounded-3xl p-6"
          style={{ borderLeft: "3px solid #10b981" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "#10b981" }}
          >
            Total keikutsertaan
          </p>
          <p
            className="mt-2 text-4xl font-extrabold"
            style={{ color: "var(--text-primary)" }}
          >
            {stats.totalPeserta}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Peserta yang ikut
          </p>
        </div>

        {/* Total Rupiah */}
        <div
          className="glass-card rounded-3xl p-6"
          style={{ borderLeft: "3px solid #f59e0b" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "#f59e0b" }}
          >
            Total Rupiah dikelola
          </p>
          <p
            className="mt-2 text-3xl font-extrabold"
            style={{ color: "#2E5AAC" }}
          >
            {formatRupiah(stats.totalPengeluaran)}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Semua pengeluaran
          </p>
        </div>
      </div>
    </section>
  );
}
