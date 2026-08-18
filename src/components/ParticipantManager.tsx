"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TripParticipant } from "@/lib/tripQueries";
import { Users, UserPlus, Check, Trash2, Shield } from "lucide-react";
import { useToast } from "@/components/Toast";

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
    isDriver: Boolean(participant.isDriver),
  }));
}

export function ParticipantManager({
  tripId,
  participants,
}: ParticipantManagerProps) {
  const router = useRouter();
  const showToast = useToast();
  const [rows, setRows] = useState<EditableParticipant[]>(() =>
    toEditable(participants),
  );
  const [newName, setNewName] = useState("");
  const [newIsDriver, setNewIsDriver] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const lastParticipantId = useMemo(
    () => (participants.length === 1 ? participants[0]?.id : null),
    [participants],
  );

  useEffect(() => {
    setRows(toEditable(participants));
  }, [participants]);

  const handleRowChange = (
    participantId: string,
    field: "name" | "isDriver",
    value: string | boolean,
  ) => {
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
      }),
    );
  };

  const handleSave = async (participantId: string) => {
    const row = rows.find((r) => r.id === participantId);
    if (!row) return;

    if (!row.name.trim()) {
      showToast("Nama peserta tidak boleh kosong", "error");
      return;
    }

    setSavingId(participantId);

    try {
      const response = await fetch(
        `/api/trips/${tripId}/participants/${participantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.name.trim(),
            isDriver: row.isDriver,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Gagal memperbarui peserta.");
      }

      showToast("Peserta berhasil diperbarui", "success");
      router.refresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Terjadi kesalahan",
        "error",
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (participantId: string) => {
    if (!window.confirm("Hapus peserta ini dari perjalanan?")) return;

    setDeletingId(participantId);

    try {
      const response = await fetch(
        `/api/trips/${tripId}/participants/${participantId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Gagal menghapus peserta.");
      }

      showToast("Peserta berhasil dihapus", "success");
      router.refresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Terjadi kesalahan",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast("Isi nama peserta baru terlebih dahulu", "error");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(`/api/trips/${tripId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), isDriver: newIsDriver }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Gagal menambahkan peserta.");
      }

      setNewName("");
      setNewIsDriver(false);
      showToast("Peserta berhasil ditambahkan", "success");
      router.refresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Terjadi kesalahan",
        "error",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="glass-card rounded-3xl p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "rgba(46, 90, 172, 0.12)" }}
          >
            <Users size={18} style={{ color: "#2E5AAC" }} />
          </div>
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Kelola Daftar Penumpang
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Atur nama penumpang dan peran supir untuk pembagian biaya
            </p>
          </div>
        </div>
        <span className="badge badge-blue text-xs flex items-center gap-1">
          <Shield size={12} />
          Host Mode
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tambah Peserta Baru */}
        <form
          onSubmit={handleCreate}
          className="rounded-2xl p-5 flex flex-col justify-between"
          style={{
            background: "var(--bg-muted)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserPlus size={16} style={{ color: "#2E5AAC" }} />
              <h3
                className="font-bold text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                Tambah Peserta Baru
              </h3>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Peserta baru dapat langsung dipasangkan ke kendaraan di bagian
              Armada.
            </p>

            <div className="space-y-3">
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Nama Peserta
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input-field"
                  placeholder="Contoh: Andi, Budi, dll"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newIsDriver}
                  onChange={(e) => setNewIsDriver(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span
                  className="text-xs font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  🚗 Tandai sebagai supir (diskon 50% biaya leg)
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="btn-primary w-full justify-center mt-5 text-sm disabled:opacity-60"
          >
            {creating ? "Menambahkan..." : "+ Tambahkan Peserta"}
          </button>
        </form>

        {/* Daftar Peserta Terdaftar */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "var(--bg-muted)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3
              className="font-bold text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              Peserta Terdaftar ({rows.length})
            </h3>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Simpan per baris
            </span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {rows.map((row) => (
              <div
                key={row.id}
                className="rounded-xl p-3.5"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) =>
                      handleRowChange(row.id, "name", e.target.value)
                    }
                    className="input-field text-sm flex-1 py-1.5"
                  />
                  <button
                    type="button"
                    onClick={() => handleSave(row.id)}
                    disabled={savingId === row.id}
                    className="flex h-8 w-8 items-center justify-center rounded-xl transition-all disabled:opacity-50"
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#047857",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                    }}
                    title="Simpan nama & status"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    disabled={
                      deletingId === row.id || row.id === lastParticipantId
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-xl transition-all disabled:opacity-30"
                    style={{
                      background: "rgba(225, 29, 72, 0.08)",
                      color: "#e11d48",
                    }}
                    title="Hapus peserta"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <label className="mt-2 flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={row.isDriver}
                    onChange={(e) =>
                      handleRowChange(row.id, "isDriver", e.target.checked)
                    }
                    className="h-3.5 w-3.5 rounded"
                  />
                  <span style={{ color: "var(--text-secondary)" }}>
                    Supir perjalanan
                  </span>
                </label>

                {row.id === lastParticipantId && (
                  <p
                    className="mt-1 text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Minimal harus ada satu peserta dalam perjalanan.
                  </p>
                )}
              </div>
            ))}
            {!rows.length && (
              <p
                className="text-sm text-center py-4"
                style={{ color: "var(--text-muted)" }}
              >
                Belum ada peserta.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
