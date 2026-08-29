import { GenerateReportButton } from "@/components/GenerateReportButton";
import { GenerateWhatsappButton } from "@/components/GenerateWhatsappButton";
import { TripDetailTabs } from "@/components/TripDetailTabs";
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
  const userAccounts = isOwner ? await fetchUserPaymentAccounts() : [];

  const total = detail.expenses.reduce(
    (sum, expense) => sum + expense.amountIdr,
    0,
  );
  const lastUpdate = detail.expenses[0]?.date
    ? format(new Date(detail.expenses[0]?.date), "d MMM HH:mm", { locale: id })
    : "-";

  return (
    <section className="space-y-6">
      {/* ── Header Card ── */}
      <div
        className="rounded-3xl p-6 md:p-8 shadow-xl"
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

      {/* ── Tabbed Dashboard Layout ── */}
      <TripDetailTabs
        detail={detail}
        userAccounts={userAccounts}
        lastUpdateText={lastUpdate}
      />
    </section>
  );
}
