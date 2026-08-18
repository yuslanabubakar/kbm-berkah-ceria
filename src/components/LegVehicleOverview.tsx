import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { TripLeg } from "@/lib/tripQueries";
import { Car, Clock } from "lucide-react";

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
  return label.replace(/[\u21c4\u2192]/g, "⇄");
}

export function LegVehicleOverview({ legs }: LegVehicleOverviewProps) {
  if (!legs.length) {
    return null;
  }

  const sortedLegs = [...legs].sort((a, b) => a.order - b.order);

  return (
    <div className="glass-card rounded-3xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "rgba(46, 90, 172, 0.12)" }}
          >
            <Car size={18} style={{ color: "#2E5AAC" }} />
          </div>
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Penugasan Armada
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {sortedLegs.length} leg perjalanan
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sortedLegs.map((leg, index) => {
          const startLabel = formatDateTime(leg.start);
          const endLabel = formatDateTime(leg.end);
          const hasVehicles = leg.vehicles.length > 0;

          return (
            <div
              key={leg.id}
              className="rounded-2xl p-4.5"
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <div>
                  <span className="badge badge-blue text-[10px] mb-1">
                    Leg {index + 1}
                  </span>
                  <p
                    className="text-base font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {normalizeLegLabel(leg.label)}
                  </p>
                </div>
                <div
                  className="text-right text-xs flex items-center gap-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Clock size={12} />
                  {startLabel
                    ? `Mulai ${startLabel}`
                    : "Jadwal belum ditentukan"}
                </div>
              </div>

              <div className="space-y-2.5">
                {hasVehicles ? (
                  leg.vehicles.map((vehicle) => {
                    const departureLabel = formatDateTime(
                      vehicle.departureTime,
                    );
                    return (
                      <div
                        key={vehicle.id}
                        className="rounded-xl p-3.5"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div
                            className="font-bold text-sm"
                            style={{ color: "var(--text-primary)" }}
                          >
                            🚗 {vehicle.label}
                            {vehicle.plateNumber && (
                              <span
                                className="ml-2 font-mono text-xs font-normal"
                                style={{ color: "var(--text-muted)" }}
                              >
                                ({vehicle.plateNumber})
                              </span>
                            )}
                          </div>
                          {departureLabel && (
                            <p
                              className="text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              Berangkat: {departureLabel}
                            </p>
                          )}
                        </div>

                        {vehicle.assignments.length ? (
                          <ul className="mt-2.5 flex flex-wrap gap-1.5">
                            {vehicle.assignments.map((assignment) => (
                              <li
                                key={`${assignment.participantId}-${assignment.role ?? "penumpang"}`}
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
                                style={{
                                  background:
                                    assignment.role === "driver"
                                      ? "rgba(46, 90, 172, 0.15)"
                                      : "var(--bg-muted)",
                                  color:
                                    assignment.role === "driver"
                                      ? "#2E5AAC"
                                      : "var(--text-secondary)",
                                  border:
                                    assignment.role === "driver"
                                      ? "1px solid rgba(46, 90, 172, 0.3)"
                                      : "1px solid var(--border-color)",
                                }}
                              >
                                <span>{assignment.participantName}</span>
                                {assignment.role === "driver" && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                    • Supir
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p
                            className="mt-2 text-xs italic"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Belum ada penugasan penumpang.
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
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
