"use client";

import { useState } from "react";
import type { HostPaymentAccount } from "@/types/expense";

type Props = {
  tripId: string;
  accounts: HostPaymentAccount[];
  onUpdate: () => void;
  onEdit: (account: HostPaymentAccount) => void;
};

export function PaymentAccountsList({ tripId, accounts, onUpdate, onEdit }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(accountId: string) {
    if (!confirm("Yakin ingin menghapus metode pembayaran ini?")) {
      return;
    }

    setDeleting(accountId);
    try {
      const response = await fetch(`/api/trips/${tripId}/host-accounts/${accountId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Gagal menghapus");
      }

      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setDeleting(null);
    }
  }

  function getChannelLabel(channel: string) {
    const labels: Record<string, string> = {
      bank: "Bank",
      ewallet: "E-Wallet",
      cash: "Tunai",
      other: "Lainnya"
    };
    return labels[channel] || channel;
  }

  function getChannelIcon(channel: string) {
    const icons: Record<string, string> = {
      bank: "🏦",
      ewallet: "💳",
      cash: "💵",
      other: "📱"
    };
    return icons[channel] || "💰";
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-500">Belum ada metode pembayaran. Tambahkan yang pertama di atas.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {accounts.map((account) => (
        <div
          key={account.id}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{getChannelIcon(account.channel)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{account.label}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {getChannelLabel(account.channel)}
                  </span>
                  {account.priority > 0 && (
                    <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs text-brand-blue">
                      Prioritas {account.priority}
                    </span>
                  )}
                </div>
                {account.provider && (
                  <p className="mt-1 text-xs text-slate-500">{account.provider}</p>
                )}
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">A/n:</span> {account.accountName}
                  </p>
                  <p className="text-sm font-mono text-slate-900">{account.accountNumber}</p>
                </div>
                {account.instructions && (
                  <p className="mt-2 text-xs text-slate-600 italic">
                    ℹ️ {account.instructions}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(account)}
                className="text-sm text-brand-blue hover:text-brand-blue/80"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(account.id)}
                disabled={deleting === account.id}
                className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                {deleting === account.id ? "..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
