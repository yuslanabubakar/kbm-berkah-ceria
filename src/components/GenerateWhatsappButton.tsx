"use client";

import { useState } from "react";
import { MessageCircle, Copy, ExternalLink, Check } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { BalanceRow } from "@/lib/tripQueries";
import { TripPaymentAccountAttachment } from "@/types/expense";
import { formatRupiah } from "@/lib/formatCurrency";
import { useToast } from "@/components/Toast";

type Props = {
  tripName: string;
  startDate: string;
  endDate?: string;
  balances: BalanceRow[];
  accounts: TripPaymentAccountAttachment[];
  onDark?: boolean;
};

function formatDate(dateStr: string) {
  return format(new Date(dateStr), "EEEE, d MMM yyyy", { locale: id });
}

function buildMessage(
  tripName: string,
  startDate: string,
  endDate?: string,
  balances: BalanceRow[] = [],
  accounts: TripPaymentAccountAttachment[] = [],
): string {
  const startFormatted = formatDate(startDate);
  const endFormatted = endDate ? formatDate(endDate) : startFormatted;

  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => `${b.nama}\t- ${formatRupiah(Math.abs(b.balance))}`);

  const billSection =
    debtors.length > 0
      ? debtors.join("\n")
      : "Tidak ada tagihan yang perlu dibayar.";

  const creditors = balances
    .filter((b) => b.balance > 0)
    .map((b) => `${b.nama}\t+ ${formatRupiah(b.balance)}`);

  const creditSection =
    creditors.length > 0
      ? creditors.join("\n")
      : "Tidak ada yang perlu menerima pengembalian.";

  const paymentMethods = accounts.map(
    (acc, i) =>
      `${i + 1}. ${acc.label} (${acc.provider || acc.channel})\n   ${acc.accountNumber} a.n ${acc.accountName}`,
  );

  const paymentSection =
    paymentMethods.length > 0
      ? paymentMethods.join("\n\n")
      : "Belum ada metode pembayaran.";

  return `Bismillaah,
Semangat Pagi Pelanggan ${tripName},

Berikut adalah total tagihan untuk perjalanan Anda bersama kami pada Hari ${startFormatted} s/d Hari ${endFormatted}.

A. TAGIHAN

${billSection}


B. DIBAYARKAN KE

${creditSection}


C. METODE BAYAR

${paymentSection}

Sekian. Semoga berkenan. Terima kasih.

Salam,
Manajemen KBM Berkah Ceria`;
}

export function GenerateWhatsappButton({
  tripName,
  startDate,
  endDate,
  balances,
  accounts,
  onDark = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const showToast = useToast();

  const getMessage = () =>
    buildMessage(tripName, startDate, endDate, balances, accounts);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getMessage());
      setCopied(true);
      showToast("Pesan tagihan berhasil disalin ke clipboard!", "success");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast("Gagal menyalin ke clipboard", "error");
    }
  };

  const handleOpenWa = () => {
    const encoded = encodeURIComponent(getMessage());
    window.open(`https://wa.me/?text=${encoded}`, "_blank", "noreferrer");
  };

  const copyStyle = onDark
    ? {
        background: copied
          ? "rgba(255,255,255,0.30)"
          : "rgba(255,255,255,0.15)",
        color: "#ffffff",
        border: "1px solid rgba(255,255,255,0.35)",
      }
    : {
        background: copied
          ? "rgba(16, 185, 129, 0.15)"
          : "rgba(37, 211, 102, 0.10)",
        color: copied ? "#047857" : "#059669",
        border: `1px solid ${copied ? "rgba(16, 185, 129, 0.4)" : "rgba(37, 211, 102, 0.3)"}`,
      };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
        style={copyStyle}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? "Tersalin!" : "Salin Tagihan"}
      </button>

      {/* Open WhatsApp button */}
      <button
        type="button"
        onClick={handleOpenWa}
        className="btn-wa inline-flex"
      >
        <MessageCircle size={15} />
        Buka WhatsApp
        <ExternalLink size={13} className="opacity-70" />
      </button>
    </div>
  );
}
