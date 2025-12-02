"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TripParticipant } from "@/lib/tripQueries";

type ParticipantManagerProps = {
  tripId: string;
  participants: TripParticipant[];
};

type EditableParticipant = {
  id: string;
  name: string;
  isDriver: boolean;
};

function toEditable(participants: TripParticipant[]): EditableParticipant[] {
  return participants.map((participant) => ({
    id: participant.id,
    name: participant.nama,
    isDriver: Boolean(participant.isDriver)
  }));
}

export function ParticipantManager({ tripId, participants }: ParticipantManagerProps) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableParticipant[]>(() => toEditable(participants));
  const [newName, setNewName] = useState("");
  const [newIsDriver, setNewIsDriver] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const lastParticipantId = useMemo(() => (participants.length === 1 ? participants[0]?.id : null), [participants]);

  useEffect(() => {
    setRows(toEditable(participants));
  }, [participants]);

  const handleRowChange = (participantId: string, field: "name" | "isDriver", value: string | boolean) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== participantId) return row;
        if (field === "name" && typeof value === "string") {
          return { ...row, name: value };
        }
        if (field === "isDriver" && typeof value === "boolean") {
          return { ...row, isDriver: value };
        }
        return row;
      })
    );
  };

  const handleSave = async (participantId: string) => {
    const row = rows.find((r) => r.id === participantId);
    if (!row) return;

    if (!row.name.trim()) {
      setStatusMessage("Nama peserta tidak boleh kosong.");
      return;
    }

    setSavingId(participantId);
    setStatusMessage("Menyimpan perubahan peserta...");

    const response = await fetch(`/api/trips/${tripId}/participants/${participantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: row.name.trim(), isDriver: row.isDriver })
    });

    setSavingId(null);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal memperbarui peserta.");
      return;
    }

    setStatusMessage("Peserta diperbarui.");
    router.refresh();
  };

  const handleDelete = async (participantId: string) => {
    if (!window.confirm("Hapus peserta ini dari perjalanan?")) {
      return;
    }

    setDeletingId(participantId);
    setStatusMessage("Menghapus peserta...");

    const response = await fetch(`/api/trips/${tripId}/participants/${participantId}`, {
      method: "DELETE"
    });

    setDeletingId(null);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal menghapus peserta.");
      return;
    }

    setStatusMessage("Peserta dihapus.");
    router.refresh();
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      setStatusMessage("Isi nama peserta baru terlebih dahulu.");
      return;
    }

    setCreating(true);
    setStatusMessage("Menambahkan peserta...");

    const response = await fetch(`/api/trips/${tripId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), isDriver: newIsDriver })
    });

    setCreating(false);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatusMessage(error.message || "Gagal menambahkan peserta.");
      return;
    }

    setNewName("");
    setNewIsDriver(false);
    setStatusMessage("Peserta ditambahkan.");
    router.refresh();
  };

  return (
    <div className="rounded-3xl border border-dashed bg-white/70 p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">Pengaturan peserta</p>
          <h2 className="text-xl font-semibold text-slate-900">Kelola daftar penumpang</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">Hanya host yang bisa ubah</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold">Tambah peserta baru</h3>
          <p className="text-sm text-slate-500">Peserta baru belum otomatis terpasang di kendaraan manapun.</p>
          <div className="mt-3 space-y-3">
            <label className="text-sm font-medium">
              Nama
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Contoh: Andi"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newIsDriver} onChange={(e) => setNewIsDriver(e.target.checked)} />
              Tandai sebagai supir
            </label>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="w-full rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-coral disabled:opacity-60"
            >
              Tambahkan peserta
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold">Peserta terdaftar</h3>
          <p className="text-sm text-slate-500">Ubah nama atau status supir kapan saja.</p>
          <ul className="mt-3 space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="rounded-xl border px-3 py-3">
                <label className="text-xs font-semibold text-slate-500">
                  Nama
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => handleRowChange(row.id, "name", e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </label>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.isDriver}
                    onChange={(e) => handleRowChange(row.id, "isDriver", e.target.checked)}
                  />
                  Supir untuk perjalanan ini
                </label>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave(row.id)}
                    disabled={savingId === row.id}
                    className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    disabled={deletingId === row.id || row.id === lastParticipantId}
                    className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 disabled:opacity-60"
                  >
                    Hapus
                  </button>
                </div>
                {row.id === lastParticipantId && (
                  <p className="mt-1 text-xs text-slate-500">Minimal harus ada satu peserta dalam perjalanan.</p>
                )}
              </li>
            ))}
            {!rows.length && <li className="text-sm text-slate-500">Belum ada peserta.</li>}
          </ul>
        </div>
      </div>

      {statusMessage && <p className="mt-4 text-sm text-slate-600">{statusMessage}</p>}
    </div>
  );
}
