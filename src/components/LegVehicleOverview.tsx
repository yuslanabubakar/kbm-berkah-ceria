import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { TripLeg } from "@/lib/tripQueries";
import { Car, Clock, Route } from "lucide-react";

type LegVehicleOverviewProps = {
  legs: TripLeg[];
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

export function LegVehicleOverview({ legs }: LegVehicleOverviewProps) {
  if (!legs.length) {
    return null;
  }

  const sortedLegs = [...legs].sort((a, b) => a.order - b.order);

  return (
    <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <h2
              className="text-sm sm:text-base font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Penugasan Armada & Penumpang
            </h2>
            <p className="text-[11px] text-slate-400">
              {sortedLegs.length} etape perjalanan
            </p>
          </div>
        </div>
      </div>

      <div
        className={`grid gap-3 ${
          sortedLegs.length > 1 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {sortedLegs.map((leg, index) => {
          const startLabel = formatDateTime(leg.start);
          const hasVehicles = leg.vehicles.length > 0;

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
                    const passengers = vehicle.assignments.filter(
                      (a) => a.role !== "driver",
                    );

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
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                            {vehicle.assignments.length} org
                          </span>
                        </div>

                        {vehicle.plateNumber && (
                          <p className="text-[10px] font-mono text-slate-400 -mt-1">
                            {vehicle.plateNumber}
                          </p>
                        )}

                        {vehicle.assignments.length ? (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {vehicle.assignments.map((assignment) => {
                              const isDriver = assignment.role === "driver";

                              return (
                                <span
                                  key={`${assignment.participantId}-${assignment.role ?? "penumpang"}`}
                                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium border ${
                                    isDriver
                                      ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold"
                                      : "bg-[var(--bg-muted)] text-slate-700 dark:text-slate-300 border-[var(--border-color)]"
                                  }`}
                                >
                                  <span>{assignment.participantName}</span>
                                  {isDriver && (
                                    <span className="text-[8px] bg-blue-600 text-white px-1 py-0.2 rounded font-extrabold">
                                      Supir
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">
                            Belum ada penumpang
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[11px] text-slate-400 italic p-2">
                    Belum ada armada pada etape ini.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
