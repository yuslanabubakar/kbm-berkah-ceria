import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { PaymentMethodsDisplay } from "@/components/PaymentMethodsDisplay";
import { TripPaymentManager } from "@/components/TripPaymentManager";
import { VehicleManager } from "@/components/VehicleManager";
import { GenerateReportButton } from "@/components/GenerateReportButton";
import { LegVehicleOverview } from "@/components/LegVehicleOverview";
import { formatRupiah } from "@/lib/formatCurrency";
import { fetchTripDetail } from "@/lib/tripQueries";
import { fetchUserPaymentAccounts } from "@/lib/paymentAccounts";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { notFound } from "next/navigation";

export const revalidate = 0;

function formatRange(start?: string, end?: string) {
  if (!start) return "";
  const startText = format(new Date(start), "d MMM yyyy", { locale: id });
  if (!end) return `${startText} · sedang berjalan`;
  const endText = format(new Date(end), "d MMM yyyy", { locale: id });
  return `${startText} - ${endText}`;
}

export default async function PerjalananDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const detail = await fetchTripDetail(params.id);

  if (!detail) {
    notFound();
  }

  const isOwner = detail.permissions.isOwner;
  const canEdit = detail.permissions.canEdit;
  const userAccounts = isOwner ? await fetchUserPaymentAccounts() : [];

  const total = detail.expenses.reduce(
    (sum, expense) => sum + expense.amountIdr,
    0,
  );
  const lastUpdate = detail.expenses[0]?.date
    ? format(new Date(detail.expenses[0]?.date), "d MMM HH:mm", { locale: id })
    : "-";

  return (
    <section className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            ID perjalanan: {detail.trip.id}
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {detail.trip.nama}
          </h1>
          <p className="text-slate-600">
            {formatRange(detail.trip.tanggalMulai, detail.trip.tanggalSelesai)}{" "}
            · {formatRupiah(total)} · {detail.expenses.length} transaksi
          </p>
          <p className="text-sm text-slate-500">{detail.trip.lokasi}</p>
        </div>
        <GenerateReportButton
          tripId={detail.trip.id}
          tripName={detail.trip.nama}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border bg-white/90 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-400">
                  Rincian peserta
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  Siapa menanggung berapa
                </h2>
              </div>
              <span className="text-sm text-slate-500">
                Saldo = Dibayar - Tanggungan
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {detail.balances.length ? (
                detail.balances.map((saldo) => {
                  const participant = detail.participants.find(
                    (p) => p.id === saldo.participantId,
                  );
                  const isDriver = participant?.isDriver;
                  return (
                    <li
                      key={saldo.participantId}
                      className="flex items-center justify-between"
                    >
                      <p className="font-medium">
                        {saldo.nama}
                        {isDriver && (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            Supir
                          </span>
                        )}
                      </p>
                      <div className="text-right text-sm">
                        <p
                          className={
                            saldo.balance >= 0
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }
                        >
                          {saldo.balance >= 0
                            ? "Menanggung sebesar"
                            : "Perlu bayar"}{" "}
                          {formatRupiah(Math.abs(saldo.balance))}
                        </p>
                        <p className="text-xs text-slate-500">
                          Dibayar {formatRupiah(saldo.totalPaid)} · Porsi{" "}
                          {formatRupiah(saldo.totalShare)}
                        </p>
                        {saldo.adjustments !== 0 && (
                          <p className="text-xs text-indigo-500">
                            Penyesuaian {saldo.adjustments > 0 ? "+" : "-"}{" "}
                            {formatRupiah(Math.abs(saldo.adjustments))}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="text-sm text-slate-500">
                  Belum ada saldo dihitung.
                </li>
              )}
            </ul>
          </div>

          {isOwner && (
            <TripPaymentManager
              tripId={detail.trip.id}
              tripName={detail.trip.nama}
              attachments={detail.paymentAttachments}
              userAccounts={userAccounts}
            />
          )}

          {detail.hostAccounts.length > 0 && (
            <PaymentMethodsDisplay accounts={detail.hostAccounts} />
          )}

          <LegVehicleOverview legs={detail.legs} />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Daftar pengeluaran</h2>
              <span className="text-sm text-slate-500">
                Terakhir diupdate {lastUpdate}
              </span>
            </div>
            <ExpenseList
              tripId={detail.trip.id}
              expenses={detail.expenses}
              participants={detail.participants}
              legs={detail.legs}
              canEdit={canEdit}
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Tambah pengeluaran</h2>
          <p className="text-sm text-slate-500">
            Semua angka otomatis disimpan dalam Rupiah.
          </p>
          <div className="mt-4">
            {canEdit ? (
              <ExpenseForm
                tripId={detail.trip.id}
                participants={detail.participants}
                legs={detail.legs}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-5 text-sm text-slate-600">
                Pengeluaran hanya bisa ditambahkan oleh pembuat perjalanan.
              </div>
            )}
          </div>
        </div>
      </div>

      {isOwner && (
        <VehicleManager
          tripId={detail.trip.id}
          legs={detail.legs}
          participants={detail.participants}
          fleet={detail.fleetVehicles}
        />
      )}
    </section>
  );
}
