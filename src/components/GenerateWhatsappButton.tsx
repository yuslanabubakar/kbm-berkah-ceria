"use client";

import { useState } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { BalanceRow } from "@/lib/tripQueries";
import { TripPaymentAccountAttachment } from "@/types/expense";
import { formatRupiah } from "@/lib/formatCurrency";

type Props = {
  tripName: string;
  startDate: string;
  endDate?: string;
  balances: BalanceRow[];
  accounts: TripPaymentAccountAttachment[];
};

function formatDate(dateStr: string) {
  return format(new Date(dateStr), "EEEE, d MMM yyyy", { locale: id });
}

export function GenerateWhatsappButton({
  tripName,
  startDate,
  endDate,
  balances,
  accounts,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // 1. Format Dates
    const startFormatted = formatDate(startDate);
    const endFormatted = endDate ? formatDate(endDate) : startFormatted;

    // 2. Format Bill (Positive balances only = those who need to pay)
    // The user requested "TAGIHAN", typically meaning those who owe money.
    // In the app logic: balance < 0 means "Perlu bayar" (Owe), balance > 0 means "Menanggung" (Owed).
    // Wait, let's check Page.tsx logic:
    // balance >= 0 ? "Menanggung sebesar" : "Perlu bayar"
    // So negative balance = User needs to pay system/others.
    // BUT usually a bill is for people who need to PAY.
    // Let's filter for balance < 0 (Perlu bayar).
    // The previous request example showed "person 1 - Rp. xxx".

    // Let's double check the balances logic from page.tsx:
    // saldo.balance >= 0 ? "Menanggung sebesar" : "Perlu bayar"
    // So if I am negative, I need to pay.
    const debtors = balances
      .filter((b) => b.balance < 0)
      .map((b) => {
        // Remove minus sign for display
        const amount = formatRupiah(Math.abs(b.balance));
        return `${b.nama}\t- ${amount}`;
      });

    const billSection =
      debtors.length > 0
        ? debtors.join("\n")
        : "Tidak ada tagihan yang perlu dibayar.";

    // 3. Format Creditors (Positive balances = those who receive money)
    const creditors = balances
      .filter((b) => b.balance > 0)
      .map((b) => {
        const amount = formatRupiah(b.balance);
        return `${b.nama}\t+ ${amount}`;
      });

    const creditSection =
      creditors.length > 0
        ? creditors.join("\n")
        : "Tidak ada yang perlu menerima pengembalian.";

    // 4. Format Payment Methods
    const paymentMethods = accounts.map((acc, index) => {
      const bankName = acc.provider || acc.channel; // e.g. "BCA", "GoPay"
      const number = acc.accountNumber;
      const name = acc.accountName;
      // Format: 1. BCA - 123456 a.n Name
      return `${index + 1}. ${acc.label} (${bankName})\n   ${number} a.n ${name}`;
    });

    const paymentSection =
      paymentMethods.length > 0
        ? paymentMethods.join("\n\n")
        : "Belum ada metode pembayaran.";

    // 5. Construct Message
    const text = `Bismillaah,
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

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Optional: Open WhatsApp with the text pre-filled?
      // const encoded = encodeURIComponent(text);
      // window.open(`https://wa.me/?text=${encoded}`, "_blank");
      // For now just copy is safer and often preferred for "checking before sending".
    } catch (err) {
      console.error("Failed to copy", err);
      alert("Gagal menyalin ke clipboard");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={clsx(
        "inline-flex items-center gap-2 rounded-2xl border border-emerald-600 px-4 py-2 text-sm font-semibold",
        "text-emerald-600 hover:bg-emerald-50 transition-colors",
        copied && "bg-emerald-100 text-emerald-800",
      )}
    >
      <span className="text-lg">💬</span>
      {copied ? "Tersalin!" : "Salin Tagihan WA"}
    </button>
  );
}
