"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/formatCurrency";
import type { TripLeg, TripParticipant } from "@/lib/tripQueries";
import {
  expenseFormSchema,
  type ExpenseFormValues,
  formatLegDateRange,
  buildLegVehicleOptions,
  type LegVehicleOption
} from "@/components/expenseFormUtils";

type ExpenseFormProps = {
  tripId: string;
  participants: TripParticipant[];
  legs: TripLeg[];
};

export function ExpenseForm({ tripId, participants, legs }: ExpenseFormProps) {
  const router = useRouter();
  const legVehicleOptions = useMemo<LegVehicleOption[]>(() => buildLegVehicleOptions(legs), [legs]);

  const defaultLegVehicle = legVehicleOptions[0];
  const defaultPaidBy = participants[0]?.id ?? "";
  const [values, setValues] = useState<ExpenseFormValues>({
    judul: "",
    amountIdr: 0,
    catatan: "",
    legId: defaultLegVehicle?.legId ?? "",
    vehicleId: defaultLegVehicle?.vehicleId ?? null,
    paidById: defaultPaidBy,
    shareScope: "leg"
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formDisabled = loading || !participants.length || !legVehicleOptions.length;
  const selectedLeg = useMemo(() => legs.find((leg) => leg.id === values.legId), [legs, values.legId]);
  const legScheduleText = useMemo(() => formatLegDateRange(selectedLeg), [selectedLeg]);
  const vehicleScopeDisabled = !values.vehicleId;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!participants.length || !legVehicleOptions.length) {
      setStatus("Belum ada peserta atau leg untuk dicatat");
      return;
    }

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
      const response = await fetch("/api/expenses", {
        method: "POST",
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
        const error = await response.json();
        throw new Error(error.message || "Gagal menyimpan");
      }

      setValues({
        judul: "",
        amountIdr: 0,
        catatan: "",
        legId: defaultLegVehicle?.legId ?? "",
        vehicleId: defaultLegVehicle?.vehicleId ?? null,
        paidById: defaultPaidBy,
        shareScope: "leg"
      });
      setErrors({});
      setStatus("Berhasil disimpan");
      router.refresh();
    } catch (error) {
      console.error(error);
      setStatus("Ada kendala, coba lagi ya");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-white/80 p-5 shadow-sm">
      {!participants.length && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Tambahkan peserta dulu sebelum mencatat pengeluaran.
        </p>
      )}
      {!legVehicleOptions.length && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Buat leg perjalanan dulu supaya biaya tahu context-nya.
        </p>
      )}

      <div>
        <label className="text-sm font-medium">Judul pengeluaran</label>
        <input
          type="text"
          value={values.judul}
          onChange={(e) => setValues((prev) => ({ ...prev, judul: e.target.value }))}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="Contoh: sewa van"
        />
        {errors.judul && <p className="text-sm text-red-500">{errors.judul}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Total (IDR)</label>
        <input
          type="number"
          inputMode="decimal"
          value={values.amountIdr || ""}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, amountIdr: Number(e.target.value) }))
          }
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="0"
          min={0}
          step={0.01}
        />
        {values.amountIdr > 0 && (
          <p className="text-sm text-slate-500">{formatRupiah(values.amountIdr)}</p>
        )}
        {errors.amountIdr && <p className="text-sm text-red-500">{errors.amountIdr}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Dibayar oleh</label>
          <select
            value={values.paidById}
            onChange={(e) => setValues((prev) => ({ ...prev, paidById: e.target.value }))}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            disabled={!participants.length}
          >
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.nama}
              </option>
            ))}
          </select>
          {errors.paidById && <p className="text-sm text-red-500">{errors.paidById}</p>}
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
            disabled={!legVehicleOptions.length}
          >
            {legVehicleOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.legId && <p className="text-sm text-red-500">{errors.legId}</p>}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Cara pembagian biaya</label>
        <div className="mt-2 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="radio"
              name="shareScope"
              value="leg"
              checked={values.shareScope === "leg"}
              onChange={() => setValues((prev) => ({ ...prev, shareScope: "leg" }))}
            />
            Semua penumpang leg ini
          </label>
          <label
            className={clsx(
              "flex items-center gap-2 text-sm",
              vehicleScopeDisabled ? "text-slate-300" : "text-slate-600"
            )}
          >
            <input
              type="radio"
              name="shareScope"
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
        <p className="mt-1 text-xs text-slate-500">
          Pilih opsi &quot;Semua penumpang leg ini&quot; untuk BBM/tol per leg, atau batasi ke kendaraan tertentu untuk biaya khusus mobil.
        </p>
        {errors.shareScope && <p className="text-sm text-red-500">{errors.shareScope}</p>}
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
          placeholder="Siapa aja ikut, info tambahan, dll"
        />
        {errors.catatan && <p className="text-sm text-red-500">{errors.catatan}</p>}
      </div>

      <button
        type="submit"
        disabled={formDisabled}
        className="w-full rounded-xl bg-brand-blue px-4 py-2 font-semibold text-white transition hover:bg-brand-coral disabled:cursor-progress disabled:opacity-60"
      >
        {loading ? "Lagi nyimpen..." : "Tambah pengeluaran"}
      </button>

      {status && <p className="text-center text-sm text-slate-600">{status}</p>}
    </form>
  );
}
