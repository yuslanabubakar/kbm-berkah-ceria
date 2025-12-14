import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { TripLeg } from "@/lib/tripQueries";

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
  return label.replace(/[\u21c4\u2192]/g, "->");
}

export function LegVehicleOverview({ legs }: LegVehicleOverviewProps) {
  if (!legs.length) {
    return null;
  }

  const sortedLegs = [...legs].sort((a, b) => a.order - b.order);

  return (
    <div className="rounded-2xl border bg-white/90 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">
            Rute & kendaraan
          </p>
          <h2 className="text-xl font-semibold text-slate-900">
            Penugasan armada
          </h2>
        </div>
        <span className="text-sm text-slate-500">
          {sortedLegs.length} leg perjalanan
        </span>
      </div>
      <div className="mt-5 space-y-4">
        {sortedLegs.map((leg, index) => {
          const startLabel = formatDateTime(leg.start);
          const endLabel = formatDateTime(leg.end);
          const hasVehicles = leg.vehicles.length > 0;

          return (
            <div
              key={leg.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Leg {index + 1}
                  </p>
                  <p className="text-base font-semibold text-slate-900">
                    {normalizeLegLabel(leg.label)}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {startLabel && <p>Mulai {startLabel}</p>}
                  {endLabel && <p>Selesai {endLabel}</p>}
                  {!startLabel && !endLabel && <p>Jadwal belum ditentukan</p>}
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {hasVehicles ? (
                  leg.vehicles.map((vehicle) => {
                    const departureLabel = formatDateTime(
                      vehicle.departureTime,
                    );
                    return (
                      <div
                        key={vehicle.id}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium text-slate-900">
                            {vehicle.label}
                            {vehicle.plateNumber && (
                              <span className="ml-2 text-xs text-slate-500">
                                {vehicle.plateNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {departureLabel ?? "Jadwal keberangkatan belum ada"}
                          </p>
                        </div>
                        {vehicle.assignments.length ? (
                          <ul className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                            {vehicle.assignments.map((assignment) => (
                              <li
                                key={`${assignment.participantId}-${assignment.role ?? "penumpang"}`}
                                className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"
                              >
                                <span>{assignment.participantName}</span>
                                {assignment.role === "driver" && (
                                  <span className="text-[10px] font-semibold uppercase text-slate-500">
                                    Supir
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">
                            Belum ada penugasan penumpang.
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500">
                    Belum ada kendaraan di leg ini.
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
