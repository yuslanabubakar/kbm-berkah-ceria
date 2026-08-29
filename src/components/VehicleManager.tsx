"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronDown, ChevronUp, Car, Route, Users, Plus } from "lucide-react";
import type {
  FleetVehicle,
  TripLeg,
  TripParticipant,
  TripLegVehicle,
} from "@/lib/tripQueries";

const EMPTY_VEHICLE = {
  label: "Minibus cadangan",
  plateNumber: "",
  seatCapacity: 7,
  notes: "",
};

const EMPTY_LEG = {
  origin: "",
  destination: "",
  startDate: "",
  startTime: "08:00",
  notes: "",
};

const EMPTY_SCHEDULE = {
  startDate: "",
  startTime: "",
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

export function VehicleManager({
  tripId,
  legs,
  participants,
  fleet,
}: VehicleManagerProps) {
  const router = useRouter();
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleFormState, setVehicleFormState] = useState(EMPTY_VEHICLE);
  const [showLegForm, setShowLegForm] = useState(false);
  const [legFormState, setLegFormState] = useState(EMPTY_LEG);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingLeg, setSavingLeg] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<{
    fleet: boolean;
    legs: boolean;
    participants: boolean;
  }>({
    fleet: false,
    legs: false,
    participants: false,
  });

  const toggleSection = (key: "fleet" | "legs" | "participants") => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [movingParticipantId, setMovingParticipantId] = useState<string | null>(
    null,
  );
  const [movingParticipantRole, setMovingParticipantRole] = useState<
    "driver" | "passenger"
  >("passenger");
  const [targetVehicleId, setTargetVehicleId] = useState<string>("");
  const [targetLegId, setTargetLegId] = useState<string>(legs[0]?.id ?? "");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkLegId, setLinkLegId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [linkingVehicle, setLinkingVehicle] = useState(false);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(
    null,
  );
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleLegId, setScheduleLegId] = useState<string>("");
  const [scheduleVehicleId, setScheduleVehicleId] = useState<string>("");
  const [scheduleFormState, setScheduleFormState] = useState(EMPTY_SCHEDULE);
  const [scheduleInitialState, setScheduleInitialState] =
    useState(EMPTY_SCHEDULE);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);
  const [bulkLegId, setBulkLegId] = useState<string>(legs[0]?.id ?? "");
  const [bulkVehicleId, setBulkVehicleId] = useState<string>("");
  const [participantRows, setParticipantRows] = useState<ParticipantRow[]>(() =>
    participants.map((participant) => ({
      id: participant.id,
      name: participant.nama,
    })),
  );
  const [newParticipantName, setNewParticipantName] = useState("");
  const [participantSavingId, setParticipantSavingId] = useState<string | null>(
    null,
  );
  const [participantDeletingId, setParticipantDeletingId] = useState<
    string | null
  >(null);
  const [participantCreating, setParticipantCreating] = useState(false);
  const hasLegs = legs.length > 0;
  const lastParticipantId = useMemo(
    () => (participants.length === 1 ? participants[0]?.id : null),
    [participants],
  );

  const participantsById = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  );
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
        departureTime: vehicle.departureTime,
      })),
    );
  }, [legs]);

  const selectedSet = useMemo(
    () => new Set(selectedParticipantIds),
    [selectedParticipantIds],
  );

  const toggleParticipantSelection = (participantId: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId],
    );
  };

  const clearSelectedParticipants = () => setSelectedParticipantIds([]);

  const participantAssignments = useMemo(() => {
    const map = new Map<string, { total: number; legs: string[] }>();
    flattenedVehicles.forEach((vehicle) => {
      vehicle.assignments.forEach((assignment) => {
        const current = map.get(assignment.participantId) ?? {
          total: 0,
          legs: [],
        };
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
        name: participant.nama,
      })),
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
      prev.map((row) =>
        row.id === participantId ? { ...row, name: value } : row,
      ),
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

    const response = await fetch(
      `/api/trips/${tripId}/participants/${participantId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      },
    );

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

    const participantName =
      participantsById.get(participantId)?.nama ?? "peserta ini";

    if (!confirmAction(`Hapus ${participantName} dari perjalanan?`)) {
      setStatusMessage("Penghapusan peserta dibatalkan.");
      return;
    }

    setParticipantDeletingId(participantId);
    setStatusMessage("Menghapus peserta...");

    const response = await fetch(
      `/api/trips/${tripId}/participants/${participantId}`,
      {
        method: "DELETE",
      },
    );

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
      body: JSON.stringify({ name: newParticipantName.trim() }),
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
        notes: vehicleFormState.notes.trim() || null,
      }),
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
      method: "DELETE",
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

    if (
      (legFormState.startDate && !legFormState.startTime) ||
      (!legFormState.startDate && legFormState.startTime)
    ) {
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
        notes: legFormState.notes.trim() || null,
      }),
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
      setStatusMessage(
        "Buat kendaraan trip dulu sebelum menghubungkan ke leg.",
      );
      return;
    }
    const options = availableFleetForLeg(legId);
    if (!options.length) {
      setStatusMessage(
        "Semua kendaraan sudah terhubung pada leg ini. Tambah kendaraan baru untuk melanjutkan.",
      );
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
      startTime: isoToTimeInput(vehicle.departureTime),
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
      startDate !== scheduleInitialState.startDate ||
      startTime !== scheduleInitialState.startTime;

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
      departureTime: startDate ? startTime || "00:00" : null,
    };

    setSavingSchedule(true);
    setScheduleMessage("Menyimpan jadwal kendaraan...");

    const response = await fetch(
      `/api/trips/${tripId}/legs/${scheduleLegId}/vehicles`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

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

    const response = await fetch(
      `/api/trips/${tripId}/legs/${linkLegId}/vehicles`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: selectedVehicleId }),
      },
    );

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
    const vehicle =
      leg?.vehicles.find((item) => item.id === vehicleId) ??
      fleet.find((item) => item.id === vehicleId);
    const vehicleLabel = vehicle?.label ?? "kendaraan";
    const legLabel = leg?.label ?? "leg";

    if (!confirmAction(`Lepas ${vehicleLabel} dari ${legLabel}?`)) {
      setStatusMessage("Pelepasan kendaraan dibatalkan.");
      return;
    }

    setStatusMessage("Melepas kendaraan dari leg...");

    const response = await fetch(
      `/api/trips/${tripId}/legs/${legId}/vehicles`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId }),
      },
    );

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

    const participantName =
      participantsById.get(movingParticipantId)?.nama ?? "Peserta";
    const leg = legs.find((item) => item.id === targetLegId);
    const vehicle = leg?.vehicles.find((item) => item.id === targetVehicleId);
    const vehicleLabel = vehicle?.label ?? "kendaraan tujuan";
    const legLabel = leg?.label ?? "leg tujuan";
    const roleLabel =
      movingParticipantRole === "driver" ? "supir" : "penumpang";

    if (
      !confirmAction(
        `Pindahkan ${participantName} sebagai ${roleLabel} ke ${vehicleLabel} di ${legLabel}?`,
      )
    ) {
      setStatusMessage("Pemindahan peserta dibatalkan.");
      return;
    }

    const body = {
      legId: targetLegId,
      assignments: [
        {
          participantId: movingParticipantId,
          role: movingParticipantRole,
        },
      ],
    };

    const response = await fetch(
      `/api/trips/${tripId}/vehicles/${targetVehicleId}/assignments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

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
      role: "passenger",
    }));

    setStatusMessage("Menempatkan peserta...");

    const response = await fetch(
      `/api/trips/${tripId}/vehicles/${bulkVehicleId}/assignments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legId: bulkLegId, assignments }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal menempatkan peserta.");
      return;
    }

    setStatusMessage("Peserta berhasil ditempatkan.");
    clearSelectedParticipants();
    router.refresh();
  };

  const handleDeleteAssignment = async (
    legId: string,
    vehicleId: string,
    participantId: string,
  ) => {
    const participantName =
      participantsById.get(participantId)?.nama ?? "peserta";
    const leg = legs.find((item) => item.id === legId);
    const vehicle = leg?.vehicles.find((item) => item.id === vehicleId);
    const vehicleLabel = vehicle?.label ?? "kendaraan";
    const legLabel = leg?.label ?? "leg";

    if (
      !confirmAction(
        `Hapus ${participantName} dari ${vehicleLabel} di ${legLabel}?`,
      )
    ) {
      setStatusMessage("Penghapusan penumpang dibatalkan.");
      return;
    }

    setStatusMessage("Menghapus peserta dari kendaraan...");

    const response = await fetch(
      `/api/trips/${tripId}/vehicles/${vehicleId}/assignments`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legId, participantIds: [participantId] }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(
        error.message || "Gagal menghapus peserta dari kendaraan.",
      );
      return;
    }

    setStatusMessage("Peserta dihapus dari kendaraan.");
    router.refresh();
  };

  const handleUpdateAssignmentRole = async (
    legId: string,
    vehicleId: string,
    participantId: string,
    role: "driver" | "passenger",
  ) => {
    const participantName =
      participantsById.get(participantId)?.nama ?? "Peserta";
    const roleLabel = role === "driver" ? "supir" : "penumpang";

    if (!confirmAction(`Jadikan ${participantName} sebagai ${roleLabel}?`)) {
      setStatusMessage("Perubahan peran dibatalkan.");
      return;
    }

    setStatusMessage("Memperbarui peran peserta...");

    const response = await fetch(
      `/api/trips/${tripId}/vehicles/${vehicleId}/assignments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legId, assignments: [{ participantId, role }] }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal memperbarui peran peserta.");
      return;
    }

    setStatusMessage("Peran peserta diperbarui.");
    router.refresh();
  };

  return (
    <section className="space-y-3 sm:space-y-4">
      {statusMessage && (
        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-700 dark:text-blue-300">
          {statusMessage}
        </div>
      )}

      {/* ─── ROW SECTION 1: MASTER KENDARAAN TRIP ─── */}
      <div className="glass-card rounded-2xl sm:rounded-3xl border border-[var(--border-color)] overflow-hidden transition-all shadow-sm">
        <div
          onClick={() => toggleSection("fleet")}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--bg-muted)]/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Car className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3
                className="text-sm sm:text-base font-bold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                Master Armada Kendaraan Trip
              </h3>
              <p className="text-[11px] text-slate-400">
                {fleet.length} armada mobil terdaftar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenVehicleForm();
              }}
              className="btn-primary !py-1 !px-3 text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tambah Mobil</span>
            </button>
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center text-slate-400">
              {openSections.fleet ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>

        {openSections.fleet && (
          <div className="p-4 sm:p-6 border-t border-[var(--border-color)] space-y-4 bg-[var(--bg-muted)]/20 animate-in fade-in duration-150">
            {fleet.length ? (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {fleet.map((vehicle) => (
                  <li
                    key={vehicle.id}
                    className="rounded-2xl p-3.5 sm:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className="text-xs sm:text-sm font-bold truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          🚗 {vehicle.label}
                        </p>
                        {vehicle.plateNumber && (
                          <p className="text-[11px] font-mono text-slate-400">
                            Plat: {vehicle.plateNumber}
                          </p>
                        )}
                        {vehicle.seatCapacity && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {vehicle.seatCapacity} kursi
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className={clsx(
                          "text-xs font-semibold px-2 py-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30",
                          deletingVehicleId === vehicle.id && "opacity-50",
                        )}
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        disabled={deletingVehicleId === vehicle.id}
                      >
                        {deletingVehicleId === vehicle.id
                          ? "Menghapus..."
                          : "Hapus"}
                      </button>
                    </div>
                    {vehicle.notes && (
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {vehicle.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-center p-4 text-slate-400">
                Belum ada armada mobil. Klik &quot;+ Tambah Mobil&quot; untuk
                mendaftarkan kendaraan.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ─── ROW SECTION 2: PENGATURAN ETAPE & ARMADA (LEGS) ─── */}
      <div className="glass-card rounded-2xl sm:rounded-3xl border border-[var(--border-color)] overflow-hidden transition-all shadow-sm">
        <div
          onClick={() => toggleSection("legs")}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--bg-muted)]/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Route className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3
                className="text-sm sm:text-base font-bold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                Pengaturan Etape (Leg) & Armada
              </h3>
              <p className="text-[11px] text-slate-400">
                {legs.length} etape perjalanan · Hubungkan armada & jadwal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenLegForm();
              }}
              className="btn-secondary !py-1 !px-3 text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tambah Etape</span>
            </button>
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center text-slate-400">
              {openSections.legs ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>

        {openSections.legs && (
          <div className="p-4 sm:p-6 border-t border-[var(--border-color)] space-y-4 bg-[var(--bg-muted)]/20 animate-in fade-in duration-150">
            {hasLegs ? (
              <div className="space-y-4">
                {legs.map((leg) => (
                  <div
                    key={leg.id}
                    className="rounded-2xl p-4 sm:p-5 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[var(--border-color)]">
                      <div>
                        <span className="badge badge-blue text-[10px] mb-1">
                          Leg {leg.order}
                        </span>
                        <h4
                          className="text-sm sm:text-base font-bold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {leg.label}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {formatScheduleLabel(leg.start)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenLinkForm(leg.id)}
                        className="btn-primary !py-1 !px-3 text-xs font-bold"
                      >
                        + Hubungkan Mobil
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {leg.vehicles.length ? (
                        leg.vehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className="rounded-xl p-3.5 bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p
                                  className="text-xs sm:text-sm font-bold"
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  🚗 {vehicle.label}
                                </p>
                                {vehicle.plateNumber && (
                                  <p className="text-[10px] font-mono text-slate-400">
                                    {vehicle.plateNumber}
                                  </p>
                                )}
                                <p className="text-[10px] text-slate-400">
                                  Berangkat:{" "}
                                  {formatScheduleLabel(vehicle.departureTime)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenScheduleForm(leg, vehicle)
                                  }
                                  className="btn-ghost !py-0.5 !px-2 text-[10px]"
                                >
                                  Jadwal
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUnlinkVehicle(leg.id, vehicle.id)
                                  }
                                  className="text-rose-500 hover:underline text-[10px] px-1"
                                >
                                  Lepas
                                </button>
                              </div>
                            </div>

                            {/* Passenger list */}
                            {vehicle.assignments.length ? (
                              <ul className="space-y-1.5 pt-1">
                                {vehicle.assignments.map((assignment) => (
                                  <li
                                    key={assignment.participantId}
                                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-xs"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="font-semibold truncate">
                                        {assignment.participantName}
                                      </span>
                                      {assignment.role === "driver" && (
                                        <span className="badge badge-blue text-[9px] py-0 px-1 font-bold shrink-0">
                                          Supir
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 text-[10px]">
                                      <button
                                        type="button"
                                        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                        onClick={() =>
                                          handleUpdateAssignmentRole(
                                            leg.id,
                                            vehicle.id,
                                            assignment.participantId,
                                            assignment.role === "driver"
                                              ? "passenger"
                                              : "driver",
                                          )
                                        }
                                      >
                                        {assignment.role === "driver"
                                          ? "Jadikan Penumpang"
                                          : "Jadikan Supir"}
                                      </button>
                                      <span className="text-slate-300">·</span>
                                      <button
                                        type="button"
                                        className="text-rose-500 hover:underline"
                                        onClick={() =>
                                          handleDeleteAssignment(
                                            leg.id,
                                            vehicle.id,
                                            assignment.participantId,
                                          )
                                        }
                                      >
                                        Hapus
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic">
                                Belum ada penumpang di mobil ini.
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic p-3 col-span-2">
                          Belum ada kendaraan yang dihubungkan ke leg ini.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-center p-4 text-slate-400">
                Belum ada etape rute. Klik &quot;+ Tambah Etape&quot; untuk
                membuat leg rute perjalanan.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ─── ROW SECTION 3: PENEMPATAN & PEMBAGIAN PENUMPANG ─── */}
      <div className="glass-card rounded-2xl sm:rounded-3xl border border-[var(--border-color)] overflow-hidden transition-all shadow-sm">
        <div
          onClick={() => toggleSection("participants")}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--bg-muted)]/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3
                className="text-sm sm:text-base font-bold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                Penempatan & Pembagian Penumpang
              </h3>
              <p className="text-[11px] text-slate-400">
                {participants.length} peserta · Penugasan mobil & supir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="badge badge-purple text-[10px] font-bold">
              {participants.length} Orang
            </span>
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center text-slate-400">
              {openSections.participants ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>

        {openSections.participants && (
          <div className="p-4 sm:p-6 border-t border-[var(--border-color)] space-y-4 bg-[var(--bg-muted)]/20 animate-in fade-in duration-150">
            {/* Participant list with Atur Mobil */}
            {participants.length ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {participants.map((participant) => {
                  const assignmentInfo = participantAssignments.get(
                    participant.id,
                  );
                  return (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm"
                    >
                      <label className="flex flex-1 items-center gap-2.5 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded text-blue-600"
                          checked={selectedSet.has(participant.id)}
                          onChange={() =>
                            toggleParticipantSelection(participant.id)
                          }
                        />
                        <div className="min-w-0">
                          <p
                            className="font-bold text-xs sm:text-sm truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {participant.nama}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {assignmentInfo?.legs.length
                              ? `Di: ${assignmentInfo.legs.join(", ")}`
                              : "Belum ditempatkan"}
                          </p>
                        </div>
                      </label>

                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600/10 text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white transition-all shrink-0"
                        onClick={() => {
                          setMovingParticipantId(participant.id);
                          setMovingParticipantRole("passenger");
                        }}
                      >
                        🚗 Atur Mobil
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-center p-4 text-slate-400">
                Belum ada peserta terdaftar.
              </p>
            )}

            {/* Bulk assign box */}
            {selectedParticipantIds.length > 0 && hasLegs && (
              <div className="mt-4 p-4 rounded-2xl border border-dashed border-blue-500/40 bg-blue-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
                    {selectedParticipantIds.length} peserta terpilih untuk
                    ditempatkan
                  </p>
                  <button
                    type="button"
                    onClick={clearSelectedParticipants}
                    className="text-[11px] font-semibold text-rose-500 hover:underline"
                  >
                    Batal Pilih
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Pilih Etape Tujuan
                    <select
                      className="input-field mt-1 text-xs"
                      value={bulkLegId}
                      onChange={(e) => setBulkLegId(e.target.value)}
                    >
                      {legs.map((leg) => (
                        <option key={leg.id} value={leg.id}>
                          Leg {leg.order} · {leg.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Pilih Kendaraan
                    <select
                      className="input-field mt-1 text-xs"
                      value={bulkVehicleId}
                      onChange={(e) => setBulkVehicleId(e.target.value)}
                      disabled={
                        !bulkLegId ||
                        !legs.find((l) => l.id === bulkLegId)?.vehicles.length
                      }
                    >
                      <option value="">-- pilih mobil --</option>
                      {flattenedVehicles
                        .filter((v) => v.legId === bulkLegId)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label} ({v.assignments.length} orang)
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  className="btn-primary w-full text-xs font-bold py-2"
                  onClick={handleBulkAssign}
                  disabled={!bulkLegId || !bulkVehicleId}
                >
                  Tempatkan {selectedParticipantIds.length} Peserta Terpilih
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showVehicleForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl animate-scale-up"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
            }}
          >
            <h3
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Tambah Kendaraan Trip
            </h3>
            <label
              className="mt-4 block text-xs font-semibold mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Nama Kendaraan
              <input
                type="text"
                className="input-field mt-1"
                value={vehicleFormState.label}
                onChange={(event) =>
                  setVehicleFormState((prev) => ({
                    ...prev,
                    label: event.target.value,
                  }))
                }
                placeholder="Contoh: Avanza Hitam, Innova Reborn"
              />
            </label>
            <label
              className="mt-3 block text-xs font-semibold mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Plat Kendaraan
              <input
                type="text"
                className="input-field mt-1 uppercase font-mono"
                value={vehicleFormState.plateNumber}
                onChange={(event) =>
                  setVehicleFormState((prev) => ({
                    ...prev,
                    plateNumber: event.target.value,
                  }))
                }
                placeholder="D 1234 ABC"
              />
            </label>
            <label
              className="mt-3 block text-xs font-semibold mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Kapasitas Kursi
              <input
                type="number"
                min={1}
                max={50}
                className="input-field mt-1"
                value={vehicleFormState.seatCapacity}
                onChange={(event) =>
                  setVehicleFormState((prev) => ({
                    ...prev,
                    seatCapacity: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label
              className="mt-3 block text-xs font-semibold mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Catatan
              <textarea
                className="input-field mt-1"
                rows={2}
                value={vehicleFormState.notes}
                onChange={(event) =>
                  setVehicleFormState((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => setShowVehicleForm(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={handleSaveVehicle}
                disabled={savingVehicle}
              >
                {savingVehicle ? "Menyimpan..." : "Simpan Kendaraan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLegForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl animate-scale-up"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
            }}
          >
            <h3
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Tambah Leg Perjalanan
            </h3>
            <label
              className="mt-4 block text-xs font-semibold mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Asal (Origin)
              <input
                type="text"
                className="input-field mt-1"
                value={legFormState.origin}
                onChange={(event) =>
                  setLegFormState((prev) => ({
                    ...prev,
                    origin: event.target.value,
                  }))
                }
                placeholder="Contoh: Bandung"
              />
            </label>
            <label
              className="mt-3 block text-xs font-semibold mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Tujuan (Destination)
              <input
                type="text"
                className="input-field mt-1"
                value={legFormState.destination}
                onChange={(event) =>
                  setLegFormState((prev) => ({
                    ...prev,
                    destination: event.target.value,
                  }))
                }
                placeholder="Contoh: Jakarta"
              />
            </label>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Tanggal Leg
                <input
                  type="date"
                  className="input-field mt-1"
                  value={legFormState.startDate}
                  onChange={(event) =>
                    setLegFormState((prev) => ({
                      ...prev,
                      startDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Jam Leg
                <input
                  type="time"
                  className="input-field mt-1"
                  value={legFormState.startTime}
                  onChange={(event) =>
                    setLegFormState((prev) => ({
                      ...prev,
                      startTime: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label
              className="mt-3 block text-xs font-semibold mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Catatan
              <textarea
                className="input-field mt-1"
                rows={2}
                value={legFormState.notes}
                onChange={(event) =>
                  setLegFormState((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => setShowLegForm(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={handleSaveLeg}
                disabled={savingLeg}
              >
                {savingLeg ? "Menyimpan..." : "Simpan Leg"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showScheduleForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl animate-scale-up"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
            }}
          >
            <h3
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Atur Jadwal Kendaraan
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Leg {scheduleContext?.leg.order ?? "-"} ·{" "}
              {scheduleContext?.leg.label ?? "Tanpa nama"}
            </p>
            <p
              className="text-xs mb-3 font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              🚗 Kendaraan: {scheduleContext?.vehicle.label ?? "Tanpa nama"}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Tanggal
                <input
                  type="date"
                  className="input-field mt-1"
                  value={scheduleFormState.startDate}
                  onChange={(event) =>
                    setScheduleFormState((prev) => ({
                      ...prev,
                      startDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Jam
                <input
                  type="time"
                  className="input-field mt-1"
                  value={scheduleFormState.startTime}
                  onChange={(event) =>
                    setScheduleFormState((prev) => ({
                      ...prev,
                      startTime: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <p
              className="mt-2 text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              Kosongkan dua kolom ini jika jadwal belum ditentukan.
            </p>
            {scheduleMessage && (
              <p className="mt-3 text-xs text-amber-500">{scheduleMessage}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={handleCloseScheduleForm}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
              >
                {savingSchedule ? "Menyimpan..." : "Simpan Jadwal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLinkForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl animate-scale-up"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
            }}
          >
            <h3
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Pilih Kendaraan untuk Leg
            </h3>
            <p
              className="text-xs mt-1 mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Leg {legs.find((leg) => leg.id === linkLegId)?.order ?? "-"} ·{" "}
              {legs.find((leg) => leg.id === linkLegId)?.label ?? "Tanpa nama"}
            </p>
            <label
              className="block text-xs font-semibold mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Kendaraan Trip
              <select
                className="input-field mt-1"
                value={selectedVehicleId}
                onChange={(event) => setSelectedVehicleId(event.target.value)}
              >
                {availableFleetForLeg(linkLegId).map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.label}{" "}
                    {vehicle.plateNumber ? `(${vehicle.plateNumber})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => setShowLinkForm(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={handleLinkVehicle}
                disabled={!selectedVehicleId || linkingVehicle}
              >
                {linkingVehicle ? "Menghubungkan..." : "Hubungkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {movingParticipantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-[var(--border-color)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <h4
                  className="text-base font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Pindahkan / Pasang ke Mobil
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                  {participantsById.get(movingParticipantId)?.nama ?? "Peserta"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMovingParticipantId(null)}
                className="btn-ghost text-xs py-1 px-2.5"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3">
              <label
                className="block text-xs font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Pilih Etape / Leg
                <select
                  className="input-field mt-1 text-xs"
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

              <label
                className="block text-xs font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Pilih Kendaraan / Mobil
                <select
                  className="input-field mt-1 text-xs"
                  value={targetVehicleId}
                  onChange={(event) => setTargetVehicleId(event.target.value)}
                >
                  <option value="">-- pilih mobil --</option>
                  {flattenedVehicles
                    .filter((vehicle) => vehicle.legId === targetLegId)
                    .map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.label} ({vehicle.assignments.length} orang)
                      </option>
                    ))}
                </select>
              </label>

              <label
                className="block text-xs font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Peran di Kendaraan
                <select
                  className="input-field mt-1 text-xs"
                  value={movingParticipantRole}
                  onChange={(event) =>
                    setMovingParticipantRole(
                      event.target.value as "driver" | "passenger",
                    )
                  }
                >
                  <option value="passenger">Penumpang Biasa</option>
                  <option value="driver">🚗 Supir (Diskon 50%)</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setMovingParticipantId(null)}
                className="btn-ghost text-xs px-4 py-2"
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary text-xs px-5 py-2 font-bold disabled:opacity-50"
                onClick={handleMoveParticipant}
                disabled={!targetVehicleId || !targetLegId}
              >
                Simpan Penempatan
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
