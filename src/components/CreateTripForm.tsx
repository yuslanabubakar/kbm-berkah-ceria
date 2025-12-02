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
  const [participantsInput, setParticipantsInput] = useState("Gilang\nAgus\nDita\nTari");
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
    [driverMap]
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
        isDriver: driverMap[name] ?? false
      })),
      defaultTimes: {
        start: DEFAULT_START_TIME,
        end: DEFAULT_END_TIME
      }
    };

    const response = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = (await response.json().catch(() => ({ message: "Gagal memproses" }))) as ApiResponse;

    if (!response.ok || !result.data) {
      setStatus(result.message || "Gagal membuat perjalanan.");
      setIsSubmitting(false);
      return;
    }

    setStatus("Perjalanan berhasil dibuat. Mengalihkan...");
    router.push(`/perjalanan/${result.data.tripId}`);
  }

  const disableSubmit = isSubmitting || !tripName.trim() || !startDate || !participantNames.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-3xl border bg-white/80 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Detail perjalanan</h2>
        <p className="text-sm text-slate-500">Semua field bisa diubah lagi nanti.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Nama perjalanan
            <input
              type="text"
              className="mt-1 w-full rounded-2xl border px-4 py-2"
              placeholder="Contoh: KBM Malang Trip"
              value={tripName}
              onChange={(event) => setTripName(event.target.value)}
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Kota asal
            <input
              type="text"
              className="mt-1 w-full rounded-2xl border px-4 py-2"
              placeholder="Jakarta"
              value={originCity}
              onChange={(event) => setOriginCity(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Kota tujuan
            <input
              type="text"
              className="mt-1 w-full rounded-2xl border px-4 py-2"
              placeholder="Malang"
              value={destinationCity}
              onChange={(event) => setDestinationCity(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Tanggal mulai
            <input
              type="date"
              className="mt-1 w-full rounded-2xl border px-4 py-2"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Tanggal selesai (opsional)
            <input
              type="date"
              className="mt-1 w-full rounded-2xl border px-4 py-2"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Nama kendaraan
            <input
              type="text"
              className="mt-1 w-full rounded-2xl border px-4 py-2"
              value={vehicleLabel}
              onChange={(event) => setVehicleLabel(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Plat kendaraan (opsional)
            <input
              type="text"
              className="mt-1 w-full rounded-2xl border px-4 py-2 uppercase"
              value={vehiclePlate}
              onChange={(event) => setVehiclePlate(event.target.value)}
              placeholder="N 1234 AB"
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border bg-white/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Daftar peserta</h2>
            <p className="text-sm text-slate-500">Isi satu nama per baris, pilih siapa saja yang menyetir.</p>
          </div>
          <span className="text-sm text-slate-500">Supir terpilih: {selectedDriverCount}</span>
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Nama peserta
            <textarea
              className="mt-1 h-48 w-full rounded-2xl border px-4 py-2 font-mono"
              value={participantsInput}
              onChange={(event) => setParticipantsInput(event.target.value)}
              placeholder={"Gilang\nAgus\nDita"}
            />
          </label>
          <div>
            <p className="text-sm font-medium text-slate-700">Supir</p>
            <div className="mt-2 space-y-2">
              {participantNames.length ? (
                participantNames.map((name) => (
                  <label key={name} className="flex items-center gap-3 rounded-2xl border px-4 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={driverMap[name] ?? false}
                      onChange={(event) =>
                        setDriverMap((prev) => ({
                          ...prev,
                          [name]: event.target.checked
                        }))
                      }
                    />
                    <span>{name}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-500">Tambahkan nama dulu di kolom kiri.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-3xl bg-slate-900/90 px-6 py-5 text-white">
        <p className="text-sm text-white/70">Klik simpan untuk langsung masuk ke halaman perjalanan baru.</p>
        <button
          type="submit"
          disabled={disableSubmit}
          className="mt-3 w-full rounded-2xl bg-white/95 px-6 py-3 text-center text-base font-semibold text-slate-900 disabled:opacity-60"
        >
          {isSubmitting ? "Menyimpan..." : "Simpan perjalanan"}
        </button>
        {status && <p className="mt-2 text-sm text-white/80">{status}</p>}
      </div>
    </form>
  );
}
