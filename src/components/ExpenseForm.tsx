"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/formatCurrency";
import type {
  TripLeg,
  TripParticipant,
  TripVehicleAssignment,
} from "@/lib/tripQueries";
import {
  expenseFormSchema,
  type ExpenseFormValues,
  formatLegDateRange,
  buildLegVehicleOptions,
  type LegVehicleOption,
} from "@/components/expenseFormUtils";

type ExpenseFormProps = {
  tripId: string;
  participants: TripParticipant[];
  legs: TripLeg[];
};

export function ExpenseForm({ tripId, participants, legs }: ExpenseFormProps) {
  const router = useRouter();
  const legVehicleOptions = useMemo<LegVehicleOption[]>(
    () => buildLegVehicleOptions(legs),
    [legs],
  );

  const scrollToField = (fieldName: string) => {
    if (typeof document === "undefined") return;

    document
      .querySelector<HTMLElement>(`[data-field="${fieldName}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const defaultLegVehicle = legVehicleOptions[0];
  const defaultPaidBy = participants[0]?.id ?? "";
  const [values, setValues] = useState<ExpenseFormValues>({
    judul: "",
    amountIdr: 0,
    catatan: "",
    legId: defaultLegVehicle?.legId ?? "",
    vehicleId: defaultLegVehicle?.vehicleId ?? null,
    paidById: defaultPaidBy,
    shareScope: "leg",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Food-stop state: per-participant food bill amounts (participantId → amount)
  const [isFoodStop, setIsFoodStop] = useState(false);
  const [foodStopAmounts, setFoodStopAmounts] = useState<
    Record<string, number>
  >({});

  const formDisabled =
    loading || !participants.length || !legVehicleOptions.length;
  const selectedLeg = useMemo(
    () => legs.find((leg) => leg.id === values.legId),
    [legs, values.legId],
  );
  const legScheduleText = useMemo(
    () => formatLegDateRange(selectedLeg),
    [selectedLeg],
  );
  const vehicleScopeDisabled = !values.vehicleId;

  // Participants in the selected vehicle (needed for food stop mode)
  const vehicleParticipants = useMemo<TripVehicleAssignment[]>(() => {
    if (!values.vehicleId) return [];
    return (
      selectedLeg?.vehicles.find((v) => v.id === values.vehicleId)
        ?.assignments ?? []
    );
  }, [values.vehicleId, selectedLeg]);

  const foodStopTotal = useMemo(
    () =>
      vehicleParticipants.reduce(
        (sum, p) => sum + (foodStopAmounts[p.participantId] ?? 0),
        0,
      ),
    [vehicleParticipants, foodStopAmounts],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!participants.length || !legVehicleOptions.length) {
      setStatus("Belum ada peserta atau leg untuk dicatat");
      return;
    }

    // Build splits for food-stop mode
    const splits = isFoodStop
      ? vehicleParticipants
          .filter((p) => (foodStopAmounts[p.participantId] ?? 0) > 0)
          .map((p) => ({
            participantId: p.participantId,
            amountIdr: foodStopAmounts[p.participantId],
          }))
      : undefined;

    if (isFoodStop && (!splits?.length || foodStopTotal <= 0)) {
      const message = "Masukkan tagihan minimal untuk satu peserta";
      setErrors({ foodStop: message });
      setStatus(message);
      scrollToField("foodStop");
      return;
    }

    // Use foodStopTotal as amountIdr when in food-stop mode so the schema validates correctly.
    const valuesToParse = isFoodStop
      ? { ...values, amountIdr: foodStopTotal, shareScope: "vehicle" as const }
      : values;
    const parse = expenseFormSchema.safeParse(valuesToParse);
    if (!parse.success) {
      const fieldErrors: Record<string, string> = {};
      parse.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[String(issue.path[0])] = issue.message;
        }
      });
      setErrors(fieldErrors);
      const firstField = Object.keys(fieldErrors)[0];
      const firstMessage = firstField
        ? fieldErrors[firstField]
        : "Data belum lengkap";
      setStatus(firstMessage);
      if (firstField) {
        scrollToField(firstField);
      }
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
          shareScope: isFoodStop ? "vehicle" : parse.data.shareScope,
          splits,
        }),
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
        shareScope: "leg",
      });
      setErrors({});
      setIsFoodStop(false);
      setFoodStopAmounts({});
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
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border bg-white/80 p-5 shadow-sm"
    >
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

      <div data-field="judul">
        <label className="text-sm font-medium">Judul pengeluaran</label>
        <input
          type="text"
          value={values.judul}
          onChange={(e) => {
            setValues((prev) => ({ ...prev, judul: e.target.value }));
            setErrors((prev) => ({ ...prev, judul: "" }));
            setStatus(null);
          }}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="Contoh: sewa van"
        />
        {errors.judul && <p className="text-sm text-red-500">{errors.judul}</p>}
      </div>

      <div data-field="amountIdr">
        <label className="text-sm font-medium">Total (IDR)</label>
        {isFoodStop ? (
          <p className="mt-1 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Dihitung otomatis dari tagihan per orang
          </p>
        ) : (
          <>
            <input
              type="number"
              inputMode="decimal"
              value={values.amountIdr || ""}
              onChange={(e) => {
                setValues((prev) => ({
                  ...prev,
                  amountIdr: Number(e.target.value),
                }));
                setErrors((prev) => ({ ...prev, amountIdr: "" }));
                setStatus(null);
              }}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="0"
              min={0}
              step={0.01}
            />
            {values.amountIdr > 0 && (
              <p className="text-sm text-slate-500">
                {formatRupiah(values.amountIdr)}
              </p>
            )}
          </>
        )}
        {errors.amountIdr && (
          <p className="text-sm text-red-500">{errors.amountIdr}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div data-field="paidById">
          <label className="text-sm font-medium">Dibayar oleh</label>
          <select
            value={values.paidById}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, paidById: e.target.value }));
              setErrors((prev) => ({ ...prev, paidById: "" }));
              setStatus(null);
            }}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            disabled={!participants.length}
          >
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.nama}
              </option>
            ))}
          </select>
          {errors.paidById && (
            <p className="text-sm text-red-500">{errors.paidById}</p>
          )}
        </div>

        <div data-field="legId">
          <label className="text-sm font-medium">Leg & kendaraan</label>
          <select
            value={`${values.legId}::${values.vehicleId ?? "none"}`}
            onChange={(e) => {
              const target = legVehicleOptions.find(
                (option) => option.key === e.target.value,
              );
              if (!target) return;
              setValues((prev) => ({
                ...prev,
                legId: target.legId,
                vehicleId: target.vehicleId,
                shareScope:
                  prev.shareScope === "vehicle" && !target.vehicleId
                    ? "leg"
                    : prev.shareScope,
              }));
              setFoodStopAmounts({});
              setErrors((prev) => ({
                ...prev,
                legId: "",
                shareScope: "",
                foodStop: "",
              }));
              setStatus(null);
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
          {errors.legId && (
            <p className="text-sm text-red-500">{errors.legId}</p>
          )}
        </div>
      </div>

      <div data-field="shareScope">
        <label className="text-sm font-medium">Cara pembagian biaya</label>
        <div className="mt-2 flex flex-wrap gap-3">
          <label
            className={clsx(
              "flex items-center gap-2 text-sm",
              isFoodStop ? "text-slate-300" : "text-slate-600",
            )}
          >
            <input
              type="radio"
              name="shareScope"
              value="leg"
              checked={values.shareScope === "leg"}
              onChange={() => {
                setValues((prev) => ({ ...prev, shareScope: "leg" }));
                setErrors((prev) => ({ ...prev, shareScope: "" }));
                setStatus(null);
              }}
              disabled={isFoodStop}
            />
            Semua penumpang leg ini
          </label>
          <label
            className={clsx(
              "flex items-center gap-2 text-sm",
              vehicleScopeDisabled || isFoodStop
                ? "text-slate-300"
                : "text-slate-600",
            )}
          >
            <input
              type="radio"
              name="shareScope"
              value="vehicle"
              checked={values.shareScope === "vehicle"}
              onChange={() => {
                setValues((prev) => ({
                  ...prev,
                  shareScope: vehicleScopeDisabled ? "leg" : "vehicle",
                }));
                setErrors((prev) => ({ ...prev, shareScope: "" }));
                setStatus(null);
              }}
              disabled={vehicleScopeDisabled || isFoodStop}
            />
            Penumpang kendaraan ini
          </label>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Pilih opsi &quot;Semua penumpang leg ini&quot; untuk BBM/tol per leg,
          atau batasi ke kendaraan tertentu untuk biaya khusus mobil.
        </p>
        {errors.shareScope && (
          <p className="text-sm text-red-500">{errors.shareScope}</p>
        )}
      </div>

      {/* Food stop toggle */}
      <div
        data-field="foodStop"
        className="rounded-xl border border-orange-200 bg-orange-50 p-4"
      >
        <label
          className={clsx(
            "flex cursor-pointer items-center gap-3",
            vehicleScopeDisabled && "opacity-50",
          )}
        >
          <input
            type="checkbox"
            checked={isFoodStop}
            onChange={(e) => {
              setIsFoodStop(e.target.checked);
              if (!e.target.checked) setFoodStopAmounts({});
              setErrors((prev) => ({
                ...prev,
                foodStop: "",
                shareScope: "",
                amountIdr: "",
              }));
              setStatus(null);
            }}
            disabled={vehicleScopeDisabled}
            className="h-4 w-4 rounded"
          />
          <span className="text-sm font-medium text-orange-800">
            Pemberhentian makan
          </span>
        </label>
        <p className="mt-1 text-xs text-orange-700">
          Aktifkan jika satu orang bayar duluan dan tiap peserta punya tagihan
          berbeda. Total dihitung otomatis dari input per orang.
        </p>

        {isFoodStop && (
          <div className="mt-3 space-y-2">
            {vehicleParticipants.length === 0 ? (
              <p className="text-sm text-orange-700">
                Tidak ada peserta di kendaraan ini.
              </p>
            ) : (
              <>
                {vehicleParticipants.map((p) => (
                  <div
                    key={p.participantId}
                    className="flex items-center gap-3"
                  >
                    <span className="w-32 truncate text-sm text-slate-700">
                      {p.participantName}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={1}
                      value={foodStopAmounts[p.participantId] || ""}
                      onChange={(e) => {
                        setFoodStopAmounts((prev) => ({
                          ...prev,
                          [p.participantId]: Number(e.target.value),
                        }));
                        setErrors((prev) => ({
                          ...prev,
                          foodStop: "",
                          amountIdr: "",
                        }));
                        setStatus(null);
                      }}
                      placeholder="0"
                      className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
                    />
                    {(foodStopAmounts[p.participantId] ?? 0) > 0 && (
                      <span className="w-28 text-right text-xs text-slate-500">
                        {formatRupiah(foodStopAmounts[p.participantId])}
                      </span>
                    )}
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t pt-2 text-sm font-semibold text-slate-800">
                  <span>Total tagihan</span>
                  <span>{formatRupiah(foodStopTotal)}</span>
                </div>
              </>
            )}
            {errors.foodStop && (
              <p className="text-sm text-red-500">{errors.foodStop}</p>
            )}
          </div>
        )}
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

      <div data-field="catatan">
        <label className="text-sm font-medium">Catatan (opsional)</label>
        <textarea
          value={values.catatan || ""}
          onChange={(e) => {
            setValues((prev) => ({ ...prev, catatan: e.target.value }));
            setErrors((prev) => ({ ...prev, catatan: "" }));
            setStatus(null);
          }}
          className="mt-1 h-24 w-full rounded-xl border px-3 py-2"
          placeholder="Siapa aja ikut, info tambahan, dll"
        />
        {errors.catatan && (
          <p className="text-sm text-red-500">{errors.catatan}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={formDisabled}
        className="w-full rounded-xl bg-brand-blue px-4 py-2 font-semibold text-white transition hover:bg-brand-coral disabled:cursor-progress disabled:opacity-60"
      >
        {loading ? "Lagi nyimpen..." : "Tambah pengeluaran"}
      </button>

      {status && (
        <p
          className={clsx(
            "text-center text-sm",
            loading
              ? "text-slate-600"
              : errors.foodStop || Object.values(errors).some(Boolean)
                ? "text-red-500"
                : "text-slate-600",
          )}
        >
          {status}
        </p>
      )}
    </form>
  );
}
