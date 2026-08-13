import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { PaymentMethodsDisplay } from "@/components/PaymentMethodsDisplay";
import { TripPaymentManager } from "@/components/TripPaymentManager";
import { VehicleManager } from "@/components/VehicleManager";
import { GenerateReportButton } from "@/components/GenerateReportButton";
import { GenerateWhatsappButton } from "@/components/GenerateWhatsappButton";
import { LegVehicleOverview } from "@/components/LegVehicleOverview";
import { ParticipantManager } from "@/components/ParticipantManager";
import { formatRupiah } from "@/lib/formatCurrency";
import { fetchTripDetail } from "@/lib/tripQueries";
import { fetchUserPaymentAccounts } from "@/lib/paymentAccounts";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { notFound } from "next/navigation";
import { MapPin, Calendar, Receipt } from "lucide-react";

export const runtime = "edge";
export const revalidate = 0;

function formatRange(start?: string, end?: string) {
  if (!start) return "";
  const startText = format(new Date(start), "d MMM yyyy", { locale: id });
  if (!end) return `${startText} · sedang berjalan`;
  const endText = format(new Date(end), "d MMM yyyy", { locale: id });
  return `${startText} – ${endText}`;
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
    <section className="space-y-8">
      {/* ── Header ── */}
      <div
        className="rounded-3xl p-6 md:p-8"
        style={{
          background:
            "linear-gradient(135deg, #1e3a8a 0%, #2E5AAC 60%, #3b82f6 100%)",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="text-white">
            <div className="flex flex-wrap items-center gap-2 text-xs text-blue-200">
              {detail.trip.lokasi && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {detail.trip.lokasi}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatRange(
                  detail.trip.tanggalMulai,
                  detail.trip.tanggalSelesai,
                )}
              </span>
              <span className="flex items-center gap-1">
                <Receipt size={12} />
                {detail.expenses.length} transaksi
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold md:text-3xl">
              {detail.trip.nama}
            </h1>
            <p className="mt-1 text-2xl font-bold text-amber-300">
              {formatRupiah(total)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <GenerateWhatsappButton
              tripName={detail.trip.nama}
              startDate={detail.trip.tanggalMulai}
              endDate={detail.trip.tanggalSelesai}
              balances={detail.balances}
              accounts={detail.paymentAttachments}
              onDark
            />
            <GenerateReportButton
              tripId={detail.trip.id}
              tripName={detail.trip.nama}
              onDark
            />
          </div>
        </div>
      </div>

      {/* ── Content Grid ── */}
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {/* Balance Card */}
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Rincian peserta
                </p>
                <h2
                  className="mt-0.5 text-lg font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Siapa menanggung berapa
                </h2>
              </div>
              <span className="badge badge-gray text-[10px]">
                Saldo = Dibayar - Porsi
              </span>
            </div>

            <ul className="space-y-3">
              {detail.balances.length ? (
                detail.balances.map((saldo) => {
                  const participant = detail.participants.find(
                    (p) => p.id === saldo.participantId,
                  );
                  const isDriver = participant?.isDriver;
                  return (
                    <li
                      key={saldo.participantId}
                      className="flex items-center justify-between rounded-xl p-3"
                      style={{ background: "var(--bg-muted)" }}
                    >
                      <p
                        className="font-semibold text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {saldo.nama}
                        {isDriver && (
                          <span className="ml-2 badge badge-blue text-[10px]">
                            Supir
                          </span>
                        )}
                      </p>
                      <div className="text-right text-sm">
                        <p
                          className="font-bold"
                          style={{
                            color: saldo.balance >= 0 ? "#059669" : "#e11d48",
                          }}
                        >
                          {saldo.balance >= 0 ? "Menanggung" : "Perlu bayar"}{" "}
                          {formatRupiah(Math.abs(saldo.balance))}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Dibayar {formatRupiah(saldo.totalPaid)} · Porsi{" "}
                          {formatRupiah(saldo.totalShare)}
                        </p>
                        {saldo.adjustments !== 0 && (
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "#6366f1" }}
                          >
                            Penyesuaian {saldo.adjustments > 0 ? "+" : "-"}{" "}
                            {formatRupiah(Math.abs(saldo.adjustments))}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="text-sm" style={{ color: "var(--text-muted)" }}>
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2
                className="text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Daftar Pengeluaran
              </h2>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Update terakhir {lastUpdate}
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

        {/* Sidebar */}
        <div className="space-y-6">
          {canEdit && (
            <div>
              <h2
                className="mb-1 text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Tambah Pengeluaran
              </h2>
              <p
                className="mb-4 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Semua angka disimpan dalam Rupiah.
              </p>
              <ExpenseForm
                tripId={detail.trip.id}
                participants={detail.participants}
                legs={detail.legs}
              />
            </div>
          )}

          {!canEdit && (
            <div
              className="rounded-3xl p-5 text-sm"
              style={{
                background: "var(--bg-muted)",
                border: "1px dashed var(--border-strong)",
                color: "var(--text-secondary)",
              }}
            >
              Pengeluaran hanya bisa ditambahkan oleh pembuat perjalanan.
            </div>
          )}

          {isOwner && (
            <ParticipantManager
              tripId={detail.trip.id}
              participants={detail.participants}
            />
          )}
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
