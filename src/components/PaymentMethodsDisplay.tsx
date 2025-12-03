"use client";

import { HostPaymentAccount } from "@/types/expense";
import { useState } from "react";

const channelLabels: Record<HostPaymentAccount["channel"], string> = {
  bank: "Bank Transfer",
  ewallet: "E-Wallet",
  cash: "Tunai",
  other: "Lainnya"
};

export function PaymentMethodsDisplay({ accounts }: { accounts: HostPaymentAccount[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border bg-white/90 p-6 shadow-sm">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">Cara pembayaran</p>
          <h2 className="text-xl font-semibold text-slate-900">Metode pembayaran</h2>
        </div>
        <p className="mt-4 text-sm text-slate-500">Belum ada metode pembayaran yang ditambahkan.</p>
      </div>
    );
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="rounded-2xl border bg-white/90 p-6 shadow-sm">
      <div>
        <p className="text-sm uppercase tracking-wide text-slate-400">Cara pembayaran</p>
        <h2 className="text-xl font-semibold text-slate-900">Metode pembayaran</h2>
      </div>
      <div className="mt-4 space-y-3">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{account.label}</h3>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {channelLabels[account.channel]}
                  </span>
                </div>
                {account.provider && (
                  <p className="mt-1 text-sm text-slate-600">{account.provider}</p>
                )}
                <p className="mt-1 text-sm font-medium text-slate-900">
                  a.n. {account.accountName}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="rounded bg-white px-2 py-1 text-sm font-mono text-slate-800">
                    {account.accountNumber}
                  </code>
                  <button
                    onClick={() => handleCopy(account.accountNumber, account.id)}
                    className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    {copiedId === account.id ? "✓ Tersalin" : "Salin"}
                  </button>
                </div>
                {account.instructions && (
                  <p className="mt-2 text-sm text-slate-600 italic">{account.instructions}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
