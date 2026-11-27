"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { TripLeg, TripParticipant } from "@/lib/tripQueries";
import { computeDriverDiscountPerDriver } from "@/lib/tripPricingRules";
import { useToast } from "@/components/Toast";
import { Car, Clock, ChevronDown, ChevronUp, Plus, X } from "lucide-react";

type LegVehicleOverviewProps = {
  tripId?: string;
  legs: TripLeg[];
  participants?: TripParticipant[];
  canEdit?: boolean;
  ruleVersion?: number;
};

function formatDateTime(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return format(parsed, "d MMM yyyy HH:mm", { locale: localeId });
}

function normalizeLegLabel(label?: string | null) {
  if (!label) return "Tanpa rute";
  return label.replace(/[\u21c4\u2192]/g, "➔");
}

function formatDiscountPercent(fraction: number): string {
  const pct = fraction * 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

export function LegVehicleOverview({
  tripId,
  legs,
  participants = [],
  canEdit = false,
  ruleVersion = 2,
}: LegVehicleOverviewProps) {
  const router = useRouter();
  const showToast = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [addingTarget, setAddingTarget] = useState<string | null>(null);

  if (!legs.length) {
    return null;
  }

  const sortedLegs = [...legs].sort((a, b) => a.order - b.order);
  const interactive = Boolean(canEdit && tripId);

  const handleToggleDriver = async (
    legId: string,
    vehicleId: string,
    participantId: string,
    currentRole: string | null | undefined,
  ) => {
    if (!tripId) return;
    const key = `toggle:${legId}:${vehicleId}:${participantId}`;
    const nextRole = currentRole === "driver" ? "passenger" : "driver";
    setBusyKey(key);
    try {
      const response = await fetch(
        `/api/trips/${tripId}/vehicles/${vehicleId}/assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            legId,
            assignments: [{ participantId, role: nextRole }],
          }),
        },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        showToast(err.message || "Gagal mengubah peran", "error");
        return;
      }
      showToast(
        nextRole === "driver"
          ? "Ditandai sebagai supir"
          : "Diubah menjadi penumpang",
        "success",
      );
      router.refresh();
    } catch {
      showToast("Terjadi kesalahan", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const handleRemoveFromVehicle = async (
    legId: string,
    vehicleId: string,
    participantId: string,
  ) => {
    if (!tripId) return;
    const key = `remove:${legId}:${vehicleId}:${participantId}`;
    setBusyKey(key);
    try {
      const response = await fetch(
        `/api/trips/${tripId}/vehicles/${vehicleId}/assignments`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            legId,
            participantIds: [participantId],
          }),
        },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        showToast(err.message || "Gagal mengeluarkan peserta", "error");
        return;
      }
      showToast("Peserta dikeluarkan dari etape ini", "success");
      router.refresh();
    } catch {
      showToast("Terjadi kesalahan", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const handleAddToVehicle = async (
    legId: string,
    vehicleId: string,
    participantId: string,
  ) => {
    if (!tripId || !participantId) return;
    const key = `add:${legId}:${vehicleId}`;
    setBusyKey(key);
    try {
      const response = await fetch(
        `/api/trips/${tripId}/vehicles/${vehicleId}/assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            legId,
            assignments: [{ participantId, role: "passenger" }],
          }),
        },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        showToast(err.message || "Gagal menambahkan peserta", "error");
        return;
      }
      setAddingTarget(null);
      showToast("Peserta ditambahkan ke mobil", "success");
      router.refresh();
    } catch {
      showToast("Terjadi kesalahan", "error");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="glass-card rounded-2xl sm:rounded-3xl border border-[var(--border-color)] overflow-hidden transition-all shadow-sm">
      <div
        onClick={() => setIsOpen((v) => !v)}
        className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--bg-muted)]/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Car className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2
              className="text-sm sm:text-base font-bold truncate"
              style={{ color: "var(--text-primary)" }}
            >
              Ikhtisar Penugasan Armada & Penumpang
            </h2>
            <p className="text-[11px] text-slate-400">
              {sortedLegs.length} etape perjalanan
              {interactive
                ? " · Klik nama/ikon supir untuk ubah langsung 1-klik"
                : " · Ringkasan supir & penumpang"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="badge badge-blue text-[10px] font-bold">
            {sortedLegs.length} Etape
          </span>
          <div className="w-7 h-7 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center text-slate-400">
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-6 border-t border-[var(--border-color)] space-y-3 bg-[var(--bg-muted)]/20 animate-in fade-in duration-150">
          {sortedLegs.map((leg, index) => {
            const startLabel = formatDateTime(leg.start);
            const hasVehicles = leg.vehicles.length > 0;
            const assignedOnLeg = new Set(
              leg.vehicles.flatMap((v) =>
                v.assignments.map((a) => a.participantId),
              ),
            );
            const unassignedParticipants = participants.filter(
              (p) => !assignedOnLeg.has(p.id),
            );

            return (
              <div
                key={leg.id}
                className="rounded-2xl p-3.5 sm:p-4 bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-2.5"
              >
                {/* Leg Header */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="badge badge-blue text-[9px] font-bold py-0.2 px-1.5 shrink-0">
                      Leg {index + 1}
                    </span>
                    <p
                      className="text-xs sm:text-sm font-bold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {normalizeLegLabel(leg.label)}
                    </p>
                  </div>
                  {startLabel && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                      <Clock size={11} />
                      <span>{startLabel}</span>
                    </div>
                  )}
                </div>

                {/* Vehicles Grid */}
                <div
                  className={`grid gap-2 ${
                    leg.vehicles.length > 1
                      ? "grid-cols-1 sm:grid-cols-2"
                      : "grid-cols-1"
                  }`}
                >
                  {hasVehicles ? (
                    leg.vehicles.map((vehicle) => {
                      const drivers = vehicle.assignments.filter(
                        (a) => a.role === "driver",
                      );
                      const driverDiscountLabel =
                        ruleVersion >= 2 && drivers.length > 0
                          ? formatDiscountPercent(
                              computeDriverDiscountPerDriver(drivers.length),
                            )
                          : "50%";
                      const targetKey = `${leg.id}:${vehicle.id}`;
                      const isAddingHere = addingTarget === targetKey;

                      return (
                        <div
                          key={vehicle.id}
                          className="rounded-xl p-2.5 sm:p-3 bg-[var(--bg-card)] border border-[var(--border-color)] space-y-2"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              className="font-bold text-xs truncate"
                              style={{ color: "var(--text-primary)" }}
                            >
                              🚗 {vehicle.label}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                {vehicle.assignments.length} org
                              </span>
                              {interactive &&
                                unassignedParticipants.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAddingTarget(
                                        isAddingHere ? null : targetKey,
                                      )
                                    }
                                    className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 transition-colors"
                                    title="Tambah peserta ke mobil ini"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Tambah
                                  </button>
                                )}
                            </div>
                          </div>

                          {vehicle.plateNumber && (
                            <p className="text-[10px] font-mono text-slate-400 -mt-1">
                              {vehicle.plateNumber}
                            </p>
                          )}

                          {/* Quick add participant picker */}
                          {interactive &&
                            isAddingHere &&
                            unassignedParticipants.length > 0 && (
                              <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-[var(--bg-muted)] border border-blue-500/30">
                                <span className="w-full text-[10px] font-semibold text-slate-500">
                                  Klik peserta untuk dimasukkan ke{" "}
                                  {vehicle.label}:
                                </span>
                                {unassignedParticipants.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    disabled={busyKey === `add:${targetKey}`}
                                    onClick={() =>
                                      handleAddToVehicle(
                                        leg.id,
                                        vehicle.id,
                                        p.id,
                                      )
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                    {p.nama}
                                  </button>
                                ))}
                              </div>
                            )}

                          {vehicle.assignments.length ? (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {vehicle.assignments.map((assignment) => {
                                const isDriver = assignment.role === "driver";
                                const isBusy =
                                  busyKey ===
                                    `toggle:${leg.id}:${vehicle.id}:${assignment.participantId}` ||
                                  busyKey ===
                                    `remove:${leg.id}:${vehicle.id}:${assignment.participantId}`;

                                return (
                                  <span
                                    key={`${assignment.participantId}-${assignment.role ?? "penumpang"}`}
                                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium border transition-opacity ${
                                      isBusy ? "opacity-50" : ""
                                    } ${
                                      isDriver
                                        ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold"
                                        : "bg-[var(--bg-muted)] text-slate-700 dark:text-slate-300 border-[var(--border-color)]"
                                    }`}
                                  >
                                    <span>{assignment.participantName}</span>
                                    {interactive ? (
                                      <>
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() =>
                                            handleToggleDriver(
                                              leg.id,
                                              vehicle.id,
                                              assignment.participantId,
                                              assignment.role,
                                            )
                                          }
                                          title={
                                            isDriver
                                              ? "Klik untuk ubah jadi penumpang"
                                              : "Klik untuk jadikan supir"
                                          }
                                          className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold transition-colors ${
                                            isDriver
                                              ? "bg-blue-600 text-white hover:bg-blue-700"
                                              : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white"
                                          }`}
                                        >
                                          {isDriver
                                            ? `Supir ${driverDiscountLabel}`
                                            : "Supir?"}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() =>
                                            handleRemoveFromVehicle(
                                              leg.id,
                                              vehicle.id,
                                              assignment.participantId,
                                            )
                                          }
                                          title="Keluarkan dari etape ini"
                                          className="text-slate-400 hover:text-rose-500 transition-colors"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </>
                                    ) : (
                                      isDriver && (
                                        <span className="text-[8px] bg-blue-600 text-white px-1 py-0.2 rounded font-extrabold">
                                          Supir {driverDiscountLabel}
                                        </span>
                                      )
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">
                              Belum ada penumpang ditempatkan
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl p-3 border border-dashed border-[var(--border-color)] text-center text-[11px] text-slate-400">
                      Belum ada mobil terhubung ke etape ini.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
