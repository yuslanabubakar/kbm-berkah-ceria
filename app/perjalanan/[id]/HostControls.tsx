"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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

type SplitRow = {
  participantId: string;
  participantName: string;
  weight: number;
  amountOverride: string;
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
  const [isPending, startTransition] = useTransition();
  const [splitStatus, setSplitStatus] = useState<string | null>(null);
  const [adjustStatus, setAdjustStatus] = useState<string | null>(null);
  const [selectedExpenseId, setSelectedExpenseId] = useState(
    expenses[0]?.id ?? "",
  );
  const selectedExpense = useMemo(
    () => expenses.find((exp) => exp.id === selectedExpenseId),
    [expenses, selectedExpenseId],
  );

  const [splitRows, setSplitRows] = useState<SplitRow[]>(() =>
    buildSplitRows(participants, selectedExpense),
  );
  const [adjustParticipantId, setAdjustParticipantId] = useState(
    participants[0]?.id ?? "",
  );
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState("");
  const [applyNow, setApplyNow] = useState(false);

  useEffect(() => {
    setSplitRows(buildSplitRows(participants, selectedExpense));
  }, [participants, selectedExpense]);

  if (!participants.length) {
    return null;
  }

  const handleToggleExclude = (expenseId: string, nextValue: boolean) => {
    startTransition(async () => {
      await fetch(`/api/expenses/${expenseId}/exclude`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isExcluded: nextValue }),
      });
      router.refresh();
    });
  };

  const handleSplitChange = (
    participantId: string,
    field: "weight" | "amountOverride",
    value: string,
  ) => {
    setSplitRows((prev) =>
      prev.map((row) => {
        if (row.participantId !== participantId) return row;
        if (field === "weight") {
          return { ...row, weight: Number(value) || 0 };
        }
        return { ...row, amountOverride: value };
      }),
    );
  };

  const handleSplitSubmit = () => {
    if (!selectedExpense) return;
    const payloadSplits = splitRows
      .filter(
        (row) =>
          row.weight > 0 || (row.amountOverride && Number(row.amountOverride)),
      )
      .map((row) => ({
        participantId: row.participantId,
        shareWeight: row.weight,
        shareAmountOverride: row.amountOverride
          ? Number(row.amountOverride)
          : undefined,
      }));

    if (!payloadSplits.length) {
      setSplitStatus("Harus ada minimal satu peserta.");
      return;
    }

    startTransition(async () => {
      setSplitStatus("Menyimpan...");
      const response = await fetch(
        `/api/expenses/${selectedExpense.id}/splits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId, splits: payloadSplits }),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        setSplitStatus(error.message || "Gagal menyimpan pengaturan porsi.");
        return;
      }

      setSplitStatus("Porsi tersimpan.");
      router.refresh();
    });
  };

  const handleAdjustmentSubmit = () => {
    const amountNumber = Number(adjustAmount);
    if (!amountNumber || !adjustParticipantId) {
      setAdjustStatus("Isi nominal penyesuaian dulu.");
      return;
    }

    startTransition(async () => {
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
    });
  };

  const handleAdjustmentAction = (
    adjustmentId: string,
    action: "apply" | "void",
  ) => {
    startTransition(async () => {
      const response = await fetch(
        `/api/trips/${tripId}/adjustments/${adjustmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        setAdjustStatus(error.message || "Gagal memperbarui penyesuaian.");
        return;
      }
      router.refresh();
    });
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
            <div className="flex items-center justify-between">
              <h3
                className="font-bold text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                Pengeluaran
              </h3>
              <select
                value={selectedExpenseId}
                onChange={(e) => setSelectedExpenseId(e.target.value)}
                className="input-field !w-auto !py-1 text-xs"
              >
                {expenses.map((expense) => (
                  <option key={expense.id} value={expense.id}>
                    {expense.judul} ({formatRupiah(expense.amountIdr)})
                  </option>
                ))}
              </select>
            </div>
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
                    disabled={isPending}
                  >
                    {expense.isExcluded
                      ? "Batalkan pengecualian"
                      : "Kecualikan"}
                  </button>
                </li>
              ))}
            </ul>
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
              Atur pembagian biaya
            </h3>
            {selectedExpense ? (
              <>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Sesuaikan bobot pembagian untuk {selectedExpense.judul}.
                  Kosongkan override jika ingin mengikuti bobot otomatis.
                </p>
                <div className="mt-3 space-y-3">
                  {splitRows.map((row) => (
                    <div
                      key={row.participantId}
                      className="grid gap-3 rounded-xl p-3 border sm:grid-cols-2"
                      style={{
                        background: "var(--bg-muted)",
                        borderColor: "var(--border-color)",
                      }}
                    >
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {row.participantName}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label
                          className="text-xs font-medium"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Bobot
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            className="input-field mt-1 !py-1 text-xs"
                            value={row.weight}
                            onChange={(e) =>
                              handleSplitChange(
                                row.participantId,
                                "weight",
                                e.target.value,
                              )
                            }
                          />
                        </label>
                        <label
                          className="text-xs font-medium"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Override Rupiah
                          <input
                            type="number"
                            min={0}
                            className="input-field mt-1 !py-1 text-xs"
                            value={row.amountOverride}
                            onChange={(e) =>
                              handleSplitChange(
                                row.participantId,
                                "amountOverride",
                                e.target.value,
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleSplitSubmit}
                  disabled={isPending}
                  className="btn-primary mt-4 w-full justify-center !py-2.5 text-sm disabled:opacity-60"
                >
                  Simpan pembagian
                </button>
                {splitStatus && (
                  <p
                    className="mt-2 text-xs text-center font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {splitStatus}
                  </p>
                )}
              </>
            ) : (
              <p
                className="text-xs py-2"
                style={{ color: "var(--text-muted)" }}
              >
                Belum ada pengeluaran untuk diatur.
              </p>
            )}
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
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="input-field mt-1"
                  placeholder="Contoh: 150000"
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
                disabled={isPending}
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
                      {adjustment.appliedAt &&
                        ` · Dilunas ${format(new Date(adjustment.appliedAt), "d MMM HH:mm", { locale: localeId })}`}
                    </p>
                    {adjustment.status === "draft" && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          onClick={() =>
                            handleAdjustmentAction(adjustment.id, "apply")
                          }
                          disabled={isPending}
                        >
                          Tandai lunas
                        </button>
                        <button
                          type="button"
                          className="btn-ghost !px-3 !py-1 !text-xs !rounded-lg"
                          onClick={() =>
                            handleAdjustmentAction(adjustment.id, "void")
                          }
                          disabled={isPending}
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

function buildSplitRows(
  participants: TripParticipant[],
  expense?: Expense,
): SplitRow[] {
  return participants.map((participant) => {
    const existing = expense?.splits?.find(
      (split) => split.participantId === participant.id,
    );
    return {
      participantId: participant.id,
      participantName: participant.nama,
      weight: existing ? existing.shareWeight : 1,
      amountOverride:
        existing?.shareAmountOverride != null
          ? String(existing.shareAmountOverride)
          : "",
    };
  });
}
