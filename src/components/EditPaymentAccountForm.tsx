"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserPaymentAccount } from "@/types/expense";

type PaymentChannel = "bank" | "ewallet" | "cash" | "other";

type Props = {
  account: UserPaymentAccount;
  onSuccess?: (account: UserPaymentAccount) => void;
  onCancel?: () => void;
};

export function EditPaymentAccountForm({
  account,
  onSuccess,
  onCancel,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    label: account.label,
    channel: account.channel as PaymentChannel,
    provider: account.provider || "",
    accountName: account.accountName,
    accountNumber: account.accountNumber,
    instructions: account.instructions || "",
    priority: account.priority,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/payment-accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Gagal memperbarui akun");
      }

      const result = (await response.json().catch(() => null)) as {
        data?: UserPaymentAccount;
      } | null;

      if (onSuccess && result?.data) {
        onSuccess(result.data);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="rounded-2xl p-3 text-sm"
          style={{
            background: "rgba(225, 29, 72, 0.08)",
            color: "#e11d48",
            border: "1px solid rgba(225, 29, 72, 0.2)",
          }}
        >
          {error}
        </div>
      )}

      <div>
        <label
          className="block text-xs font-semibold mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Label / Nama Akun <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          minLength={3}
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          placeholder="BCA Utama, GoPay Pribadi, dll"
          className="input-field"
        />
      </div>

      <div>
        <label
          className="block text-xs font-semibold mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Jenis Akun <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.channel}
          onChange={(e) =>
            setFormData({
              ...formData,
              channel: e.target.value as PaymentChannel,
            })
          }
          className="input-field"
        >
          <option value="bank">Bank Transfer</option>
          <option value="ewallet">E-Wallet / QRIS</option>
          <option value="cash">Tunai</option>
          <option value="other">Lainnya</option>
        </select>
      </div>

      {(formData.channel === "bank" || formData.channel === "ewallet") && (
        <div>
          <label
            className="block text-xs font-semibold mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Nama Bank / Provider
          </label>
          <input
            type="text"
            maxLength={80}
            value={formData.provider}
            onChange={(e) =>
              setFormData({ ...formData, provider: e.target.value })
            }
            placeholder="BCA, Mandiri, GoPay, OVO, dll"
            className="input-field"
          />
        </div>
      )}

      <div>
        <label
          className="block text-xs font-semibold mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Nama Pemilik Rekening <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          minLength={3}
          value={formData.accountName}
          onChange={(e) =>
            setFormData({ ...formData, accountName: e.target.value })
          }
          placeholder="Nama sesuai rekening"
          className="input-field"
        />
      </div>

      <div>
        <label
          className="block text-xs font-semibold mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Nomor Rekening / HP <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          minLength={3}
          value={formData.accountNumber}
          onChange={(e) =>
            setFormData({ ...formData, accountNumber: e.target.value })
          }
          placeholder="1234567890"
          className="input-field"
        />
      </div>

      <div>
        <label
          className="block text-xs font-semibold mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Instruksi Tambahan
        </label>
        <textarea
          maxLength={280}
          value={formData.instructions}
          onChange={(e) =>
            setFormData({ ...formData, instructions: e.target.value })
          }
          placeholder="Misal: Transfer sebelum H-1, tambahkan kode unik, dll"
          rows={2}
          className="input-field resize-none"
        />
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          {formData.instructions.length}/280 karakter
        </p>
      </div>

      <div>
        <label
          className="block text-xs font-semibold mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Prioritas (opsional)
        </label>
        <input
          type="number"
          min={0}
          max={100}
          value={formData.priority}
          onChange={(e) =>
            setFormData({
              ...formData,
              priority: parseInt(e.target.value) || 0,
            })
          }
          className="input-field"
        />
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Semakin tinggi, semakin diutamakan
        </p>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex-1 justify-center !py-2.5 text-sm disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-ghost !px-4 !py-2.5 text-sm disabled:opacity-50"
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
