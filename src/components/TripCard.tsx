"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trip } from "@/types/expense";
import { formatRupiah } from "@/lib/formatCurrency";
import { differenceInDays, format } from "date-fns";
import { id } from "date-fns/locale";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowRight,
  MapPin,
  Calendar,
} from "lucide-react";

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
  if (Number.isNaN(parsed.getTime())) return "";
  return format(parsed, "yyyy-MM-dd");
};

const buildEditState = (trip: Trip): EditTripFormState => ({
  name: trip.nama,
  originCity: trip.originCity ?? "",
  destinationCity: trip.destinationCity ?? "",
  startDate: toDateInputValue(trip.tanggalMulai),
  endDate: toDateInputValue(trip.tanggalSelesai),
});

/* ── Status Badge ───────────── */
function StatusBadge({ tanggalSelesai }: { tanggalSelesai?: string }) {
  const now = new Date();
  const ended = tanggalSelesai && new Date(tanggalSelesai) < now;
  if (ended) {
    return <span className="badge badge-gray">Selesai</span>;
  }
  return (
    <span className="badge badge-emerald flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
      Aktif
    </span>
  );
}

/* ── Trip Card ──────────────── */
export function TripCard({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditTripFormState>(() =>
    buildEditState(trip),
  );
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setEditForm(buildEditState(trip));
  }, [trip]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const durasi =
    differenceInDays(
      new Date(trip.tanggalSelesai ?? Date.now()),
      new Date(trip.tanggalMulai),
    ) + 1;

  const hasRoute = trip.originCity || trip.destinationCity;

  return (
    <>
      <article
        className="glass-card group relative flex flex-col rounded-3xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
        style={{ cursor: "default" }}
      >
        {/* Top accent line */}
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #2E5AAC, #FF7B6A)" }}
        />

        <div className="flex flex-col flex-1 p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <StatusBadge tanggalSelesai={trip.tanggalSelesai} />
              <h3
                className="mt-2 text-base font-bold leading-tight truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {trip.nama}
              </h3>
              {/* Route badge */}
              {hasRoute && (
                <div
                  className="mt-1.5 flex items-center gap-1.5 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <MapPin size={12} />
                  <span className="truncate">
                    {trip.originCity ?? trip.lokasi}
                    {trip.destinationCity && ` → ${trip.destinationCity}`}
                  </span>
                </div>
              )}
              {!hasRoute && trip.lokasi && (
                <div
                  className="mt-1 flex items-center gap-1 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <MapPin size={12} />
                  {trip.lokasi}
                </div>
              )}
            </div>

            {/* 3-dot menu (if editable) */}
            {trip.canEdit && (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  aria-label="Opsi trip"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((p) => !p);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105"
                  style={{
                    background: "var(--bg-muted)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-muted)",
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 top-full z-20 mt-1.5 w-44 animate-slide-down rounded-2xl p-1 shadow-glass"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      backdropFilter: "blur(16px)",
                    }}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                      style={{ color: "var(--text-primary)" }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "var(--bg-muted)";
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "transparent";
                      }}
                      onClick={() => {
                        setMenuOpen(false);
                        setEditStatus(null);
                        setShowEditModal(true);
                      }}
                    >
                      <Pencil size={14} />
                      Edit perjalanan
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                      style={{ color: "#e11d48" }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "rgba(225, 29, 72, 0.08)";
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "transparent";
                      }}
                      onClick={async () => {
                        if (isDeleting) return;
                        if (!window.confirm(`Hapus perjalanan ${trip.nama}?`)) {
                          setMenuOpen(false);
                          return;
                        }
                        setMenuOpen(false);
                        setActionMessage(null);
                        setIsDeleting(true);
                        const response = await fetch(`/api/trips/${trip.id}`, {
                          method: "DELETE",
                        });
                        setIsDeleting(false);
                        if (!response.ok) {
                          const error = await response.json().catch(() => ({}));
                          setActionMessage(
                            error.message || "Gagal menghapus perjalanan.",
                          );
                          return;
                        }
                        router.refresh();
                      }}
                      disabled={isDeleting}
                    >
                      <Trash2 size={14} />
                      {isDeleting ? "Menghapus..." : "Hapus perjalanan"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date + duration row */}
          <div
            className="mt-3 flex items-center gap-2 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <Calendar size={12} />
            <span>
              {format(new Date(trip.tanggalMulai), "d MMM", { locale: id })}
              {trip.tanggalSelesai &&
                ` – ${format(new Date(trip.tanggalSelesai), "d MMM yyyy", { locale: id })}`}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                background: "var(--bg-muted)",
                color: "var(--text-muted)",
              }}
            >
              {durasi}h
            </span>
          </div>

          {/* Spending */}
          <div className="mt-4">
            <p
              className="text-[11px] uppercase tracking-wider font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              Total pengeluaran
            </p>
            <p
              className="mt-0.5 text-2xl font-extrabold"
              style={{ color: "#2E5AAC" }}
            >
              {formatRupiah(trip.totalPengeluaran)}
            </p>
          </div>

          {actionMessage && (
            <p className="mt-2 text-xs" style={{ color: "#e11d48" }}>
              {actionMessage}
            </p>
          )}

          {/* Read-only badge */}
          {!trip.canEdit && (
            <span className="badge badge-gray mt-3 self-start text-[10px]">
              Hanya Lihat
            </span>
          )}

          {/* CTA link */}
          <Link
            href={`/perjalanan/${trip.id}`}
            className="mt-4 flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 group/link"
            style={{
              background: "rgba(46, 90, 172, 0.08)",
              color: "#2E5AAC",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "rgba(46, 90, 172, 0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "rgba(46, 90, 172, 0.08)";
            }}
          >
            <span>Lihat Detail Trip</span>
            <ArrowRight
              size={14}
              className="transition-transform group-hover/link:translate-x-1"
            />
          </Link>
        </div>
      </article>

      {/* Edit Modal */}
      {showEditModal && (
        <TripEditModal
          formState={editForm}
          onChange={(field, value) =>
            setEditForm((prev) => ({ ...prev, [field]: value }))
          }
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
                endDate: editForm.endDate || null,
              }),
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

