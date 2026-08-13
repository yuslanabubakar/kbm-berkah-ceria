"use client";

import { HostPaymentAccount } from "@/types/expense";
import { useState } from "react";
import { Copy, Check, CreditCard } from "lucide-react";
import { useToast } from "@/components/Toast";

const channelLabels: Record<HostPaymentAccount["channel"], string> = {
  bank: "Bank Transfer",
  ewallet: "E-Wallet",
  cash: "Tunai",
  other: "Lainnya",
};

const channelEmoji: Record<HostPaymentAccount["channel"], string> = {
  bank: "🏦",
  ewallet: "💳",
  cash: "💵",
  other: "📱",
};

export function PaymentMethodsDisplay({
  accounts,
}: {
  accounts: HostPaymentAccount[];
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const showToast = useToast();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      showToast("Nomor rekening berhasil disalin!", "success");
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  return (
    <div className="glass-card rounded-3xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "rgba(46, 90, 172, 0.12)" }}
        >
          <CreditCard size={18} style={{ color: "#2E5AAC" }} />
        </div>
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Cara pembayaran
          </p>
          <h2
            className="text-base font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Metode Pembayaran
          </h2>
        </div>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Belum ada metode pembayaran yang ditambahkan.
        </p>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="rounded-2xl p-4"
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-3 flex-1">
                  <span className="text-xl mt-0.5">
                    {channelEmoji[account.channel]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className="font-semibold text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {account.label}
                      </h3>
                      <span className="badge badge-blue text-[10px]">
                        {channelLabels[account.channel]}
                      </span>
                    </div>
                    {account.provider && (
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--text-secondary)" }}
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
                    <div className="mt-2 flex items-center gap-2">
                      <code
                        className="rounded-lg px-2 py-1 text-sm font-mono font-bold"
                        style={{
                          background: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        {account.accountNumber}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(account.accountNumber, account.id)
                        }
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all"
                        style={{
                          color:
                            copiedId === account.id ? "#059669" : "#2E5AAC",
                          background:
                            copiedId === account.id
                              ? "rgba(5, 150, 105, 0.10)"
                              : "rgba(46, 90, 172, 0.10)",
                        }}
                      >
                        {copiedId === account.id ? (
                          <Check size={12} />
                        ) : (
                          <Copy size={12} />
                        )}
                        {copiedId === account.id ? "Tersalin" : "Salin"}
                      </button>
                    </div>
                    {account.instructions && (
                      <p
                        className="mt-2 text-xs italic"
                        style={{ color: "var(--text-muted)" }}
                      >
                        ℹ️ {account.instructions}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
