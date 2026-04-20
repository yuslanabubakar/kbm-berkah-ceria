import { formatRupiah } from "@/lib/formatCurrency";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const ringkasan = {
  totalTrip: 6,
  peserta: 18,
  totalPengeluaran: 44125000,
  rekomendasi: [
    { dari: "Agus", ke: "Dita", amount: 450000 },
    { dari: "Rina", ke: "Agus", amount: 275000 },
  ],
};

export default function RingkasanPage() {
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
          <p className="text-3xl font-semibold">{ringkasan.totalTrip}</p>
        </div>
        <div className="rounded-2xl border bg-white/90 p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total peserta</p>
          <p className="text-3xl font-semibold">{ringkasan.peserta}</p>
        </div>
        <div className="rounded-2xl border bg-white/90 p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total Rupiah dikelola</p>
          <p className="text-3xl font-semibold text-brand-blue">
            {formatRupiah(ringkasan.totalPengeluaran)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white/90 p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Rekomendasi pelunasan</h2>
        <p className="text-sm text-slate-500">
          Cukup selesaikan transfer sesuai daftar ini.
        </p>
        <ul className="mt-4 space-y-3">
          {ringkasan.rekomendasi.map((item) => (
            <li
              key={`${item.dari}-${item.ke}`}
              className="flex items-center justify-between rounded-xl border px-4 py-3"
            >
              <p>
                <span className="font-semibold">{item.dari}</span> →{" "}
                <span className="font-semibold">{item.ke}</span>
              </p>
              <p className="font-semibold text-brand-blue">
                {formatRupiah(item.amount)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
