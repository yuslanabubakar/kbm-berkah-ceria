"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { FleetVehicle, TripLeg, TripParticipant, TripLegVehicle } from "@/lib/tripQueries";

const EMPTY_VEHICLE = {
  label: "Minibus cadangan",
  plateNumber: "",
  seatCapacity: 7,
  notes: ""
};

const EMPTY_LEG = {
  origin: "",
  destination: "",
  startDate: "",
  startTime: "08:00",
  notes: ""
};

const EMPTY_SCHEDULE = {
  startDate: "",
  startTime: ""
};

function isoToDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function isoToTimeInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(11, 16);
}

function formatScheduleLabel(start?: string | null) {
  if (!start) {
    return "Jadwal belum ditentukan";
  }
  return format(new Date(start), "d MMM yyyy HH:mm", { locale: localeId });
}

type VehicleManagerProps = {
  tripId: string;
  legs: TripLeg[];
  participants: TripParticipant[];
  fleet: FleetVehicle[];
};

type ParticipantRow = {
  id: string;
  name: string;
};

export function VehicleManager({ tripId, legs, participants, fleet }: VehicleManagerProps) {
  const router = useRouter();
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleFormState, setVehicleFormState] = useState(EMPTY_VEHICLE);
  const [showLegForm, setShowLegForm] = useState(false);
  const [legFormState, setLegFormState] = useState(EMPTY_LEG);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingLeg, setSavingLeg] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [movingParticipantId, setMovingParticipantId] = useState<string | null>(null);
  const [movingParticipantRole, setMovingParticipantRole] = useState<"driver" | "passenger">("passenger");
  const [targetVehicleId, setTargetVehicleId] = useState<string>("");
  const [targetLegId, setTargetLegId] = useState<string>(legs[0]?.id ?? "");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkLegId, setLinkLegId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [linkingVehicle, setLinkingVehicle] = useState(false);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleLegId, setScheduleLegId] = useState<string>("");
  const [scheduleVehicleId, setScheduleVehicleId] = useState<string>("");
  const [scheduleFormState, setScheduleFormState] = useState(EMPTY_SCHEDULE);
  const [scheduleInitialState, setScheduleInitialState] = useState(EMPTY_SCHEDULE);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [bulkLegId, setBulkLegId] = useState<string>(legs[0]?.id ?? "");
  const [bulkVehicleId, setBulkVehicleId] = useState<string>("");
  const [participantRows, setParticipantRows] = useState<ParticipantRow[]>(() =>
    participants.map((participant) => ({
      id: participant.id,
      name: participant.nama
    }))
  );
  const [newParticipantName, setNewParticipantName] = useState("");
  const [participantSavingId, setParticipantSavingId] = useState<string | null>(null);
  const [participantDeletingId, setParticipantDeletingId] = useState<string | null>(null);
  const [participantCreating, setParticipantCreating] = useState(false);
  const hasLegs = legs.length > 0;
  const lastParticipantId = useMemo(() => (participants.length === 1 ? participants[0]?.id : null), [participants]);

  const participantsById = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants]);
  const scheduleContext = useMemo(() => {
    if (!scheduleLegId || !scheduleVehicleId) {
      return null;
    }
    const leg = legs.find((item) => item.id === scheduleLegId);
    const vehicle = leg?.vehicles.find((item) => item.id === scheduleVehicleId);
    return leg && vehicle ? { leg, vehicle } : null;
  }, [legs, scheduleLegId, scheduleVehicleId]);
  const flattenedVehicles = useMemo(() => {
    return legs.flatMap((leg) =>
      leg.vehicles.map((vehicle) => ({
        legId: leg.id,
        legLabel: leg.label,
        id: vehicle.id,
        label: vehicle.label,
        plateNumber: vehicle.plateNumber,
        assignments: vehicle.assignments,
        departureTime: vehicle.departureTime
      }))
    );
  }, [legs]);

  const selectedSet = useMemo(() => new Set(selectedParticipantIds), [selectedParticipantIds]);

  const toggleParticipantSelection = (participantId: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(participantId) ? prev.filter((id) => id !== participantId) : [...prev, participantId]
    );
  };

  const clearSelectedParticipants = () => setSelectedParticipantIds([]);

  const participantAssignments = useMemo(() => {
    const map = new Map<string, { total: number; legs: string[] }>();
    flattenedVehicles.forEach((vehicle) => {
      vehicle.assignments.forEach((assignment) => {
        const current = map.get(assignment.participantId) ?? { total: 0, legs: [] };
        current.total += 1;
        if (!current.legs.includes(vehicle.legLabel)) {
          current.legs.push(vehicle.legLabel);
        }
        map.set(assignment.participantId, current);
      });
    });
    return map;
  }, [flattenedVehicles]);

  const confirmAction = (message: string) => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.confirm(message);
  };

  useEffect(() => {
    setParticipantRows(
      participants.map((participant) => ({
        id: participant.id,
        name: participant.nama
      }))
    );
  }, [participants]);

  useEffect(() => {
    if (!legs.length) {
      setBulkLegId("");
      setBulkVehicleId("");
      return;
    }
    if (!legs.some((leg) => leg.id === bulkLegId)) {
      setBulkLegId(legs[0].id);
    }
  }, [legs, bulkLegId]);

  useEffect(() => {
    if (!bulkLegId) {
      setBulkVehicleId("");
      return;
    }
    const leg = legs.find((item) => item.id === bulkLegId);
    if (!leg || !leg.vehicles.length) {
      setBulkVehicleId("");
      return;
    }
    if (!leg.vehicles.some((vehicle) => vehicle.id === bulkVehicleId)) {
      setBulkVehicleId(leg.vehicles[0].id);
    }
  }, [bulkLegId, bulkVehicleId, legs]);

  const availableFleetForLeg = (legId: string) => {
    const leg = legs.find((item) => item.id === legId);
    if (!leg) {
      return [];
    }
    const used = new Set(leg.vehicles.map((vehicle) => vehicle.id));
    return fleet.filter((vehicle) => !used.has(vehicle.id));
  };

  const handleParticipantRowChange = (participantId: string, value: string) => {
    setParticipantRows((prev) =>
      prev.map((row) => (row.id === participantId ? { ...row, name: value } : row))
    );
  };

  const handleSaveParticipant = async (participantId: string) => {
    const row = participantRows.find((item) => item.id === participantId);
    if (!row) return;

    const trimmedName = row.name.trim();

    if (!trimmedName) {
      setStatusMessage("Nama peserta tidak boleh kosong.");
      return;
    }

    if (!confirmAction(`Simpan perubahan untuk ${trimmedName}?`)) {
      setStatusMessage("Perubahan peserta dibatalkan.");
      return;
    }

    setParticipantSavingId(participantId);
    setStatusMessage("Menyimpan perubahan peserta...");

    const response = await fetch(`/api/trips/${tripId}/participants/${participantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName })
    });

    setParticipantSavingId(null);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal memperbarui peserta.");
      return;
    }

    setStatusMessage("Peserta diperbarui.");
    router.refresh();
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (participantId === lastParticipantId) {
      setStatusMessage("Perjalanan minimal punya satu peserta.");
      return;
    }

    const participantName = participantsById.get(participantId)?.nama ?? "peserta ini";

    if (!confirmAction(`Hapus ${participantName} dari perjalanan?`)) {
      setStatusMessage("Penghapusan peserta dibatalkan.");
      return;
    }

    setParticipantDeletingId(participantId);
    setStatusMessage("Menghapus peserta...");

    const response = await fetch(`/api/trips/${tripId}/participants/${participantId}`, {
      method: "DELETE"
    });

    setParticipantDeletingId(null);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal menghapus peserta.");
      return;
    }

    setStatusMessage("Peserta dihapus.");
    router.refresh();
  };

  const handleCreateParticipant = async () => {
    if (!newParticipantName.trim()) {
      setStatusMessage("Isi nama peserta baru terlebih dahulu.");
      return;
    }

    setParticipantCreating(true);
    setStatusMessage("Menambahkan peserta...");

    const response = await fetch(`/api/trips/${tripId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newParticipantName.trim() })
    });

    setParticipantCreating(false);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal menambahkan peserta.");
      return;
    }

    setNewParticipantName("");
    setStatusMessage("Peserta ditambahkan.");
    router.refresh();
  };

  const handleOpenVehicleForm = () => {
    setVehicleFormState(EMPTY_VEHICLE);
    setShowVehicleForm(true);
  };

  const handleSaveVehicle = async () => {
    if (!vehicleFormState.label.trim()) {
      setStatusMessage("Nama kendaraan wajib diisi.");
      return;
    }

    setSavingVehicle(true);
    setStatusMessage("Menyimpan kendaraan...");

    const response = await fetch(`/api/trips/${tripId}/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: vehicleFormState.label.trim(),
        plateNumber: vehicleFormState.plateNumber.trim() || null,
        seatCapacity: vehicleFormState.seatCapacity,
        notes: vehicleFormState.notes.trim() || null
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal simpan kendaraan.");
      setSavingVehicle(false);
      return;
    }

    setStatusMessage("Kendaraan ditambahkan.");
    setSavingVehicle(false);
    setShowVehicleForm(false);
    router.refresh();
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!vehicleId) {
      return;
    }

    const targetVehicle = fleet.find((vehicle) => vehicle.id === vehicleId);
    if (!targetVehicle) {
      setStatusMessage("Kendaraan tidak ditemukan.");
      return;
    }

    if (!confirmAction(`Hapus ${targetVehicle.label} dari daftar trip?`)) {
      setStatusMessage("Penghapusan kendaraan dibatalkan.");
      return;
    }

    setDeletingVehicleId(vehicleId);
    setStatusMessage("Menghapus kendaraan...");

    const response = await fetch(`/api/trips/${tripId}/vehicles/${vehicleId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal menghapus kendaraan.");
      setDeletingVehicleId(null);
      return;
    }

    setStatusMessage("Kendaraan dihapus.");
    setDeletingVehicleId(null);
    router.refresh();
  };

  const handleOpenLegForm = () => {
    setLegFormState(EMPTY_LEG);
    setShowLegForm(true);
  };

  const handleSaveLeg = async () => {
    if (!legFormState.origin.trim()) {
      setStatusMessage("Asal leg wajib diisi.");
      return;
    }

    if ((legFormState.startDate && !legFormState.startTime) || (!legFormState.startDate && legFormState.startTime)) {
      setStatusMessage("Tanggal & jam leg harus diisi bersamaan.");
      return;
    }

    setSavingLeg(true);
    setStatusMessage("Menyimpan leg...");

    const startDate = legFormState.startDate || null;
    const startTime = startDate ? legFormState.startTime || "00:00" : null;

    const response = await fetch(`/api/trips/${tripId}/legs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: legFormState.origin.trim(),
        destination: legFormState.destination.trim() || null,
        startDate,
        startTime,
        notes: legFormState.notes.trim() || null
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal menambahkan leg.");
      setSavingLeg(false);
      return;
    }

    setStatusMessage("Leg ditambahkan.");
    setSavingLeg(false);
    setShowLegForm(false);
    router.refresh();
  };

  const handleOpenLinkForm = (legId: string) => {
    if (!fleet.length) {
      setStatusMessage("Buat kendaraan trip dulu sebelum menghubungkan ke leg.");
      return;
    }
    const options = availableFleetForLeg(legId);
    if (!options.length) {
      setStatusMessage("Semua kendaraan sudah terhubung pada leg ini. Tambah kendaraan baru untuk melanjutkan.");
      return;
    }
    setLinkLegId(legId);
    setSelectedVehicleId(options[0]?.id ?? "");
    setShowLinkForm(true);
  };

  const handleOpenScheduleForm = (leg: TripLeg, vehicle: TripLegVehicle) => {
    setScheduleLegId(leg.id);
    setScheduleVehicleId(vehicle.id);
    const nextState = {
      startDate: isoToDateInput(vehicle.departureTime),
      startTime: isoToTimeInput(vehicle.departureTime)
    };
    setScheduleFormState(nextState);
    setScheduleInitialState(nextState);
    setScheduleMessage(null);
    setShowScheduleForm(true);
  };

  const handleCloseScheduleForm = () => {
    setShowScheduleForm(false);
    setScheduleLegId("");
     setScheduleVehicleId("");
    setScheduleMessage(null);
    setSavingSchedule(false);
    setScheduleFormState(EMPTY_SCHEDULE);
    setScheduleInitialState(EMPTY_SCHEDULE);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleLegId || !scheduleVehicleId) {
      setScheduleMessage("Pilih kendaraan dulu.");
      return;
    }

    const { startDate, startTime } = scheduleFormState;

    if ((startDate && !startTime) || (!startDate && startTime)) {
      setScheduleMessage("Lengkapi tanggal & jam terlebih dahulu.");
      return;
    }

    const startChanged =
      startDate !== scheduleInitialState.startDate || startTime !== scheduleInitialState.startTime;

    if (!startChanged) {
      setScheduleMessage("Tidak ada perubahan jadwal.");
      return;
    }

    const vehicleLabel = scheduleContext?.vehicle.label ?? "kendaraan";
    const legLabel = scheduleContext?.leg.label ?? "leg";
    if (!confirmAction(`Simpan jadwal untuk ${vehicleLabel} di ${legLabel}?`)) {
      setScheduleMessage("Perubahan jadwal dibatalkan.");
      return;
    }

    const payload: Record<string, string | null> = {
      vehicleId: scheduleVehicleId,
      departureDate: startDate || null,
      departureTime: startDate ? startTime || "00:00" : null
    };

    setSavingSchedule(true);
    setScheduleMessage("Menyimpan jadwal kendaraan...");

    const response = await fetch(`/api/trips/${tripId}/legs/${scheduleLegId}/vehicles`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setSavingSchedule(false);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setScheduleMessage(error.message || "Gagal menyimpan jadwal kendaraan.");
      return;
    }

    setStatusMessage("Jadwal kendaraan diperbarui.");
    handleCloseScheduleForm();
    router.refresh();
  };

  const handleLinkVehicle = async () => {
    if (!linkLegId || !selectedVehicleId) {
      setStatusMessage("Pilih kendaraan terlebih dahulu.");
      return;
    }

    setLinkingVehicle(true);
    setStatusMessage("Menghubungkan kendaraan...");

    const response = await fetch(`/api/trips/${tripId}/legs/${linkLegId}/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId: selectedVehicleId })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal menghubungkan kendaraan.");
      setLinkingVehicle(false);
      return;
    }

    setStatusMessage("Kendaraan ditambahkan ke leg.");
    setLinkingVehicle(false);
    setShowLinkForm(false);
    router.refresh();
  };

  const handleUnlinkVehicle = async (legId: string, vehicleId: string) => {
    const leg = legs.find((item) => item.id === legId);
    const vehicle = leg?.vehicles.find((item) => item.id === vehicleId) ?? fleet.find((item) => item.id === vehicleId);
    const vehicleLabel = vehicle?.label ?? "kendaraan";
    const legLabel = leg?.label ?? "leg";

    if (!confirmAction(`Lepas ${vehicleLabel} dari ${legLabel}?`)) {
      setStatusMessage("Pelepasan kendaraan dibatalkan.");
      return;
    }

    setStatusMessage("Melepas kendaraan dari leg...");

    const response = await fetch(`/api/trips/${tripId}/legs/${legId}/vehicles`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal melepas kendaraan.");
      return;
    }

    setStatusMessage("Kendaraan dilepas dari leg.");
    router.refresh();
  };

  const handleMoveParticipant = async () => {
    if (!movingParticipantId || !targetVehicleId || !targetLegId) {
      setStatusMessage("Pilih peserta dan kendaraan tujuan dulu.");
      return;
    }

    const participantName = participantsById.get(movingParticipantId)?.nama ?? "Peserta";
    const leg = legs.find((item) => item.id === targetLegId);
    const vehicle = leg?.vehicles.find((item) => item.id === targetVehicleId);
    const vehicleLabel = vehicle?.label ?? "kendaraan tujuan";
    const legLabel = leg?.label ?? "leg tujuan";
    const roleLabel = movingParticipantRole === "driver" ? "supir" : "penumpang";

    if (!confirmAction(`Pindahkan ${participantName} sebagai ${roleLabel} ke ${vehicleLabel} di ${legLabel}?`)) {
      setStatusMessage("Pemindahan peserta dibatalkan.");
      return;
    }

    const body = {
      legId: targetLegId,
      assignments: [
        {
          participantId: movingParticipantId,
          role: movingParticipantRole
        }
      ]
    };

    const response = await fetch(`/api/trips/${tripId}/vehicles/${targetVehicleId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal memindahkan peserta.");
      return;
    }

    setMovingParticipantId(null);
    setMovingParticipantRole("passenger");
    setTargetVehicleId("");
    setStatusMessage("Peserta dipindahkan.");
    router.refresh();
  };

  const handleBulkAssign = async () => {
    if (!selectedParticipantIds.length) {
      setStatusMessage("Pilih peserta yang ingin ditempatkan.");
      return;
    }

    if (!bulkLegId || !bulkVehicleId) {
      setStatusMessage("Pilih leg dan kendaraan tujuan.");
      return;
    }

    const assignments = selectedParticipantIds.map((participantId) => ({
      participantId,
      role: "passenger"
    }));

    setStatusMessage("Menempatkan peserta...");

    const response = await fetch(`/api/trips/${tripId}/vehicles/${bulkVehicleId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legId: bulkLegId, assignments })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal menempatkan peserta." );
      return;
    }

    setStatusMessage("Peserta berhasil ditempatkan.");
    clearSelectedParticipants();
    router.refresh();
  };

  const handleDeleteAssignment = async (legId: string, vehicleId: string, participantId: string) => {
    const participantName = participantsById.get(participantId)?.nama ?? "peserta";
    const leg = legs.find((item) => item.id === legId);
    const vehicle = leg?.vehicles.find((item) => item.id === vehicleId);
    const vehicleLabel = vehicle?.label ?? "kendaraan";
    const legLabel = leg?.label ?? "leg";

    if (!confirmAction(`Hapus ${participantName} dari ${vehicleLabel} di ${legLabel}?`)) {
      setStatusMessage("Penghapusan penumpang dibatalkan.");
      return;
    }

    setStatusMessage("Menghapus peserta dari kendaraan...");

    const response = await fetch(`/api/trips/${tripId}/vehicles/${vehicleId}/assignments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legId, participantIds: [participantId] })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal menghapus peserta dari kendaraan.");
      return;
    }

    setStatusMessage("Peserta dihapus dari kendaraan.");
    router.refresh();
  };

  const handleUpdateAssignmentRole = async (
    legId: string,
    vehicleId: string,
    participantId: string,
    role: "driver" | "passenger"
  ) => {
    const participantName = participantsById.get(participantId)?.nama ?? "Peserta";
    const roleLabel = role === "driver" ? "supir" : "penumpang";

    if (!confirmAction(`Jadikan ${participantName} sebagai ${roleLabel}?`)) {
      setStatusMessage("Perubahan peran dibatalkan.");
      return;
    }

    setStatusMessage("Memperbarui peran peserta...");

    const response = await fetch(`/api/trips/${tripId}/vehicles/${vehicleId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legId, assignments: [{ participantId, role }] })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal memperbarui peran peserta.");
      return;
    }

    setStatusMessage("Peran peserta diperbarui.");
    router.refresh();
  };

  return (
    <section className="rounded-3xl border border-dashed bg-white/80 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">Armada & penumpang</p>
          <h2 className="text-xl font-semibold text-slate-900">Kelola kendaraan perjalanan</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleOpenLegForm}
            className="flex items-center gap-2 rounded-full border border-brand-blue px-4 py-2 text-sm font-semibold text-brand-blue"
          >
            <span className="text-lg leading-none">+</span> Tambah leg
          </button>
          <button
            type="button"
            onClick={handleOpenVehicleForm}
            className="flex items-center gap-2 rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
          >
            <span className="text-lg leading-none">+</span> Tambah kendaraan trip
          </button>
        </div>
      </div>

      {statusMessage && <p className="mt-2 text-sm text-slate-500">{statusMessage}</p>}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Tambah peserta</p>
          <h3 className="text-lg font-semibold text-slate-900">Masukkan penumpang baru</h3>
          <p className="text-sm text-slate-500">Peserta baru belum otomatis ditempatkan pada kendaraan.</p>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Nama peserta
            <input
              type="text"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={newParticipantName}
              onChange={(event) => setNewParticipantName(event.target.value)}
              placeholder="Contoh: Adi Nugraha"
            />
          </label>
          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            onClick={handleCreateParticipant}
            disabled={participantCreating}
          >
            {participantCreating ? "Menambahkan..." : "Tambah peserta"}
          </button>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Data peserta</p>
          <h3 className="text-lg font-semibold text-slate-900">Edit penumpang terdaftar</h3>
          <p className="text-sm text-slate-500">Perubahan nama atau status supir langsung berlaku untuk penempatan kendaraan.</p>
          <ul className="mt-3 space-y-3 text-sm">
            {participantRows.length ? (
              participantRows.map((row) => (
                <li key={row.id} className="rounded-2xl border px-3 py-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex-1 text-xs font-semibold text-slate-500">
                      Nama
                      <input
                        type="text"
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        value={row.name}
                        onChange={(event) => handleParticipantRowChange(row.id, event.target.value)}
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        onClick={() => handleSaveParticipant(row.id)}
                        disabled={participantSavingId === row.id}
                      >
                        {participantSavingId === row.id ? "Menyimpan..." : "Simpan"}
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 disabled:opacity-60"
                        onClick={() => handleDeleteParticipant(row.id)}
                        disabled={participantDeletingId === row.id || row.id === lastParticipantId}
                      >
                        {participantDeletingId === row.id ? "Menghapus..." : "Hapus"}
                      </button>
                    </div>
                  </div>
                  {row.id === lastParticipantId && (
                    <p className="mt-2 text-xs text-slate-500">Perjalanan minimal punya satu peserta.</p>
                  )}
                </li>
              ))
            ) : (
              <li className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-slate-500">
                Belum ada peserta terdaftar.
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Armada terdaftar</p>
            <h3 className="text-lg font-semibold text-slate-900">Daftar kendaraan trip</h3>
          </div>
          <span className="text-sm text-slate-500">{fleet.length} kendaraan</span>
        </div>
        {fleet.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {fleet.map((vehicle) => (
              <li key={vehicle.id} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{vehicle.label}</p>
                    {vehicle.plateNumber && <p className="text-sm text-slate-500">Plat {vehicle.plateNumber}</p>}
                    {vehicle.seatCapacity && <p className="text-xs text-slate-500">{vehicle.seatCapacity} kursi</p>}
                  </div>
                  <button
                    type="button"
                    className={clsx(
                      "text-xs font-semibold",
                      deletingVehicleId === vehicle.id ? "text-slate-400" : "text-rose-600"
                    )}
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                    disabled={deletingVehicleId === vehicle.id}
                  >
                    {deletingVehicleId === vehicle.id ? "Menghapus..." : "Hapus"}
                  </button>
                </div>
                {vehicle.notes && <p className="mt-2 text-xs text-slate-500">{vehicle.notes}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Belum ada kendaraan. Tambah kendaraan trip terlebih dahulu.</p>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {hasLegs ? (
          legs.map((leg) => (
            <div key={leg.id} className="rounded-2xl border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Leg {leg.order}</p>
                  <h3 className="text-lg font-semibold text-slate-900">{leg.label}</h3>
                  <p className="text-xs text-slate-500">{formatScheduleLabel(leg.start)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenLinkForm(leg.id)}
                  className="text-sm font-semibold text-brand-blue"
                >
                  + Hubungkan kendaraan
                </button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {leg.vehicles.length ? (
                  leg.vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="rounded-2xl border bg-slate-50 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-slate-500">Kendaraan</p>
                          <p className="text-lg font-semibold text-slate-900">{vehicle.label}</p>
                          {vehicle.plateNumber && <p className="text-xs text-slate-500">Plat {vehicle.plateNumber}</p>}
                          <p className="text-xs text-slate-500">Berangkat: {formatScheduleLabel(vehicle.departureTime)}</p>
                          <button
                            type="button"
                            className="mt-1 text-xs font-semibold text-brand-blue"
                            onClick={() => handleOpenScheduleForm(leg, vehicle)}
                          >
                            Atur jadwal kendaraan
                          </button>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-slate-500 block">
                            {vehicle.assignments.length} orang
                          </span>
                          <button
                            type="button"
                            className="mt-1 text-xs text-rose-500"
                            onClick={() => handleUnlinkVehicle(leg.id, vehicle.id)}
                          >
                            Lepas
                          </button>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-2 text-sm">
                        {vehicle.assignments.length ? (
                          vehicle.assignments.map((assignment) => (
                            <li key={assignment.participantId} className="rounded-xl bg-white px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-medium text-slate-900">
                                  {assignment.participantName}
                                  {assignment.role === "driver" && (
                                    <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                      Supir
                                    </span>
                                  )}
                                </p>
                                <div className="flex flex-col items-end gap-1">
                                  <button
                                    type="button"
                                    className="text-xs text-rose-500"
                                    onClick={() => handleDeleteAssignment(leg.id, vehicle.id, assignment.participantId)}
                                  >
                                    Hapus
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs text-brand-blue"
                                    onClick={() =>
                                      handleUpdateAssignmentRole(
                                        leg.id,
                                        vehicle.id,
                                        assignment.participantId,
                                        assignment.role === "driver" ? "passenger" : "driver"
                                      )
                                    }
                                  >
                                    {assignment.role === "driver" ? "Jadikan penumpang" : "Jadikan supir"}
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))
                        ) : (
                          <li className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-slate-500">
                            Belum ada peserta.
                          </li>
                        )}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Belum ada kendaraan untuk leg ini.</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Belum ada leg. Tambahkan leg terlebih dahulu untuk mulai menempatkan kendaraan dan peserta.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900">Daftar penumpang</h3>
          {participants.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {participants.map((participant) => {
                const assignmentInfo = participantAssignments.get(participant.id);
                return (
                  <li key={participant.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <label className="flex flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={selectedSet.has(participant.id)}
                        onChange={() => toggleParticipantSelection(participant.id)}
                      />
                      <span>
                        <span className="font-medium text-slate-900">{participant.nama}</span>
                        <span className="block text-xs text-slate-500">
                          {assignmentInfo?.legs.length
                            ? `Terpasang di ${assignmentInfo.legs.join(", " )}`
                            : "Belum ditempatkan"}
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      className="text-xs text-brand-blue"
                      onClick={() => {
                        setMovingParticipantId(participant.id);
                        setMovingParticipantRole("passenger");
                      }}
                    >
                      Pilih tujuan
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Belum ada peserta terdaftar pada trip ini.</p>
          )}

          {selectedParticipantIds.length > 0 && hasLegs && (
            <div className="mt-4 rounded-2xl border border-dashed border-brand-blue/40 bg-brand-blue/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {selectedParticipantIds.length} peserta siap ditempatkan
                </p>
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-500"
                  onClick={clearSelectedParticipants}
                >
                  Bersihkan pilihan
                </button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Pilih leg tujuan
                  <select
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={bulkLegId}
                    onChange={(event) => setBulkLegId(event.target.value)}
                  >
                    {legs.map((leg) => (
                      <option key={leg.id} value={leg.id}>
                        Leg {leg.order} · {leg.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Pilih kendaraan
                  <select
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={bulkVehicleId}
                    onChange={(event) => setBulkVehicleId(event.target.value)}
                    disabled={!bulkLegId || !legs.find((leg) => leg.id === bulkLegId)?.vehicles.length}
                  >
                    <option value="">-- pilih --</option>
                    {flattenedVehicles
                      .filter((vehicle) => vehicle.legId === bulkLegId)
                      .map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.label} ({vehicle.assignments.length} orang · {formatScheduleLabel(vehicle.departureTime)})
                        </option>
                      ))}
                  </select>
                  {!legs.find((leg) => leg.id === bulkLegId)?.vehicles.length && (
                    <span className="mt-1 block text-xs text-rose-500">Tambahkan kendaraan ke leg ini terlebih dahulu.</span>
                  )}
                </label>
              </div>
              <button
                type="button"
                className={clsx(
                  "mt-4 w-full rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white",
                  (!bulkLegId || !bulkVehicleId) && "opacity-50"
                )}
                onClick={handleBulkAssign}
                disabled={!bulkLegId || !bulkVehicleId}
              >
                Tempatkan peserta terpilih
              </button>
            </div>
          )}
        </div>

        {movingParticipantId && (
          <div className="rounded-2xl border bg-white p-4">
            <h3 className="text-lg font-semibold text-slate-900">Pindahkan peserta</h3>
            <p className="text-sm text-slate-500">
              {participantsById.get(movingParticipantId)?.nama ?? "Peserta"}
            </p>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Pilih leg
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={targetLegId}
                onChange={(event) => setTargetLegId(event.target.value)}
              >
                {legs.map((leg) => (
                  <option key={leg.id} value={leg.id}>
                    Leg {leg.order} · {leg.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Pilih kendaraan
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={targetVehicleId}
                onChange={(event) => setTargetVehicleId(event.target.value)}
              >
                <option value="">-- pilih --</option>
                {flattenedVehicles
                  .filter((vehicle) => vehicle.legId === targetLegId)
                  .map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.label} ({vehicle.assignments.length} orang · {formatScheduleLabel(vehicle.departureTime)})
                    </option>
                  ))}
              </select>
            </label>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                Peran di kendaraan
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={movingParticipantRole}
                  onChange={(event) => setMovingParticipantRole(event.target.value as "driver" | "passenger")}
                >
                  <option value="passenger">Penumpang</option>
                  <option value="driver">Supir</option>
                </select>
              </label>
            <button
              type="button"
              className={clsx(
                "mt-4 w-full rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white",
                (!targetVehicleId || !targetLegId) && "opacity-50"
              )}
              onClick={handleMoveParticipant}
              disabled={!targetVehicleId || !targetLegId}
            >
              Pindahkan
            </button>
          </div>
        )}
      </div>

      {showVehicleForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Tambah kendaraan trip</h3>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Nama kendaraan
              <input
                type="text"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={vehicleFormState.label}
                onChange={(event) => setVehicleFormState((prev) => ({ ...prev, label: event.target.value }))}
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Plat kendaraan
              <input
                type="text"
                className="mt-1 w-full rounded-xl border px-3 py-2 uppercase"
                value={vehicleFormState.plateNumber}
                onChange={(event) => setVehicleFormState((prev) => ({ ...prev, plateNumber: event.target.value }))}
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Kapasitas kursi
              <input
                type="number"
                min={1}
                max={50}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={vehicleFormState.seatCapacity}
                onChange={(event) => setVehicleFormState((prev) => ({ ...prev, seatCapacity: Number(event.target.value) }))}
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Catatan
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2"
                rows={3}
                value={vehicleFormState.notes}
                onChange={(event) => setVehicleFormState((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="text-sm font-semibold text-slate-500" onClick={() => setShowVehicleForm(false)}>
                Batal
              </button>
              <button
                type="button"
                className="rounded-2xl bg-brand-blue px-5 py-2 text-sm font-semibold text-white"
                onClick={handleSaveVehicle}
                disabled={savingVehicle}
              >
                {savingVehicle ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLegForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Tambah leg perjalanan</h3>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Asal (origin)
              <input
                type="text"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={legFormState.origin}
                onChange={(event) => setLegFormState((prev) => ({ ...prev, origin: event.target.value }))}
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Tujuan (destination)
              <input
                type="text"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={legFormState.destination}
                onChange={(event) => setLegFormState((prev) => ({ ...prev, destination: event.target.value }))}
              />
            </label>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Tanggal leg
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={legFormState.startDate}
                  onChange={(event) => setLegFormState((prev) => ({ ...prev, startDate: event.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Jam leg
                <input
                  type="time"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={legFormState.startTime}
                  onChange={(event) => setLegFormState((prev) => ({ ...prev, startTime: event.target.value }))}
                />
              </label>
            </div>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Catatan
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2"
                rows={3}
                value={legFormState.notes}
                onChange={(event) => setLegFormState((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="text-sm font-semibold text-slate-500" onClick={() => setShowLegForm(false)}>
                Batal
              </button>
              <button
                type="button"
                className="rounded-2xl bg-brand-blue px-5 py-2 text-sm font-semibold text-white"
                onClick={handleSaveLeg}
                disabled={savingLeg}
              >
                {savingLeg ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showScheduleForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Atur jadwal kendaraan</h3>
            <p className="text-sm text-slate-500">
              Leg {scheduleContext?.leg.order ?? "-"} · {scheduleContext?.leg.label ?? "Tanpa nama"}
            </p>
            <p className="text-sm text-slate-500">
              Kendaraan: {scheduleContext?.vehicle.label ?? "Tanpa nama"}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Tanggal leg
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={scheduleFormState.startDate}
                  onChange={(event) =>
                    setScheduleFormState((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Jam leg
                <input
                  type="time"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={scheduleFormState.startTime}
                  onChange={(event) =>
                    setScheduleFormState((prev) => ({ ...prev, startTime: event.target.value }))
                  }
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500">Kosongkan dua kolom ini jika jadwal belum ditentukan.</p>
            {scheduleMessage && <p className="mt-3 text-sm text-slate-600">{scheduleMessage}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="text-sm font-semibold text-slate-500"
                onClick={handleCloseScheduleForm}
              >
                Batal
              </button>
              <button
                type="button"
                className="rounded-2xl bg-brand-blue px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
              >
                {savingSchedule ? "Menyimpan..." : "Simpan jadwal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLinkForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Pilih kendaraan untuk leg</h3>
            <p className="text-sm text-slate-500">
              Leg {legs.find((leg) => leg.id === linkLegId)?.order ?? "-"} ·
              {" "}
              {legs.find((leg) => leg.id === linkLegId)?.label ?? "Tanpa nama"}
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Kendaraan trip
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={selectedVehicleId}
                onChange={(event) => setSelectedVehicleId(event.target.value)}
              >
                {availableFleetForLeg(linkLegId).map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.label} {vehicle.plateNumber ? `(${vehicle.plateNumber})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="text-sm font-semibold text-slate-500" onClick={() => setShowLinkForm(false)}>
                Batal
              </button>
              <button
                type="button"
                className="rounded-2xl bg-brand-blue px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={handleLinkVehicle}
                disabled={!selectedVehicleId || linkingVehicle}
              >
                {linkingVehicle ? "Menghubungkan..." : "Hubungkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
