"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/formatCurrency";
import { useToast } from "@/components/Toast";
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
  EXPENSE_CATEGORIES,
  detectCategory,
} from "@/components/expenseFormUtils";

type ExpenseFormProps = {
  tripId: string;
  participants: TripParticipant[];
  legs: TripLeg[];
};

export function ExpenseForm({ tripId, participants, legs }: ExpenseFormProps) {
  const router = useRouter();
  const showToast = useToast();
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
  const [categoryId, setCategoryId] = useState("lainnya");
  const [autoDetected, setAutoDetected] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Food-stop state
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

  const handleJudulChange = (title: string) => {
    setValues((prev) => ({ ...prev, judul: title }));
    setErrors((prev) => ({ ...prev, judul: "" }));
    setStatus(null);
    // Auto-detect category
    const detected = detectCategory(title);
    setCategoryId(detected);
    setAutoDetected(detected !== "lainnya" && title.length >= 3);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!participants.length || !legVehicleOptions.length) {
      setStatus("Belum ada peserta atau leg untuk dicatat");
      return;
    }

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

    const valuesToParse = isFoodStop
      ? { ...values, amountIdr: foodStopTotal, shareScope: "vehicle" as const }
      : values;

    const parse = expenseFormSchema.safeParse(valuesToParse);
    if (!parse.success) {
      const fieldErrors: Record<string, string> = {};
      parse.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      const firstField = Object.keys(fieldErrors)[0];
      const firstMessage = firstField
        ? fieldErrors[firstField]
        : "Data belum lengkap";
      setStatus(firstMessage);
      if (firstField) scrollToField(firstField);
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
      setCategoryId("lainnya");
      setAutoDetected(false);
      setErrors({});
      setIsFoodStop(false);
      setFoodStopAmounts({});
      showToast("Pengeluaran berhasil ditambahkan!", "success");
      router.refresh();
    } catch (error) {
      console.error(error);
      showToast("Ada kendala, coba lagi ya", "error");
      setStatus("Ada kendala, coba lagi ya");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-3xl p-5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
      }}
    >
      {!participants.length && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Tambahkan peserta dulu sebelum mencatat pengeluaran.
        </p>
      )}
      {!legVehicleOptions.length && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Buat leg perjalanan dulu supaya biaya tahu context-nya.
        </p>
      )}

      {/* ── Judul ──────────────────────── */}
      <div data-field="judul">
        <label
          className="mb-1 block text-sm font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          Judul Pengeluaran
        </label>
        <input
          type="text"
          value={values.judul}
          onChange={(e) => handleJudulChange(e.target.value)}
          className="input-field"
          placeholder="Contoh: Bensin Pertamax, Nasi Padang Ampera..."
        />
        {autoDetected && (
          <p className="mt-1 text-xs" style={{ color: "#047857" }}>
            ✨ Kategori terdeteksi otomatis
          </p>
        )}
        {errors.judul && (
          <p className="mt-1 text-xs text-red-500">{errors.judul}</p>
        )}
      </div>

      {/* ── Category Pills ─────────────── */}
      <div>
        <label
          className="mb-2 block text-sm font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          Kategori
        </label>
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((cat) => {
            const active = categoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategoryId(cat.id);
                  setAutoDetected(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200"
                style={{
                  background: active ? cat.color + "22" : "var(--bg-muted)",
                  color: active ? cat.color : "var(--text-secondary)",
                  border: active
                    ? `1.5px solid ${cat.color}55`
                    : "1.5px solid var(--border-color)",
                  transform: active ? "scale(1.05)" : "scale(1)",
                }}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Amount ─────────────────────── */}
      <div data-field="amountIdr">
        <label
          className="mb-1 block text-sm font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          Total (IDR)
        </label>
        {isFoodStop ? (
          <p
            className="rounded-xl px-3 py-2.5 text-sm"
            style={{
              background: "var(--bg-muted)",
              color: "var(--text-muted)",
            }}
          >
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
              className="input-field"
              placeholder="0"
              min={0}
              step={0.01}
            />
            {values.amountIdr > 0 && (
              <p
                className="mt-1 text-xs font-semibold"
                style={{ color: "#2E5AAC" }}
              >
                {formatRupiah(values.amountIdr)}
              </p>
            )}
          </>
        )}
        {errors.amountIdr && (
          <p className="mt-1 text-xs text-red-500">{errors.amountIdr}</p>
        )}
      </div>

      {/* ── Paid By + Leg ──────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div data-field="paidById">
          <label
            className="mb-1 block text-sm font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            Dibayar oleh
          </label>
          <select
            value={values.paidById}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, paidById: e.target.value }));
              setErrors((prev) => ({ ...prev, paidById: "" }));
            }}
            className="input-field"
            disabled={!participants.length}
          >
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </select>
          {errors.paidById && (
            <p className="mt-1 text-xs text-red-500">{errors.paidById}</p>
          )}
        </div>

        <div data-field="legId">
          <label
            className="mb-1 block text-sm font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            Leg & Kendaraan
          </label>
          <select
            value={`${values.legId}::${values.vehicleId ?? "none"}`}
            onChange={(e) => {
              const target = legVehicleOptions.find(
                (o) => o.key === e.target.value,
              );
              if (!target) return;
              setValues((prev) => ({
                ...prev,
                legId: target.legId,
                vehicleId: target.vehicleId,
                shareScope: target.vehicleId ? "vehicle" : "leg",
              }));
              setFoodStopAmounts({});
              setErrors((prev) => ({
                ...prev,
                legId: "",
                shareScope: "",
                foodStop: "",
              }));
            }}
            className="input-field"
            disabled={!legVehicleOptions.length}
          >
            {legVehicleOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.legId && (
            <p className="mt-1 text-xs text-red-500">{errors.legId}</p>
          )}
        </div>
      </div>

      {/* ── Share Scope ────────────────── */}
      <div data-field="shareScope">
        <label
          className="mb-2 block text-sm font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          Cara pembagian biaya
        </label>
        <div className="flex flex-wrap gap-3">
          {(["leg", "vehicle"] as const).map((scope) => {
            const disabled =
              scope === "vehicle" && (vehicleScopeDisabled || isFoodStop);
            const checked = values.shareScope === scope;
            return (
              <label
                key={scope}
                className={clsx(
                  "flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all",
                  disabled && "opacity-40 cursor-not-allowed",
                  checked && !disabled ? "font-semibold" : "",
                )}
                style={{
                  background:
                    checked && !disabled
                      ? "rgba(46, 90, 172, 0.10)"
                      : "var(--bg-muted)",
                  color:
                    checked && !disabled ? "#2E5AAC" : "var(--text-secondary)",
                  border: `1px solid ${checked && !disabled ? "rgba(46, 90, 172, 0.3)" : "var(--border-color)"}`,
                }}
              >
                <input
                  type="radio"
                  name="shareScope"
                  value={scope}
                  checked={checked}
                  onChange={() => {
                    if (disabled) return;
                    setValues((prev) => ({ ...prev, shareScope: scope }));
                    setErrors((prev) => ({ ...prev, shareScope: "" }));
                  }}
                  disabled={disabled || isFoodStop}
                  className="sr-only"
                />
                {scope === "leg"
                  ? "Semua penumpang leg ini"
                  : "Penumpang kendaraan ini"}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          {values.shareScope === "leg"
            ? "💡 Dibagi rata ke seluruh penumpang di leg ini (lintas mobil, supir diskon 50%)."
            : "💡 Hanya ditanggung oleh penumpang di mobil terpilih (supir diskon 50%)."}
        </p>
        {errors.shareScope && (
          <p className="mt-1 text-xs text-red-500">{errors.shareScope}</p>
        )}
      </div>

      {/* ── Food Stop ──────────────────── */}
      <div
        data-field="foodStop"
        className="rounded-2xl p-4"
        style={{
          background: "rgba(251, 191, 36, 0.06)",
          border: "1px solid rgba(245, 158, 11, 0.2)",
        }}
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
          <span className="text-sm font-semibold" style={{ color: "#d97706" }}>
            🍽️ Pemberhentian makan
          </span>
        </label>
        <p className="mt-1 text-xs" style={{ color: "#a16207" }}>
          Aktifkan jika tiap peserta punya tagihan berbeda. Total dihitung
          otomatis dari input per orang.
        </p>

        {isFoodStop && (
          <div className="mt-3 space-y-2">
            {vehicleParticipants.length === 0 ? (
              <p className="text-sm" style={{ color: "#a16207" }}>
                Tidak ada peserta di kendaraan ini.
              </p>
            ) : (
              <>
                {vehicleParticipants.map((p) => (
                  <div
                    key={p.participantId}
                    className="flex items-center gap-3"
                  >
                    <span
                      className="w-28 truncate text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
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
                      className="input-field flex-1 text-sm"
                    />
                    {(foodStopAmounts[p.participantId] ?? 0) > 0 && (
                      <span
                        className="w-28 text-right text-xs font-medium"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatRupiah(foodStopAmounts[p.participantId])}
                      </span>
                    )}
                  </div>
                ))}
                <div
                  className="mt-2 flex justify-between border-t pt-2 text-sm font-bold"
                  style={{
                    borderColor: "var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                >
                  <span>Total tagihan</span>
                  <span style={{ color: "#2E5AAC" }}>
                    {formatRupiah(foodStopTotal)}
                  </span>
                </div>
              </>
            )}
            {errors.foodStop && (
              <p className="text-xs text-red-500">{errors.foodStop}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Jadwal Leg ─────────────────── */}
      <div>
        <label
          className="mb-1 block text-sm font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          Jadwal leg
        </label>
        <input
          type="text"
          value={legScheduleText}
          disabled
          className="input-field"
          style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}
        />
      </div>

      {/* ── Notes ──────────────────────── */}
      <div data-field="catatan">
        <label
          className="mb-1 block text-sm font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          Catatan (opsional)
        </label>
        <textarea
          value={values.catatan || ""}
          onChange={(e) => {
            setValues((prev) => ({ ...prev, catatan: e.target.value }));
            setErrors((prev) => ({ ...prev, catatan: "" }));
          }}
          className="input-field h-20 resize-none"
          placeholder="Info tambahan, siapa aja ikut, dll"
        />
        {errors.catatan && (
          <p className="mt-1 text-xs text-red-500">{errors.catatan}</p>
        )}
      </div>

      {/* ── Submit ─────────────────────── */}
      <button
        type="submit"
        disabled={formDisabled}
        className="btn-primary w-full justify-center py-3 text-base disabled:cursor-progress disabled:opacity-60"
      >
        {loading ? "Menyimpan..." : "Tambah Pengeluaran"}
      </button>

      {status && !loading && (
        <p className="text-center text-sm text-red-500">{status}</p>
      )}
    </form>
  );
}
