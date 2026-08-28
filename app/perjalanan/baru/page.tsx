import { CreateTripForm } from "@/components/CreateTripForm";

export const runtime = "edge";
export const revalidate = 0;

export default function PerjalananBaruPage() {
  return (
    <section className="space-y-6">
      <div
        className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(46, 90, 172, 0.15) 0%, rgba(255, 123, 106, 0.08) 100%)",
        }}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Buat Perjalanan
        </p>
        <h1
          className="mt-2 text-2xl sm:text-3xl font-extrabold"
          style={{ color: "var(--text-primary)" }}
        >
          Perjalanan baru
        </h1>
        <p
          className="mt-1.5 text-sm max-w-2xl"
          style={{ color: "var(--text-secondary)" }}
        >
          Isi detail dasar, daftar peserta, dan supir. Setelah tersimpan kamu
          bisa langsung menambahkan pengeluaran dan penyesuaian lainnya.
        </p>
      </div>
      <CreateTripForm />
    </section>
  );
}
