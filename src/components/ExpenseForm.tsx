"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Settings2,
  Trash2,
  Zap,
} from "lucide-react";
import {
  formatRupiah,
  formatThousandsInput,
  parseThousandsInput,
} from "@/lib/formatCurrency";
import { useToast } from "@/components/Toast";
import type {
  TripLeg,
  TripParticipant,
  TripVehicleAssignment,
} from "@/lib/tripQueries";
import {
  expenseFormSchema,
  type ExpenseFormValues,
  type QuickBatchRow,
  type QuickExpenseKind,
  buildAutoExpenseTitle,
  buildQuickBatchRows,
  detectCategory,
  getLegShortName,
} from "@/components/expenseFormUtils";

type ExpenseFormProps = {
  tripId: string;
  participants: TripParticipant[];
  legs: TripLeg[];
  ruleVersion?: number;
  embedded?: boolean;
  onSuccess?: () => void;
};

type FormMode = "single" | "batch";

const QUICK_KINDS: Array<{
  id: QuickExpenseKind;
  emoji: string;
  label: string;
  activeClass: string;
}> = [
  {
    id: "bbm",
    emoji: "⛽",
    label: "Bensin",
    activeClass:
      "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300",
  },
  {
    id: "tol",
    emoji: "🛣️",
    label: "Tol",
    activeClass:
      "bg-indigo-500/15 border-indigo-500/50 text-indigo-700 dark:text-indigo-300",
  },
  {
    id: "makan",
    emoji: "🍽️",
    label: "Makan",
    activeClass:
      "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300",
  },
  {
    id: "lainnya",
    emoji: "📦",
    label: "Lainnya",
    activeClass:
      "bg-blue-500/15 border-blue-500/50 text-blue-700 dark:text-blue-300",
  },
];

const QUICK_AMOUNT_PRESETS = [
  { label: "+50rb", amount: 50000 },
  { label: "+100rb", amount: 100000 },
  { label: "+200rb", amount: 200000 },
];

