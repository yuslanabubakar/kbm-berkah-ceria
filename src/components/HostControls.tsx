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
  draft: "badge-amber",
  applied: "badge-emerald",
  void: "badge-gray",
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
    <div className="glass-card rounded-3xl p-6 sm:p-7 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">
            Mode host
          </p>
          <h2
            className="text-xl font-bold mt-1"
            style={{ color: "var(--text-primary)" }}
          >
            Atur saldo & pembagian
          </h2>
        </div>
        <span className="badge badge-blue">
          Hanya terlihat oleh pembuat perjalanan
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div
            className="rounded-2xl p-5 border"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
            }}
          >
            <h3
              className="font-bold text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              Pengeluaran
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {expenses.map((expense) => (
                <li
                  key={expense.id}
                  className="flex items-center justify-between rounded-xl px-3 py-2 border"
                  style={{
                    background: "var(--bg-muted)",
                    borderColor: "var(--border-color)",
                  }}
                >
                  <span
                    className="truncate font-medium text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {expense.judul}
                  </span>
                  <button
                    type="button"
                    className={`text-xs font-semibold px-2 py-1 rounded-lg transition ${
                      expense.isExcluded
                        ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        : "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                    }`}
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
          <div
            className="rounded-2xl p-5 border"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
            }}
          >
            <h3
              className="font-bold text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              Tambah penyesuaian saldo
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Nominal positif berarti peserta menanggung lebih, negatif berarti
              mengurangi tanggungan.
            </p>
            <div className="mt-4 space-y-3">
              <label
                className="text-xs font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Pilih peserta
                <select
                  value={adjustParticipantId}
                  onChange={(e) => setAdjustParticipantId(e.target.value)}
                  className="input-field mt-1"
                >
                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.nama}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="text-xs font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Nominal (IDR)
                <input
                  type="number"
                  inputMode="decimal"
                  step={0.01}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="input-field mt-1"
                  placeholder="Contoh: 150000 atau -50000"
                />
              </label>
              <label
                className="text-xs font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Catatan
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="input-field mt-1 h-20 resize-none"
                  placeholder="Contoh: pelunasan tunai"
                />
              </label>
              <label
                className="flex items-center gap-2 text-xs font-medium cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
              >
                <input
                  type="checkbox"
                  checked={applyNow}
                  onChange={(e) => setApplyNow(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                Tandai langsung sebagai lunas
              </label>
              <button
                type="button"
                onClick={handleAdjustmentSubmit}
                disabled={savingAdjustment}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-500 disabled:opacity-60"
              >
                Simpan penyesuaian
              </button>
              {adjustStatus && (
                <p
                  className="text-xs text-center font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {adjustStatus}
                </p>
              )}
            </div>
          </div>

          <div
            className="rounded-2xl p-5 border"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
            }}
          >
            <h3
              className="font-bold text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              Riwayat penyesuaian
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Draft tidak memengaruhi saldo sampai ditandai lunas.
            </p>
            <ul className="mt-3 space-y-3 text-sm">
              {adjustments.length ? (
                adjustments.map((adjustment) => (
                  <li
                    key={adjustment.id}
                    className="rounded-xl border p-3"
                    style={{
                      background: "var(--bg-muted)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p
                        className="font-semibold text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {adjustment.participantName}
                      </p>
                      <span
                        className={`badge ${statusBadgeClasses[adjustment.status] ?? "badge-gray"}`}
                      >
                        {adjustment.status}
                      </span>
                    </div>
                    <p
                      className={`text-base font-bold mt-1 ${
                        adjustment.amountIdr >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {adjustment.amountIdr >= 0 ? "+" : "-"}{" "}
                      {formatRupiah(Math.abs(adjustment.amountIdr))}
                    </p>
                    {adjustment.reason && (
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {adjustment.reason}
                      </p>
                    )}
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--text-muted)" }}
                    >
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
                          className="rounded-lg border border-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          onClick={() =>
                            handleAdjustmentAction(adjustment.id, "apply")
                          }
                          disabled={adjustActionBusyId === adjustment.id}
                        >
                          Tandai lunas
                        </button>
                        <button
                          type="button"
                          className="btn-ghost !px-3 !py-1 !text-xs !rounded-lg"
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
                <li
                  className="text-xs py-2"
                  style={{ color: "var(--text-muted)" }}
                >
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
