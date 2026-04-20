import { CreateTripForm } from "@/components/CreateTripForm";

export const runtime = "edge";
export const revalidate = 0;

export default function PerjalananBaruPage() {
  return (
    <section className="space-y-8">
      <div className="rounded-3xl bg-brand-blue/10 p-6 text-brand-blue">
        <p className="text-sm font-semibold uppercase tracking-wide">
          Buat perjalanan
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Perjalanan baru
        </h1>
        <p className="text-slate-600">
          Isi detail dasar, daftar peserta, dan supir. Setelah tersimpan kamu
          bisa langsung menambahkan pengeluaran dan penyesuaian lainnya.
        </p>
      </div>
      <CreateTripForm />
    </section>
  );
}
