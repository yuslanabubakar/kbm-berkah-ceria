"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Expense } from "@/types/expense";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatRupiah } from "@/lib/formatCurrency";
import type { TripLeg, TripParticipant } from "@/lib/tripQueries";
import {
  buildLegVehicleOptions,
  expenseFormSchema,
  formatLegDateRange,
  type ExpenseFormValues,
  type LegVehicleOption
} from "@/components/expenseFormUtils";
import clsx from "clsx";

type ExpenseListProps = {
  tripId: string;
  expenses: Expense[];
  participants: TripParticipant[];
  legs: TripLeg[];
  canEdit?: boolean;
};

export function ExpenseList({ tripId, expenses, participants, legs, canEdit = false }: ExpenseListProps) {
  const router = useRouter();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/expenses/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "Gagal hapus");
      }

      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      setDeleteError(error instanceof Error ? error.message : "Gagal hapus");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!expenses.length) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center text-slate-500">
        Belum ada pengeluaran. Yuk catat pertama!
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-4">
        {expenses.map((expense) => (
          <li key={expense.id} className="rounded-2xl border bg-white/90 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-slate-900">{expense.judul}</p>
                  {expense.isExcluded && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      Dikecualikan
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {format(new Date(expense.date), "d MMM yyyy", { locale: id })} · ditanggung sementara oleh {expense.paidBy.nama}
                </p>
                <p className="text-xs text-slate-400">
                  Dibagi ke {expense.shareScope === "vehicle" ? "penumpang kendaraan terkait" : "semua penumpang leg ini"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-brand-blue">{formatRupiah(expense.amountIdr)}</p>
                {canEdit && (
                  <div className="mt-1 flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditingExpense(expense)}
                      className="rounded-full border px-2 py-0.5 text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(expense)}
                      className="rounded-full border border-transparent px-2 py-0.5 text-rose-600 transition hover:border-rose-200 hover:bg-rose-50"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            </div>
            {expense.notes && <p className="mt-2 text-sm text-slate-600">{expense.notes}</p>}
          </li>
        ))}
      </ul>

      {editingExpense && (
        <ExpenseEditDialog
          key={editingExpense.id}
          expense={editingExpense}
          tripId={tripId}
          participants={participants}
          legs={legs}
          onClose={() => setEditingExpense(null)}
          onSaved={() => {
            setEditingExpense(null);
            router.refresh();
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Hapus pengeluaran?</h3>
            <p className="mt-2 text-sm text-slate-600">
              {deleteTarget.judul} ({formatRupiah(deleteTarget.amountIdr)}) akan hilang dari perhitungan saldo.
            </p>
            {deleteError && <p className="mt-2 text-sm text-rose-600">{deleteError}</p>}
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border px-4 py-2 text-sm text-slate-600"
                disabled={deleteLoading}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={deleteLoading}
              >
                {deleteLoading ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type ExpenseEditDialogProps = {
  expense: Expense;
  tripId: string;
  participants: TripParticipant[];
  legs: TripLeg[];
  onClose: () => void;
  onSaved: () => void;
};

function ExpenseEditDialog({ expense, tripId, participants, legs, onClose, onSaved }: ExpenseEditDialogProps) {
  const legVehicleOptions = useMemo<LegVehicleOption[]>(() => buildLegVehicleOptions(legs), [legs]);
  const initialLegOption = useMemo(() => {
    return legVehicleOptions.find((option) => option.legId === expense.legId && option.vehicleId === (expense.vehicleId ?? null))
      ?? legVehicleOptions[0];
  }, [legVehicleOptions, expense.legId, expense.vehicleId]);

  const [values, setValues] = useState<ExpenseFormValues>({
    judul: expense.judul,
    amountIdr: expense.amountIdr,
    catatan: expense.notes ?? "",
    legId: initialLegOption?.legId ?? "",
    vehicleId: initialLegOption?.vehicleId ?? null,
    paidById: expense.paidBy.id,
    shareScope: expense.shareScope
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const selectedLeg = useMemo(() => legs.find((leg) => leg.id === values.legId), [legs, values.legId]);
  const legScheduleText = useMemo(() => formatLegDateRange(selectedLeg), [selectedLeg]);
  const vehicleScopeDisabled = !values.vehicleId;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parse = expenseFormSchema.safeParse(values);
    if (!parse.success) {
      const fieldErrors: Record<string, string> = {};
      parse.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[String(issue.path[0])] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          judul: parse.data.judul,
          amountIdr: parse.data.amountIdr,
          catatan: parse.data.catatan,
          paidBy: parse.data.paidById,
          legId: parse.data.legId,
          vehicleId: parse.data.vehicleId || null,
          shareScope: parse.data.shareScope
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "Gagal menyimpan");
      }

      setErrors({});
      setStatus("Berhasil disimpan");
      onSaved();
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Ada kendala, coba lagi ya");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Edit pengeluaran</h3>
            <p className="text-sm text-slate-500">Perbarui detail biaya ini.</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800" disabled={loading}>
            Tutup
          </button>
        </div>

        <div>
          <label className="text-sm font-medium">Judul</label>
          <input
            type="text"
            value={values.judul}
            onChange={(e) => setValues((prev) => ({ ...prev, judul: e.target.value }))}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
          {errors.judul && <p className="text-sm text-rose-600">{errors.judul}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Total (IDR)</label>
          <input
            type="number"
            inputMode="decimal"
            value={values.amountIdr || ""}
            onChange={(e) => setValues((prev) => ({ ...prev, amountIdr: Number(e.target.value) }))}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            min={0}
            step={0.01}
          />
          {values.amountIdr > 0 && <p className="text-sm text-slate-500">{formatRupiah(values.amountIdr)}</p>}
          {errors.amountIdr && <p className="text-sm text-rose-600">{errors.amountIdr}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Dibayar oleh</label>
            <select
              value={values.paidById}
              onChange={(e) => setValues((prev) => ({ ...prev, paidById: e.target.value }))}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            >
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.nama}
                </option>
              ))}
            </select>
            {errors.paidById && <p className="text-sm text-rose-600">{errors.paidById}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Leg & kendaraan</label>
            <select
              value={`${values.legId}::${values.vehicleId ?? "none"}`}
              onChange={(e) => {
                const target = legVehicleOptions.find((option) => option.key === e.target.value);
                if (!target) return;
                setValues((prev) => ({
                  ...prev,
                  legId: target.legId,
                  vehicleId: target.vehicleId,
                  shareScope: prev.shareScope === "vehicle" && !target.vehicleId ? "leg" : prev.shareScope
                }));
              }}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            >
              {legVehicleOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.legId && <p className="text-sm text-rose-600">{errors.legId}</p>}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Cara pembagian biaya</label>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="radio"
                name="shareScopeEdit"
                value="leg"
                checked={values.shareScope === "leg"}
                onChange={() => setValues((prev) => ({ ...prev, shareScope: "leg" }))}
              />
              Semua penumpang leg ini
            </label>
            <label className={clsx("flex items-center gap-2 text-sm", vehicleScopeDisabled ? "text-slate-300" : "text-slate-600")}
            >
              <input
                type="radio"
                name="shareScopeEdit"
                value="vehicle"
                checked={values.shareScope === "vehicle"}
                onChange={() =>
                  setValues((prev) => ({ ...prev, shareScope: vehicleScopeDisabled ? "leg" : "vehicle" }))
                }
                disabled={vehicleScopeDisabled}
              />
              Penumpang kendaraan ini
            </label>
          </div>
          {errors.shareScope && <p className="text-sm text-rose-600">{errors.shareScope}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Jadwal leg</label>
          <input
            type="text"
            value={legScheduleText}
            disabled
            className="mt-1 w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-600"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Catatan (opsional)</label>
          <textarea
            value={values.catatan || ""}
            onChange={(e) => setValues((prev) => ({ ...prev, catatan: e.target.value }))}
            className="mt-1 h-24 w-full rounded-xl border px-3 py-2"
          />
          {errors.catatan && <p className="text-sm text-rose-600">{errors.catatan}</p>}
        </div>

        {status && <p className="text-center text-sm text-slate-600">{status}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-4 py-2 text-sm text-slate-600"
            disabled={loading}
          >
            Batal
          </button>
          <button
            type="submit"
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Menyimpan..." : "Simpan perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
