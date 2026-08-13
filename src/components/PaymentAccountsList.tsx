"use client";

import { useState } from "react";
import type { UserPaymentAccount } from "@/types/expense";
import { Pencil, Trash2, Star } from "lucide-react";
import { useToast } from "@/components/Toast";

type Props = {
  accounts: UserPaymentAccount[];
  onDelete: (accountId: string) => void;
  onEdit: (account: UserPaymentAccount) => void;
};

function getChannelEmoji(channel: string) {
  const icons: Record<string, string> = {
    bank: "🏦",
    ewallet: "💳",
    cash: "💵",
    other: "📱",
  };
  return icons[channel] || "💰";
}

function getChannelLabel(channel: string) {
  const labels: Record<string, string> = {
    bank: "Bank",
    ewallet: "E-Wallet",
    cash: "Tunai",
    other: "Lainnya",
  };
  return labels[channel] || channel;
}

export function PaymentAccountsList({ accounts, onDelete, onEdit }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const showToast = useToast();

  async function handleDelete(accountId: string) {
    if (!confirm("Yakin ingin menghapus metode pembayaran ini?")) return;
    setDeleting(accountId);
    try {
      const response = await fetch(`/api/payment-accounts/${accountId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Gagal menghapus");
      onDelete(accountId);
      showToast("Metode pembayaran dihapus", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Terjadi kesalahan",
        "error",
      );
    } finally {
      setDeleting(null);
    }
  }

  if (accounts.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: "var(--bg-muted)",
          border: "1px dashed var(--border-strong)",
        }}
      >
        <p className="text-2xl mb-2">💳</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Belum ada metode pembayaran. Tambahkan yang pertama!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {accounts.map((account) => (
        <div
          key={account.id}
          className="rounded-2xl p-4 transition-all hover:-translate-y-0.5"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 2px 8px var(--shadow-color)",
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <span className="text-xl mt-0.5">
                {getChannelEmoji(account.channel)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3
                    className="font-semibold text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {account.label}
                  </h3>
                  <span className="badge badge-gray text-[10px]">
                    {getChannelLabel(account.channel)}
                  </span>
                  {account.priority > 0 && (
                    <span className="badge badge-amber text-[10px]">
                      <Star size={9} />
                      Prioritas {account.priority}
                    </span>
                  )}
                </div>
                {account.provider && (
                  <p
                    className="mt-0.5 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {account.provider}
                  </p>
                )}
                <p
                  className="mt-1 text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  a.n. {account.accountName}
                </p>
                <p
                  className="mt-1 font-mono text-sm font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {account.accountNumber}
                </p>
                {account.instructions && (
                  <p
                    className="mt-1 text-xs italic"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {account.instructions}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onEdit(account)}
                className="flex h-8 w-8 items-center justify-center rounded-xl transition-all"
                style={{ background: "var(--bg-muted)", color: "#2E5AAC" }}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(account.id)}
                disabled={deleting === account.id}
                className="flex h-8 w-8 items-center justify-center rounded-xl transition-all disabled:opacity-50"
                style={{
                  background: "rgba(225, 29, 72, 0.08)",
                  color: "#e11d48",
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
