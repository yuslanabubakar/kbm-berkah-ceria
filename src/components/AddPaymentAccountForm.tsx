"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserPaymentAccount } from "@/types/expense";

type PaymentChannel = "bank" | "ewallet" | "cash" | "other";

type Props = {
  onSuccess?: (account: UserPaymentAccount) => void;
};

export function AddPaymentAccountForm({ onSuccess }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    label: "",
    channel: "bank" as PaymentChannel,
    provider: "",
    accountName: "",
    accountNumber: "",
    instructions: "",
    priority: 0,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/payment-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Gagal menambahkan akun");
      }

      const result = (await response.json().catch(() => null)) as {
        data?: UserPaymentAccount;
      } | null;

      setFormData({
        label: "",
        channel: "bank",
        provider: "",
        accountName: "",
        accountNumber: "",
        instructions: "",
        priority: 0,
      });

      const created = result?.data;

      if (onSuccess && created) {
        onSuccess(created);
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
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Label / Nama Akun <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          minLength={3}
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          placeholder="BCA Utama, GoPay Pribadi, dll"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
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
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
        >
          <option value="bank">Bank Transfer</option>
          <option value="ewallet">E-Wallet / QRIS</option>
          <option value="cash">Tunai</option>
          <option value="other">Lainnya</option>
        </select>
      </div>

      {(formData.channel === "bank" || formData.channel === "ewallet") && (
        <div>
          <label className="block text-sm font-medium text-slate-700">
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
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">
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
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
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
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
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
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">
          {formData.instructions.length}/280 karakter
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
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
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">
          Semakin tinggi, semakin diutamakan
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-50"
      >
        {loading ? "Menyimpan..." : "Tambah Metode Pembayaran"}
      </button>
    </form>
  );
}