export function ExpenseForm({
  tripId,
  participants,
  legs,
  ruleVersion = 2,
  embedded = false,
  onSuccess,
}: ExpenseFormProps) {
  const router = useRouter();
  const showToast = useToast();

  const sortedLegs = useMemo(
    () => [...legs].sort((a, b) => a.order - b.order),
    [legs],
  );

  const defaultLegId = sortedLegs[0]?.id ?? "";
  const defaultPaidBy = participants[0]?.id ?? "";

  // Mode: Satuan vs Paket Cepat (Tol & Bensin)
  const [mode, setMode] = useState<FormMode>("single");

  // ── SINGLE MODE STATE ──
  const [selectedLegId, setSelectedLegId] = useState<string>(defaultLegId);
  const [kind, setKind] = useState<QuickExpenseKind>("bbm");
  const [amountIdr, setAmountIdr] = useState<number>(0);
  const [paidById, setPaidById] = useState<string>(defaultPaidBy);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [shareScope, setShareScope] = useState<"leg" | "vehicle">("leg");
  const [vehicleId, setVehicleId] = useState<string | null>(
    sortedLegs[0]?.vehicles[0]?.id ?? null,
  );
  const [catatan, setCatatan] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [foodStopAmounts, setFoodStopAmounts] = useState<
    Record<string, number>
  >({});

  // ── BATCH MODE STATE ──
  const hasMultiVehicle = useMemo(
    () => sortedLegs.some((leg) => leg.vehicles.length > 1),
    [sortedLegs],
  );
  const [batchDefaultPayer, setBatchDefaultPayer] =
    useState<string>(defaultPaidBy);
  const [batchShareScope, setBatchShareScope] = useState<"leg" | "vehicle">(
    "leg",
  );
  const [batchRows, setBatchRows] = useState<QuickBatchRow[]>(() =>
    buildQuickBatchRows(sortedLegs, defaultPaidBy),
  );
  const [customPayerRowIds, setCustomPayerRowIds] = useState<Set<string>>(
    () => new Set(),
  );

  // Shared status
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const formDisabled = loading || !participants.length || !sortedLegs.length;

  const selectedLegIndex = useMemo(() => {
    const idx = sortedLegs.findIndex((l) => l.id === selectedLegId);
    return idx >= 0 ? idx : 0;
  }, [sortedLegs, selectedLegId]);

  const selectedLeg = sortedLegs[selectedLegIndex];
  const legVehicles = useMemo(() => selectedLeg?.vehicles ?? [], [selectedLeg]);

  const effectiveVehicleId = useMemo(() => {
    if (vehicleId && legVehicles.some((v) => v.id === vehicleId)) {
      return vehicleId;
    }
    return legVehicles[0]?.id ?? null;
  }, [vehicleId, legVehicles]);

  const selectedVehicleObj = useMemo(
    () => legVehicles.find((v) => v.id === effectiveVehicleId) ?? null,
    [legVehicles, effectiveVehicleId],
  );

  const isFoodStop = kind === "makan";

  const autoTitle = useMemo(
    () =>
      buildAutoExpenseTitle(
        kind,
        selectedLegIndex,
        sortedLegs.length,
        shareScope === "vehicle" ? selectedVehicleObj?.label : null,
      ),
    [kind, selectedLegIndex, sortedLegs.length, shareScope, selectedVehicleObj],
  );

  const effectiveTitle = customTitle.trim() || autoTitle;

  const foodStopParticipants = useMemo<TripVehicleAssignment[]>(() => {
    if (effectiveVehicleId) {
      const carAssignments =
        legVehicles.find((v) => v.id === effectiveVehicleId)?.assignments ?? [];
      if (carAssignments.length > 0) return carAssignments;
    }
    const legAssignments = legVehicles.flatMap((v) => v.assignments);
    if (legAssignments.length > 0) return legAssignments;
    return participants.map((p) => ({
      participantId: p.id,
      participantName: p.nama,
      role: p.isDriver ? "driver" : "passenger",
    }));
  }, [effectiveVehicleId, legVehicles, participants]);

  const foodStopTotal = useMemo(
    () =>
      foodStopParticipants.reduce(
        (sum, p) => sum + (foodStopAmounts[p.participantId] ?? 0),
        0,
      ),
    [foodStopParticipants, foodStopAmounts],
  );

  const handleSelectLeg = (nextLegId: string) => {
    setSelectedLegId(nextLegId);
    const nextLeg = sortedLegs.find((l) => l.id === nextLegId);
    const nextVid =
      nextLeg?.vehicles.find((v) => v.id === vehicleId)?.id ??
      nextLeg?.vehicles[0]?.id ??
      null;
    setVehicleId(nextVid);
    if (shareScope === "vehicle" && !nextVid) {
      setShareScope("leg");
    }
    setFoodStopAmounts({});
    setStatus(null);
  };

  const handleSelectKind = (nextKind: QuickExpenseKind) => {
    setKind(nextKind);
    setStatus(null);
    if (nextKind !== "makan") {
      setFoodStopAmounts({});
    }
  };

  // ── SUBMIT SINGLE EXPENSE ──
  const submitSingle = async (keepOpen: boolean) => {
    if (!participants.length || !sortedLegs.length || !selectedLeg) {
      setStatus("Belum ada peserta atau etape untuk dicatat.");
      return;
    }

    const splits = isFoodStop
      ? foodStopParticipants
          .filter((p) => (foodStopAmounts[p.participantId] ?? 0) > 0)
          .map((p) => ({
            participantId: p.participantId,
            amountIdr: foodStopAmounts[p.participantId],
          }))
      : undefined;

    if (isFoodStop && (!splits?.length || foodStopTotal <= 0)) {
      setStatus("Masukkan nominal makan minimal untuk satu peserta.");
      return;
    }

    const resolvedShareScope = isFoodStop ? "vehicle" : shareScope;
    const resolvedVehicleId =
      resolvedShareScope === "vehicle" ? effectiveVehicleId : null;

    if (isFoodStop && !resolvedVehicleId) {
      setStatus("Pilih mobil terlebih dahulu untuk mencatat makan.");
      return;
    }

    const valuesToParse: ExpenseFormValues = {
      judul: effectiveTitle,
      amountIdr: isFoodStop ? foodStopTotal : amountIdr,
      catatan: catatan.trim() || undefined,
      legId: selectedLeg.id,
      vehicleId: resolvedVehicleId,
      paidById: paidById || defaultPaidBy,
      shareScope: resolvedShareScope,
    };

    const parse = expenseFormSchema.safeParse(valuesToParse);
    if (!parse.success) {
      const firstIssue = parse.error.issues[0];
      setStatus(firstIssue?.message || "Lengkapi data pengeluaran dulu ya.");
      return;
    }

    const resolvedExpenseType =
      kind === "lainnya" ? detectCategory(parse.data.judul) : kind;

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
          shareScope: parse.data.shareScope,
          expenseType: resolvedExpenseType,
          splits,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Gagal menyimpan");
      }

      showToast(`${parse.data.judul} berhasil dicatat!`, "success");
      setAmountIdr(0);
      setCustomTitle("");
      setCatatan("");
      setFoodStopAmounts({});

      if (keepOpen) {
        // Smart toggle: if user just logged Bensin, switch to Tol (and vice versa)
        if (kind === "bbm") setKind("tol");
        else if (kind === "tol") setKind("bbm");
      }

      router.refresh();
      if (!keepOpen) {
        onSuccess?.();
      }
    } catch (error) {
      console.error(error);
      const msg =
        error instanceof Error ? error.message : "Ada kendala, coba lagi ya";
      showToast(msg, "error");
      setStatus(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── BATCH MODE HANDLERS ──
  const filledBatchRows = useMemo(
    () =>
      batchRows.filter((r) => r.amountIdr > 0 && r.title.trim().length >= 2),
    [batchRows],
  );

  const batchTotalAmount = useMemo(
    () => filledBatchRows.reduce((sum, r) => sum + r.amountIdr, 0),
    [filledBatchRows],
  );

  const handleChangeBatchDefaultPayer = (nextPayerId: string) => {
    setBatchDefaultPayer(nextPayerId);
    setBatchRows((prev) =>
      prev.map((row) =>
        customPayerRowIds.has(row.id) ? row : { ...row, paidById: nextPayerId },
      ),
    );
  };

  const handleChangeVehicleBatchPayer = (
    targetVehicleId: string,
    nextPayerId: string,
  ) => {
    setBatchRows((prev) =>
      prev.map((row) =>
        row.vehicleId === targetVehicleId && !customPayerRowIds.has(row.id)
          ? { ...row, paidById: nextPayerId }
          : row,
      ),
    );
  };

  const batchVehicleGroups = useMemo(() => {
    if (!hasMultiVehicle) return [];
    const groups: Array<{
      vehicleId: string;
      vehicleLabel: string;
      rows: QuickBatchRow[];
    }> = [];
    const byId = new Map<string, (typeof groups)[number]>();
    for (const row of batchRows) {
      const key = row.vehicleId ?? "__other__";
      const label = row.vehicleLabel ?? "Lainnya";
      let group = byId.get(key);
      if (!group) {
        group = { vehicleId: key, vehicleLabel: label, rows: [] };
        byId.set(key, group);
        groups.push(group);
      }
      group.rows.push(row);
    }
    return groups;
  }, [hasMultiVehicle, batchRows]);

  const handleUpdateBatchRow = (
    rowId: string,
    patch: Partial<
      Pick<QuickBatchRow, "title" | "amountIdr" | "paidById" | "legId">
    >,
  ) => {
    if (patch.paidById !== undefined) {
      setCustomPayerRowIds((prev) => new Set(prev).add(rowId));
    }
    setBatchRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const nextLegId = patch.legId ?? row.legId;
        const nextLegIdx = sortedLegs.findIndex((l) => l.id === nextLegId);
        const legShortName =
          nextLegIdx >= 0
            ? getLegShortName(nextLegIdx, sortedLegs.length)
            : row.legShortName;
        return { ...row, ...patch, legShortName };
      }),
    );
    setStatus(null);
  };

  const handleAddBatchRow = () => {
    const leg = sortedLegs[0];
    if (!leg) return;
    setBatchRows((prev) => [
      ...prev,
      {
        id: `extra-${Date.now()}`,
        kind: "lainnya",
        legId: leg.id,
        legShortName: getLegShortName(0, sortedLegs.length),
        vehicleId: null,
        vehicleLabel: null,
        title: "Nota Tambahan",
        amountIdr: 0,
        paidById: batchDefaultPayer || defaultPaidBy,
      },
    ]);
  };

  const handleRemoveBatchRow = (rowId: string) => {
    setBatchRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filledBatchRows.length) {
      setStatus("Isi nominal minimal di satu baris ya.");
      return;
    }

    const tooSmall = filledBatchRows.find((r) => r.amountIdr < 1000);
    if (tooSmall) {
      setStatus(`Nominal "${tooSmall.title}" minimal Rp1.000.`);
      return;
    }

    setLoading(true);
    setStatus(null);

    let savedCount = 0;
    try {
      for (const row of filledBatchRows) {
        const expenseType =
          row.kind === "lainnya" ? detectCategory(row.title) : row.kind;
        const resolvedScope =
          hasMultiVehicle && batchShareScope === "vehicle" && row.vehicleId
            ? "vehicle"
            : "leg";
        const response = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId,
            judul: row.title.trim(),
            amountIdr: row.amountIdr,
            paidBy: row.paidById || batchDefaultPayer || defaultPaidBy,
            legId: row.legId,
            vehicleId: resolvedScope === "vehicle" ? row.vehicleId : null,
            shareScope: resolvedScope,
            expenseType,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || `Gagal menyimpan "${row.title}"`);
        }
        savedCount++;
      }

      showToast(`${savedCount} nota berhasil disimpan!`, "success");
      setBatchRows(
        buildQuickBatchRows(sortedLegs, batchDefaultPayer || defaultPaidBy),
      );
      setCustomPayerRowIds(new Set());
      router.refresh();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      const msg =
        error instanceof Error
          ? error.message
          : "Gagal menyimpan sebagian nota";
      showToast(msg, "error");
      setStatus(
        savedCount > 0
          ? `${savedCount} nota tersimpan, sisanya gagal: ${msg}`
          : msg,
      );
      if (savedCount > 0) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const hasAdvancedOverrides =
    Boolean(customTitle.trim()) ||
    shareScope === "vehicle" ||
    Boolean(catatan.trim());

  return (
    <div
      className={clsx(
        "space-y-3.5",
        embedded ? "" : "rounded-2xl sm:rounded-3xl p-4 sm:p-5",
      )}
      style={
        embedded
          ? undefined
          : {
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
            }
      }
    >
      {!participants.length && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Tambahkan peserta dulu sebelum mencatat pengeluaran.
        </p>
      )}
      {!sortedLegs.length && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Buat etape perjalanan dulu supaya biaya tahu arahnya.
        </p>
      )}

      {/* ── Mode Switcher: Satuan vs Paket Cepat ────────────────────── */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)]">
        <button
          type="button"
          onClick={() => {
            setMode("single");
            setStatus(null);
          }}
          className={clsx(
            "py-2 px-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap",
            mode === "single"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white",
          )}
        >
          <span>⚡ Satuan</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("batch");
            setStatus(null);
          }}
          className={clsx(
            "py-2 px-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap",
            mode === "batch"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white",
          )}
        >
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span>Paket Tol &amp; Bensin</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODE 1: SATUAN (ULTRA-COMPACT 3 ROWS)                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mode === "single" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitSingle(false);
          }}
          className="space-y-3.5"
        >
          {/* Row 1: Arah / Etape (1-tap segmented pills, legible on narrow phones) */}
          {sortedLegs.length > 1 && (
            <div className="grid grid-cols-2 gap-1.5">
              {sortedLegs.map((leg, idx) => {
                const active = selectedLeg?.id === leg.id;
                const shortName = getLegShortName(idx, sortedLegs.length);
                const routeLabel = leg.label.replace(/[\u21c4\u2192]/g, "➔");
                return (
                  <button
                    key={leg.id}
                    type="button"
                    onClick={() => handleSelectLeg(leg.id)}
                    className={clsx(
                      "rounded-xl px-2.5 py-2 transition-all border text-left min-w-0",
                      active
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-[var(--bg-muted)] border-[var(--border-color)] text-slate-700 dark:text-slate-300 hover:border-blue-400",
                    )}
                  >
                    <p className="text-xs font-bold leading-tight truncate">
                      {shortName}
                    </p>
                    <p
                      className={clsx(
                        "text-[10px] leading-tight truncate mt-0.5",
                        active ? "text-blue-100" : "text-slate-400",
                      )}
                    >
                      {routeLabel}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Row 2: 4 Quick Kinds (1-tap, auto-title!) */}
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_KINDS.map((item) => {
              const active = kind === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectKind(item.id)}
                  className={clsx(
                    "flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl py-2 px-2 text-xs font-bold border transition-all",
                    active
                      ? `${item.activeClass} shadow-sm`
                      : "bg-[var(--bg-muted)] border-[var(--border-color)] text-slate-600 dark:text-slate-300 hover:border-slate-400",
                  )}
                >
                  <span className="text-sm leading-none">{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Title Input (Only shown automatically when kind === "lainnya") */}
          {kind === "lainnya" && (
            <div>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => {
                  setCustomTitle(e.target.value);
                  setStatus(null);
                }}
                className="input-field text-sm font-semibold"
                placeholder="Nama pengeluaran (cth: Tambal Ban, Parkir, Jumper Aki...)"
                autoFocus
              />
            </div>
          )}

          {/* Row 3: Nominal & Dibayar Oleh (1 compact row!) */}
          {!isFoodStop ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatThousandsInput(amountIdr)}
                    onChange={(e) => {
                      setAmountIdr(parseThousandsInput(e.target.value));
                      setStatus(null);
                    }}
                    className="input-field pl-9 font-extrabold text-sm"
                    placeholder="Nominal (cth: 150.000)"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {QUICK_AMOUNT_PRESETS.map((preset) => (
                    <button
                      key={preset.amount}
                      type="button"
                      onClick={() => {
                        setAmountIdr((prev) => prev + preset.amount);
                        setStatus(null);
                      }}
                      className="rounded-lg px-2 py-0.5 text-[10px] font-bold bg-[var(--bg-muted)] hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 border border-[var(--border-color)] text-slate-500 dark:text-slate-400"
                    >
                      {preset.label}
                    </button>
                  ))}
                  {amountIdr > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmountIdr(0)}
                      className="rounded-lg px-2 py-0.5 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div>
                <select
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
                  className="input-field text-sm font-semibold"
                  disabled={!participants.length}
                  aria-label="Dibayar oleh"
                >
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      Talangan: {p.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* Food Stop Inline Section (Auto-opened when user taps "🍽️ Makan") */
            <div className="space-y-2.5 rounded-2xl p-3 bg-amber-500/5 border border-amber-500/25">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <select
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
                  className="input-field py-1.5 text-xs font-semibold flex-1 min-w-[140px]"
                  disabled={!participants.length}
                >
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      Talangan: {p.nama}
                    </option>
                  ))}
                </select>
                {legVehicles.length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    {legVehicles.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setVehicleId(v.id);
                          setFoodStopAmounts({});
                        }}
                        className={clsx(
                          "rounded-lg px-2 py-1 text-[11px] font-bold border",
                          effectiveVehicleId === v.id
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-[var(--bg-card)] border-[var(--border-color)] text-slate-600 dark:text-slate-300",
                        )}
                      >
                        🚗 {v.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-1.5 sm:grid-cols-2 max-h-48 overflow-y-auto pr-0.5">
                {foodStopParticipants.map((p) => (
                  <div
                    key={p.participantId}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)]"
                  >
                    <span
                      className="flex-1 truncate text-xs font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {p.participantName}
                    </span>
                    <div className="relative w-28 shrink-0">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatThousandsInput(
                          foodStopAmounts[p.participantId] ?? 0,
                        )}
                        onChange={(e) => {
                          const parsed = parseThousandsInput(e.target.value);
                          setFoodStopAmounts((prev) => ({
                            ...prev,
                            [p.participantId]: parsed,
                          }));
                          setStatus(null);
                        }}
                        placeholder="0"
                        className="input-field w-full pl-7 pr-2 py-1 text-right text-xs font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-amber-500/20 text-xs font-bold">
                <span className="text-slate-500">Total makan</span>
                <span className="text-amber-600 dark:text-amber-400">
                  {formatRupiah(foodStopTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Subtle Auto-title Preview + Collapsible Opsi Lanjutan */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
            <span className="text-slate-400 truncate">
              Nota:{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {effectiveTitle || "—"}
              </strong>
              {!isFoodStop &&
                (shareScope === "vehicle" && selectedVehicleObj
                  ? ` · Khusus ${selectedVehicleObj.label}`
                  : " · Semua peserta etape")}
            </span>

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              <Settings2 className="w-3 h-3" />
              <span>
                Opsi lanjutan
                {hasAdvancedOverrides ? " •" : ""}
              </span>
              {showAdvanced ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          {showAdvanced && (
            <div className="p-3 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-3 animate-in fade-in duration-150">
              {kind !== "lainnya" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Ubah Judul (opsional)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="input-field py-1.5 text-xs"
                    placeholder={autoTitle}
                  />
                </div>
              )}

              {!isFoodStop && legVehicles.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-500">
                    Cakupan Pembagian
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShareScope("leg")}
                      className={clsx(
                        "rounded-lg px-2.5 py-1.5 text-xs font-semibold border",
                        shareScope === "leg"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-[var(--bg-card)] border-[var(--border-color)] text-slate-600 dark:text-slate-300",
                      )}
                    >
                      🌐 Semua penumpang etape ini
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShareScope("vehicle");
                        if (!vehicleId && legVehicles[0]) {
                          setVehicleId(legVehicles[0].id);
                        }
                      }}
                      className={clsx(
                        "rounded-lg px-2.5 py-1.5 text-xs font-semibold border",
                        shareScope === "vehicle"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-[var(--bg-card)] border-[var(--border-color)] text-slate-600 dark:text-slate-300",
                      )}
                    >
                      🚗 Khusus mobil tertentu
                    </button>
                  </div>

                  {shareScope === "vehicle" && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {legVehicles.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setVehicleId(v.id)}
                          className={clsx(
                            "rounded-lg px-2.5 py-1 text-xs font-bold border",
                            effectiveVehicleId === v.id
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-[var(--bg-card)] border-[var(--border-color)] text-slate-600 dark:text-slate-300",
                          )}
                        >
                          🚗 {v.label} ({v.assignments.length} org)
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400">
                    {ruleVersion >= 2
                      ? "Diskon supir maks 50%/mobil · peserta 1 arah +10% bobot."
                      : "Aturan lama: supir diskon 50%/orang."}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Catatan (opsional)
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="input-field py-1.5 text-xs"
                  placeholder="Cth: struk di dompet, KM 88..."
                />
              </div>
            </div>
          )}

          {status && !loading && (
            <p className="text-xs font-medium text-rose-500">{status}</p>
          )}

          {/* Action Buttons: Save vs Save & Add Another */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              disabled={formDisabled}
              onClick={() => submitSingle(true)}
              className="btn-secondary flex-1 justify-center py-2.5 text-xs font-bold disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "+ Simpan & Tambah Lagi"}
            </button>
            <button
              type="submit"
              disabled={formDisabled}
              className="btn-primary flex-1 justify-center py-2.5 text-xs sm:text-sm font-bold disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Nota"}
            </button>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODE 2: PAKET CEPAT (TOL & BENSIN SEKALIGUS)                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mode === "batch" && (
        <form onSubmit={handleSubmitBatch} className="space-y-3">
          {/* Top Bar: Default Payer (1-car) or Scope Toggle (multi-car) */}
          {!hasMultiVehicle ? (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)]">
              <span className="text-[11px] font-semibold text-slate-500">
                Talangan default:
              </span>
              <select
                value={batchDefaultPayer}
                onChange={(e) => handleChangeBatchDefaultPayer(e.target.value)}
                className="input-field py-1 px-2 text-xs font-bold w-auto min-w-[140px]"
                disabled={!participants.length}
              >
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  Pembagian biaya:
                </span>
                <div className="grid grid-cols-2 w-full sm:w-auto sm:inline-flex rounded-lg p-0.5 bg-[var(--bg-card)] border border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => setBatchShareScope("leg")}
                    className={clsx(
                      "px-2 py-1.5 sm:py-1 rounded-md text-[11px] font-bold transition-all text-center whitespace-nowrap",
                      batchShareScope === "leg"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    🌐 Lintas mobil
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchShareScope("vehicle")}
                    className={clsx(
                      "px-2 py-1.5 sm:py-1 rounded-md text-[11px] font-bold transition-all text-center whitespace-nowrap",
                      batchShareScope === "vehicle"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    🚗 Per mobil
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {batchShareScope === "leg"
                  ? "💡 Biaya seluruh mobil di etape ini digabung & dibagi ke semua penumpang."
                  : "💡 Biaya tiap mobil hanya ditanggung oleh penumpang di mobil masing-masing."}
              </p>
            </div>
          )}

          {/* Pre-filled Tol & Bensin rows (avoid nested scroll trap on mobile when embedded in modal) */}
          <div
            className={clsx(
              "space-y-2.5 pr-0.5",
              embedded
                ? "sm:max-h-80 sm:overflow-y-auto"
                : "max-h-80 overflow-y-auto",
            )}
          >
            {hasMultiVehicle
              ? batchVehicleGroups.map((group) => {
                  const groupPayer =
                    group.rows[0]?.paidById || batchDefaultPayer;
                  return (
                    <div
                      key={group.vehicleId}
                      className={clsx(
                        "rounded-2xl p-2.5 border space-y-2 transition-colors",
                        batchShareScope === "vehicle" &&
                          group.vehicleId !== "__other__"
                          ? "bg-indigo-500/5 border-indigo-500/30"
                          : "bg-[var(--bg-muted)]/40 border-[var(--border-color)]",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="text-xs font-extrabold truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {group.vehicleId === "__other__"
                              ? "📦 Tambahan"
                              : `🚗 ${group.vehicleLabel}`}
                          </span>
                          {group.vehicleId !== "__other__" && (
                            <span
                              className={clsx(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0",
                                batchShareScope === "vehicle"
                                  ? "bg-indigo-600/15 text-indigo-700 dark:text-indigo-300"
                                  : "bg-blue-600/10 text-blue-700 dark:text-blue-300",
                              )}
                            >
                              {batchShareScope === "vehicle"
                                ? `Khusus ${group.vehicleLabel}`
                                : "Dibagi lintas mobil"}
                            </span>
                          )}
                        </div>
                        {group.vehicleId !== "__other__" && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Talangan:
                            </span>
                            <select
                              value={groupPayer}
                              onChange={(e) =>
                                handleChangeVehicleBatchPayer(
                                  group.vehicleId,
                                  e.target.value,
                                )
                              }
                              className="input-field py-0.5 px-1.5 text-[11px] font-bold w-24 sm:w-28"
                            >
                              {participants.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nama}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {group.rows.map((row) => (
                          <div
                            key={row.id}
                            className={clsx(
                              "p-2 rounded-xl border transition-all space-y-1.5 sm:space-y-0 sm:flex sm:items-center sm:gap-2",
                              row.amountIdr > 0
                                ? "bg-blue-500/5 border-blue-500/35"
                                : "bg-[var(--bg-card)] border-[var(--border-color)]",
                            )}
                          >
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className="text-sm shrink-0">
                                {row.kind === "tol"
                                  ? "🛣️"
                                  : row.kind === "bbm"
                                    ? "⛽"
                                    : "📦"}
                              </span>
                              <input
                                type="text"
                                value={row.title}
                                onChange={(e) =>
                                  handleUpdateBatchRow(row.id, {
                                    title: e.target.value,
                                  })
                                }
                                className="input-field py-1 px-2 text-xs font-bold flex-1 min-w-0"
                              />
                              {sortedLegs.length > 1 &&
                                row.id.startsWith("extra-") && (
                                  <select
                                    value={row.legId}
                                    onChange={(e) =>
                                      handleUpdateBatchRow(row.id, {
                                        legId: e.target.value,
                                      })
                                    }
                                    className="input-field py-1 px-1.5 text-[11px] w-20 shrink-0"
                                  >
                                    {sortedLegs.map((l, i) => (
                                      <option key={l.id} value={l.id}>
                                        {getLegShortName(i, sortedLegs.length)}
                                      </option>
                                    ))}
                                  </select>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="relative flex-1 sm:w-28">
                                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                                  Rp
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatThousandsInput(row.amountIdr)}
                                  onChange={(e) =>
                                    handleUpdateBatchRow(row.id, {
                                      amountIdr: parseThousandsInput(
                                        e.target.value,
                                      ),
                                    })
                                  }
                                  placeholder="0"
                                  className="input-field w-full pl-6 pr-2 py-1 text-right text-xs font-extrabold"
                                />
                              </div>

                              <select
                                value={row.paidById}
                                onChange={(e) =>
                                  handleUpdateBatchRow(row.id, {
                                    paidById: e.target.value,
                                  })
                                }
                                className="input-field py-1.5 sm:py-1 px-1.5 text-[11px] font-semibold w-[42%] sm:w-28 shrink-0"
                              >
                                {participants.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nama}
                                  </option>
                                ))}
                              </select>

                              {row.id.startsWith("extra-") && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBatchRow(row.id)}
                                  className="p-1 text-slate-400 hover:text-rose-500 shrink-0"
                                  title="Hapus baris"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              : batchRows.map((row) => (
                  <div
                    key={row.id}
                    className={clsx(
                      "p-2.5 rounded-xl border transition-all space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2",
                      row.amountIdr > 0
                        ? "bg-blue-500/5 border-blue-500/35"
                        : "bg-[var(--bg-muted)]/60 border-[var(--border-color)]",
                    )}
                  >
                    {/* Title + Leg */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-sm shrink-0">
                        {row.kind === "tol"
                          ? "🛣️"
                          : row.kind === "bbm"
                            ? "⛽"
                            : "📦"}
                      </span>
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) =>
                          handleUpdateBatchRow(row.id, {
                            title: e.target.value,
                          })
                        }
                        className="input-field py-1 px-2 text-xs font-bold flex-1 min-w-0"
                      />
                      {sortedLegs.length > 1 && row.id.startsWith("extra-") && (
                        <select
                          value={row.legId}
                          onChange={(e) =>
                            handleUpdateBatchRow(row.id, {
                              legId: e.target.value,
                            })
                          }
                          className="input-field py-1 px-1.5 text-[11px] w-20 shrink-0"
                        >
                          {sortedLegs.map((l, i) => (
                            <option key={l.id} value={l.id}>
                              {getLegShortName(i, sortedLegs.length)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Amount + Payer */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="relative flex-1 sm:w-28">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatThousandsInput(row.amountIdr)}
                          onChange={(e) =>
                            handleUpdateBatchRow(row.id, {
                              amountIdr: parseThousandsInput(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="input-field w-full pl-6 pr-2 py-1 text-right text-xs font-extrabold"
                        />
                      </div>

                      <select
                        value={row.paidById}
                        onChange={(e) =>
                          handleUpdateBatchRow(row.id, {
                            paidById: e.target.value,
                          })
                        }
                        className="input-field py-1.5 sm:py-1 px-1.5 text-[11px] font-semibold w-[42%] sm:w-28 shrink-0"
                      >
                        {participants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nama}
                          </option>
                        ))}
                      </select>

                      {row.id.startsWith("extra-") && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBatchRow(row.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 shrink-0"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={handleAddBatchRow}
              className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah baris lain
            </button>
            <span className="text-slate-400">
              Baris kosong otomatis dilewati
            </span>
          </div>

          {status && !loading && (
            <p className="text-xs font-medium text-rose-500">{status}</p>
          )}

          {/* Batch Summary & Submit */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border-color)]">
            <div className="text-xs">
              <p className="text-[10px] text-slate-400 font-semibold">
                {filledBatchRows.length} nota diisi
              </p>
              <p className="font-extrabold text-blue-600 dark:text-blue-400">
                {formatRupiah(batchTotalAmount)}
              </p>
            </div>
            <button
              type="submit"
              disabled={formDisabled || filledBatchRows.length === 0}
              className="btn-primary px-5 py-2.5 text-xs sm:text-sm font-bold disabled:opacity-50"
            >
              {loading
                ? "Menyimpan..."
                : `Simpan ${filledBatchRows.length || ""} Nota`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
