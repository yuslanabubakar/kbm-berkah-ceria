"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_VEHICLE_LABEL = "Kendaraan utama";
const DEFAULT_START_TIME = "08:00";
const DEFAULT_END_TIME = "17:00";

type DriverMap = Record<string, boolean>;

type ApiResponse = {
  message: string;
  data?: { tripId: string };
};

export function CreateTripForm() {
  const router = useRouter();
  const [tripName, setTripName] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [vehicleLabel, setVehicleLabel] = useState(DEFAULT_VEHICLE_LABEL);
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [participantsInput, setParticipantsInput] = useState(
    "Gilang\nAgus\nDita\nTari",
  );
  const [driverMap, setDriverMap] = useState<DriverMap>({});
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const participantNames = useMemo(() => {
    return participantsInput
      .split(/\n+/)
      .map((name) => name.trim())
      .filter(Boolean);
  }, [participantsInput]);

  useEffect(() => {
    setDriverMap((prev) => {
      const next: DriverMap = {};
      participantNames.forEach((name) => {
        next[name] = prev[name] ?? false;
      });
      return next;
    });
  }, [participantNames]);

  const selectedDriverCount = useMemo(
    () => Object.values(driverMap).filter(Boolean).length,
    [driverMap],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!participantNames.length) {
      setStatus("Minimal satu peserta dibutuhkan.");
      return;
    }

    if (!tripName.trim()) {
      setStatus("Nama perjalanan wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Membuat perjalanan...");

    const payload = {
      name: tripName.trim(),
      originCity: originCity.trim() || null,
      destinationCity: destinationCity.trim() || null,
      startDate: startDate || null,
      endDate: endDate || null,
      vehicleLabel: vehicleLabel.trim() || DEFAULT_VEHICLE_LABEL,
      vehiclePlate: vehiclePlate.trim() || null,
      participants: participantNames.map((name) => ({
        name,
        isDriver: driverMap[name] ?? false,
      })),
      defaultTimes: {
        start: DEFAULT_START_TIME,
        end: DEFAULT_END_TIME,
      },
    };

    const response = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response
      .json()
      .catch(() => ({ message: "Gagal memproses" }))) as ApiResponse;

    if (!response.ok || !result.data) {
      setStatus(result.message || "Gagal membuat perjalanan.");
      setIsSubmitting(false);
      return;
    }

    setStatus("Perjalanan berhasil dibuat. Mengalihkan...");
    router.push(`/perjalanan/${result.data.tripId}`);
  }

  const disableSubmit =
    isSubmitting || !tripName.trim() || !startDate || !participantNames.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="glass-card rounded-3xl p-6 sm:p-7">
        <h2
          className="text-lg font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Detail perjalanan
        </h2>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Semua field bisa diubah lagi nanti.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label
            className="text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            Nama perjalanan
            <input
              type="text"
              className="input-field mt-1.5"
              placeholder="Contoh: KBM Malang Trip"
              value={tripName}
              onChange={(event) => setTripName(event.target.value)}
              required
            />
          </label>
          <label
            className="text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            Kota asal
            <input
              type="text"
              className="input-field mt-1.5"
              placeholder="Jakarta"
              value={originCity}
              onChange={(event) => setOriginCity(event.target.value)}
            />
          </label>
          <label
            className="text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            Kota tujuan
            <input
              type="text"
              className="input-field mt-1.5"
              placeholder="Malang"
              value={destinationCity}
              onChange={(event) => setDestinationCity(event.target.value)}
            />
          </label>
          <label
            className="text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            Tanggal mulai
            <input
              type="date"
              className="input-field mt-1.5"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </label>
          <label
            className="text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            Tanggal selesai (opsional)
            <input
              type="date"
              className="input-field mt-1.5"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <label
            className="text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            Nama kendaraan
            <input
              type="text"
              className="input-field mt-1.5"
              value={vehicleLabel}
              onChange={(event) => setVehicleLabel(event.target.value)}
            />
          </label>
          <label
            className="text-xs font-semibold sm:col-span-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Plat kendaraan (opsional)
            <input
              type="text"
              className="input-field mt-1.5 uppercase"
              value={vehiclePlate}
              onChange={(event) => setVehiclePlate(event.target.value)}
              placeholder="N 1234 AB"
            />
          </label>
        </div>
      </section>

      <section className="glass-card rounded-3xl p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Daftar peserta
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Isi satu nama per baris, pilih siapa saja yang menyetir.
            </p>
          </div>
          <span className="badge badge-blue">
            Supir terpilih: {selectedDriverCount}
          </span>
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <label
            className="text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            Nama peserta
            <textarea
              className="input-field mt-1.5 h-48 font-mono resize-none leading-relaxed"
              value={participantsInput}
              onChange={(event) => setParticipantsInput(event.target.value)}
              placeholder={"Gilang\nAgus\nDita"}
            />
          </label>
          <div>
            <p
              className="text-xs font-semibold mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Pilih supir (akan mendapat diskon tanggungan 50%)
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {participantNames.length ? (
                participantNames.map((name) => {
                  const isChecked = driverMap[name] ?? false;
                  return (
                    <label
                      key={name}
                      className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-all cursor-pointer"
                      style={{
                        background: isChecked
                          ? "rgba(46, 90, 172, 0.08)"
                          : "var(--bg-secondary)",
                        borderColor: isChecked
                          ? "#2e5aac"
                          : "var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <input
                        type="checkbox"
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        checked={isChecked}
                        onChange={(event) =>
                          setDriverMap((prev) => ({
                            ...prev,
                            [name]: event.target.checked,
                          }))
                        }
                      />
                      <span className="font-medium">{name}</span>
                      {isChecked && (
                        <span className="ml-auto text-xs font-bold text-blue-600 dark:text-blue-400">
                          Supir (50%)
                        </span>
                      )}
                    </label>
                  );
                })
              ) : (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Tambahkan nama dulu di kolom kiri.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-3">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Klik simpan untuk langsung masuk ke halaman detail perjalanan baru.
        </p>
        <button
          type="submit"
          disabled={disableSubmit}
          className="btn-primary w-full justify-center py-3.5 text-base font-bold shadow-lg disabled:opacity-50"
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Perjalanan"}
        </button>
        {status && (
          <p
            className="text-center text-sm font-medium pt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {status}
          </p>
        )}
      </div>
    </form>
  );
}
