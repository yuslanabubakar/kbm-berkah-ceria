"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trip } from "@/types/expense";
import { formatRupiah } from "@/lib/formatCurrency";
import { differenceInDays, format } from "date-fns";
import { id } from "date-fns/locale";

type EditTripFormState = {
  name: string;
  originCity: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
};

const toDateInputValue = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return format(parsed, "yyyy-MM-dd");
};

const buildEditState = (trip: Trip): EditTripFormState => ({
  name: trip.nama,
  originCity: trip.originCity ?? "",
  destinationCity: trip.destinationCity ?? "",
  startDate: toDateInputValue(trip.tanggalMulai),
  endDate: toDateInputValue(trip.tanggalSelesai)
});

export function TripCard({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditTripFormState>(() => buildEditState(trip));
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setEditForm(buildEditState(trip));
  }, [trip]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const durasi = differenceInDays(
    new Date(trip.tanggalSelesai ?? Date.now()),
    new Date(trip.tanggalMulai)
  ) + 1;

  return (
    <>
      <article className="relative flex flex-col rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand-blue">
        {trip.canEdit && (
          <div className="absolute right-4 top-4" ref={menuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-semibold text-slate-500 shadow-sm hover:text-slate-900"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="mt-2 w-48 rounded-2xl border border-slate-100 bg-white p-2 text-sm text-slate-600 shadow-xl">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 hover:bg-slate-50"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditStatus(null);
                    setShowEditModal(true);
                  }}
                >
                  Edit perjalanan
                  <span className="text-xs text-slate-400">⌘E</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-rose-600 hover:bg-rose-50"
                  onClick={async () => {
                    if (isDeleting) return;
                    if (typeof window !== "undefined") {
                      const confirmed = window.confirm(`Hapus perjalanan ${trip.nama}?`);
                      if (!confirmed) {
                        setMenuOpen(false);
                        return;
                      }
                    }
                    setMenuOpen(false);
                    setActionMessage(null);
                    setIsDeleting(true);
                    const response = await fetch(`/api/trips/${trip.id}`, {
                      method: "DELETE"
                    });
                    setIsDeleting(false);
                    if (!response.ok) {
                      const error = await response.json().catch(() => ({}));
                      setActionMessage(error.message || "Gagal menghapus perjalanan.");
                      return;
                    }
                    router.refresh();
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Menghapus..." : "Hapus perjalanan"}
                </button>
              </div>
            )}
          </div>
        )}
        <Link href={`/perjalanan/${trip.id}`} className="block space-y-3 pr-4">
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className="text-sm uppercase tracking-wide text-slate-500">{trip.lokasi}</p>
              <h3 className="text-xl font-semibold text-slate-900">{trip.nama}</h3>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full border px-3 py-1 text-xs text-slate-500">{durasi} hari</span>
              {!trip.canEdit && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Hanya lihat
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-600">
            {format(new Date(trip.tanggalMulai), "d MMM", { locale: id })} -
            {" "}
            {trip.tanggalSelesai
              ? format(new Date(trip.tanggalSelesai), "d MMM yyyy", { locale: id })
              : "berjalan"}
          </p>
          <p className="text-2xl font-bold text-brand-blue">{formatRupiah(trip.totalPengeluaran)}</p>
          <p className="text-sm text-slate-500">total pengeluaran</p>
        </Link>
        {actionMessage && <p className="mt-3 text-xs text-rose-600">{actionMessage}</p>}
      </article>

      {showEditModal && (
        <TripEditModal
          formState={editForm}
          onChange={(field, value) => setEditForm((prev) => ({ ...prev, [field]: value }))}
          onClose={() => {
            if (!isSavingEdit) {
              setShowEditModal(false);
              setEditStatus(null);
            }
          }}
          onSubmit={async () => {
            if (!editForm.name.trim()) {
              setEditStatus("Nama perjalanan wajib diisi.");
              return;
            }
            setEditStatus("Menyimpan perubahan...");
            setIsSavingEdit(true);
            const response = await fetch(`/api/trips/${trip.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: editForm.name.trim(),
                originCity: editForm.originCity.trim() || null,
                destinationCity: editForm.destinationCity.trim() || null,
                startDate: editForm.startDate || null,
                endDate: editForm.endDate || null
              })
            });
            setIsSavingEdit(false);
            if (!response.ok) {
              const error = await response.json().catch(() => ({}));
              setEditStatus(error.message || "Gagal menyimpan perubahan.");
              return;
            }
            setShowEditModal(false);
            setEditStatus(null);
            router.refresh();
          }}
          isSaving={isSavingEdit}
          statusMessage={editStatus}
        />
      )}
    </>
  );
}

type TripEditModalProps = {
  formState: EditTripFormState;
  onChange: (field: keyof EditTripFormState, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  statusMessage: string | null;
};

function TripEditModal({ formState, onChange, onClose, onSubmit, isSaving, statusMessage }: TripEditModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-900">Edit perjalanan</h3>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Nama perjalanan
            <input
              type="text"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={formState.name}
              onChange={(event) => onChange("name", event.target.value)}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Kota asal
              <input
                type="text"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={formState.originCity}
                onChange={(event) => onChange("originCity", event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Kota tujuan
              <input
                type="text"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={formState.destinationCity}
                onChange={(event) => onChange("destinationCity", event.target.value)}
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Tanggal mulai
              <input
                type="date"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={formState.startDate}
                onChange={(event) => onChange("startDate", event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Tanggal selesai
              <input
                type="date"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={formState.endDate}
                onChange={(event) => onChange("endDate", event.target.value)}
              />
            </label>
          </div>
        </div>
        {statusMessage && <p className="mt-4 text-sm text-slate-500">{statusMessage}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="text-sm font-semibold text-slate-500" onClick={onClose} disabled={isSaving}>
            Batal
          </button>
          <button
            type="button"
            className="rounded-2xl bg-brand-blue px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            onClick={onSubmit}
            disabled={isSaving}
          >
            {isSaving ? "Menyimpan..." : "Simpan perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
