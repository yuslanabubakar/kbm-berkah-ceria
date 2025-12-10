"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatRupiah } from "@/lib/formatCurrency";
import type { BalanceAdjustment, TripParticipant } from "@/lib/tripQueries";
import type { Expense } from "@/types/expense";

type HostControlsProps = {
  tripId: string;
  participants: TripParticipant[];
  expenses: Expense[];
  adjustments: BalanceAdjustment[];
};

const statusBadgeClasses: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700",
  applied: "bg-emerald-50 text-emerald-700",
  void: "bg-slate-100 text-slate-600",
};

export function HostControls({
  tripId,
  participants,
  expenses,
  adjustments,
}: HostControlsProps) {
  const router = useRouter();
  const [adjustStatus, setAdjustStatus] = useState<string | null>(null);
  const [adjustParticipantId, setAdjustParticipantId] = useState(
    participants[0]?.id ?? "",
  );
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState("");
  const [applyNow, setApplyNow] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [excludeBusyId, setExcludeBusyId] = useState<string | null>(null);
  const [adjustActionBusyId, setAdjustActionBusyId] = useState<string | null>(
    null,
  );

  if (!participants.length) {
    return null;
  }

  const handleToggleExclude = async (expenseId: string, nextValue: boolean) => {
    setExcludeBusyId(expenseId);
    await fetch(`/api/expenses/${expenseId}/exclude`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isExcluded: nextValue }),
    });
    setExcludeBusyId(null);
    router.refresh();
  };

  const handleAdjustmentSubmit = async () => {
    const amountNumber = Number(adjustAmount);
    if (!amountNumber || !adjustParticipantId) {
      setAdjustStatus("Isi nominal penyesuaian dulu.");
      return;
    }

    setSavingAdjustment(true);
    setAdjustStatus("Menyimpan penyesuaian...");
    const response = await fetch(`/api/trips/${tripId}/adjustments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId: adjustParticipantId,
        amountIdr: amountNumber,
        reason: adjustReason,
        applyNow,
      }),
    });
    setSavingAdjustment(false);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setAdjustStatus(error.message || "Gagal menyimpan penyesuaian.");
      return;
    }

    setAdjustAmount("");
    setAdjustReason("");
    setApplyNow(false);
    setAdjustStatus("Penyesuaian tersimpan.");
    router.refresh();
  };

  const handleAdjustmentAction = async (
    adjustmentId: string,
    action: "apply" | "void",
  ) => {
    setAdjustActionBusyId(adjustmentId);
    const response = await fetch(
      `/api/trips/${tripId}/adjustments/${adjustmentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      },
    );
    setAdjustActionBusyId(null);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setAdjustStatus(error.message || "Gagal memperbarui penyesuaian.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="rounded-3xl border border-dashed bg-white/70 p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">
            Mode host
          </p>
          <h2 className="text-xl font-semibold text-slate-900">
            Atur saldo & pembagian
          </h2>
        </div>
        <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-sm font-medium text-brand-blue">
          Hanya terlihat oleh pembuat perjalanan
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <h3 className="font-semibold">Pengeluaran</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {expenses.map((expense) => (
                <li
                  key={expense.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                >
                  <span className="truncate text-slate-600">
                    {expense.judul}
                  </span>
                  <button
                    type="button"
                    className={`text-xs font-semibold ${expense.isExcluded ? "text-rose-600" : "text-slate-500"}`}
                    onClick={() =>
                      handleToggleExclude(expense.id, !expense.isExcluded)
                    }
                    disabled={excludeBusyId === expense.id}
                  >
                    {expense.isExcluded
                      ? "Batalkan pengecualian"
                      : "Kecualikan"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <h3 className="font-semibold">Tambah penyesuaian saldo</h3>
            <p className="text-sm text-slate-500">
              Nominal positif berarti peserta menanggung lebih, negatif berarti
              mengurangi tanggungan.
            </p>
            <div className="mt-3 space-y-3">
              <label className="text-sm font-medium">
                Pilih peserta
                <select
                  value={adjustParticipantId}
                  onChange={(e) => setAdjustParticipantId(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                >
                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.nama}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Nominal (IDR)
                <input
                  type="number"
                  inputMode="decimal"
                  step={0.01}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="Contoh: 150000"
                />
              </label>
              <label className="text-sm font-medium">
                Catatan
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="mt-1 h-20 w-full rounded-xl border px-3 py-2"
                  placeholder="Contoh: pelunasan tunai"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={applyNow}
                  onChange={(e) => setApplyNow(e.target.checked)}
                />
                Tandai langsung sebagai lunas
              </label>
              <button
                type="button"
                onClick={handleAdjustmentSubmit}
                disabled={savingAdjustment}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                Simpan penyesuaian
              </button>
              {adjustStatus && (
                <p className="text-sm text-slate-500">{adjustStatus}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <h3 className="font-semibold">Riwayat penyesuaian</h3>
            <p className="text-sm text-slate-500">
              Draft tidak memengaruhi saldo sampai ditandai lunas.
            </p>
            <ul className="mt-3 space-y-3 text-sm">
              {adjustments.length ? (
                adjustments.map((adjustment) => (
                  <li
                    key={adjustment.id}
                    className="rounded-xl border px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {adjustment.participantName}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClasses[adjustment.status] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {adjustment.status}
                      </span>
                    </div>
                    <p
                      className={`text-base font-semibold ${
                        adjustment.amountIdr >= 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {adjustment.amountIdr >= 0 ? "+" : "-"}{" "}
                      {formatRupiah(Math.abs(adjustment.amountIdr))}
                    </p>
                    {adjustment.reason && (
                      <p className="text-slate-500">{adjustment.reason}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      Dibuat{" "}
                      {format(
                        new Date(adjustment.createdAt),
                        "d MMM yyyy HH:mm",
                        { locale: localeId },
                      )}
                      {adjustment.appliedAt && (
                        <>
                          {" "}
                          · Ditandai lunas{" "}
                          {format(
                            new Date(adjustment.appliedAt),
                            "d MMM HH:mm",
                            { locale: localeId },
                          )}
                        </>
                      )}
                    </p>
                    {adjustment.status === "draft" && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-600"
                          onClick={() =>
                            handleAdjustmentAction(adjustment.id, "apply")
                          }
                          disabled={adjustActionBusyId === adjustment.id}
                        >
                          Tandai lunas
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-400 px-3 py-1 text-xs font-semibold text-slate-600"
                          onClick={() =>
                            handleAdjustmentAction(adjustment.id, "void")
                          }
                          disabled={adjustActionBusyId === adjustment.id}
                        >
                          Batalkan
                        </button>
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <li className="text-slate-500">
                  Belum ada penyesuaian tercatat.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