/* ── Edit Modal ────────────── */
type TripEditModalProps = {
  formState: EditTripFormState;
  onChange: (field: keyof EditTripFormState, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  statusMessage: string | null;
};

function TripEditModal({
  formState,
  onChange,
  onClose,
  onSubmit,
  isSaving,
  statusMessage,
}: TripEditModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm md:items-center">
      <div
        className="w-full max-w-md animate-slide-up rounded-3xl p-6"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <h3
          className="text-lg font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Edit perjalanan
        </h3>
        <div className="mt-4 space-y-3">
          <label
            className="block text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Nama perjalanan
            <input
              type="text"
              className="input-field mt-1"
              value={formState.name}
              onChange={(e) => onChange("name", e.target.value)}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label
              className="block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Kota asal
              <input
                type="text"
                className="input-field mt-1"
                value={formState.originCity}
                onChange={(e) => onChange("originCity", e.target.value)}
              />
            </label>
            <label
              className="block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Kota tujuan
              <input
                type="text"
                className="input-field mt-1"
                value={formState.destinationCity}
                onChange={(e) => onChange("destinationCity", e.target.value)}
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label
              className="block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Tanggal mulai
              <input
                type="date"
                className="input-field mt-1"
                value={formState.startDate}
                onChange={(e) => onChange("startDate", e.target.value)}
              />
            </label>
            <label
              className="block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Tanggal selesai
              <input
                type="date"
                className="input-field mt-1"
                value={formState.endDate}
                onChange={(e) => onChange("endDate", e.target.value)}
              />
            </label>
          </div>
        </div>
        {statusMessage && (
          <p
            className="mt-3 text-sm"
            style={{ color: isSaving ? "var(--text-muted)" : "#e11d48" }}
          >
            {statusMessage}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={onSubmit}
            disabled={isSaving}
          >
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
