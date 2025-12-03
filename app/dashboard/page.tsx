import Link from "next/link";
import { TripCard } from "@/components/TripCard";
import { TripPaymentManager } from "@/components/TripPaymentManager";
import { TripShareManager } from "@/components/TripShareManager";
import { fetchTripsSummary } from "@/lib/tripQueries";

export const revalidate = 0;

export default async function DashboardPage() {
  const trips = await fetchTripsSummary();
  const ownerTrips = trips.filter((trip) => trip.isOwner);

  return (
    <section className="space-y-10">
      <div className="rounded-3xl bg-gradient-to-r from-brand-blue to-brand-coral px-8 py-12 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-white/80">KBM Berkah Ceria</p>
        <h1 className="mt-2 text-4xl font-bold">Bagi biaya trip jadi gampang</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/90">
          Catat setiap pengeluaran, ajak teman gabung cukup pakai link, dan lihat siapa perlu ganti siapa dalam hitungan detik.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/perjalanan/baru"
            className="rounded-2xl bg-white/90 px-6 py-3 text-base font-semibold text-brand-blue shadow"
          >
            + Buat perjalanan
          </Link>
        </div>
      </div>

      {ownerTrips.length > 0 && (
        <>
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">Bagikan Trip</h2>
            <div className="space-y-4">
              {ownerTrips.map((trip) => (
                <TripShareManager
                  key={`share-${trip.id}`}
                  tripId={trip.id}
                  tripName={trip.nama}
                  shares={trip.shares}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">Kelola Metode Pembayaran</h2>
            <div className="space-y-4">
              {ownerTrips.map((trip) => (
                <TripPaymentManager
                  key={trip.id}
                  tripId={trip.id}
                  tripName={trip.nama}
                  accounts={trip.hostAccounts}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">Perjalanan aktif</h2>
          <p className="text-sm text-slate-500">Format Rupiah otomatis, realtime.</p>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {trips.length ? (
            trips.map((trip) => <TripCard key={trip.id} trip={trip} />)
          ) : (
            <p className="text-sm text-slate-500">Belum ada perjalanan. Yuk buat yang pertama!</p>
          )}
        </div>
      </div>
    </section>
  );
}
