"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Settings2, Share2, SlidersHorizontal, Save } from "lucide-react";
import type { TripDetail } from "@/lib/tripQueries";
import { TripShareManager } from "@/components/TripShareManager";
import { HostControls } from "@/components/HostControls";
import { useToast } from "@/components/Toast";

type SettingsSection = "info" | "share" | "host";

type TripSettingsModalProps = {
  detail: TripDetail;
  onClose: () => void;
};

const toDateInput = (value?: string | null) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

export function TripSettingsModal({ detail, onClose }: TripSettingsModalProps) {
  const router = useRouter();
  const showToast = useToast();
  const [activeSection, setActiveSection] = useState<SettingsSection>("info");

  const [name, setName] = useState(detail.trip.nama);
  const [originCity, setOriginCity] = useState(detail.trip.originCity ?? "");
  const [destinationCity, setDestinationCity] = useState(
    detail.trip.destinationCity ?? "",
  );
  const [startDate, setStartDate] = useState(
    toDateInput(detail.trip.tanggalMulai),
  );
  const [endDate, setEndDate] = useState(
    toDateInput(detail.trip.tanggalSelesai),
  );
  const [ruleVersion, setRuleVersion] = useState<number>(
    detail.trip.ruleVersion,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError("Nama perjalanan minimal 3 karakter.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/trips/${detail.trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          originCity: originCity.trim() || null,
          destinationCity: destinationCity.trim() || null,
          startDate: startDate || null,
          endDate: endDate || null,
          ruleVersion,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Gagal memperbarui perjalanan.");
        return;
      }

      showToast("Pengaturan perjalanan berhasil diperbarui!", "success");
      router.refresh();
      onClose();
    } catch {
      setError("Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-[var(--border-color)] shadow-2xl overflow-hidden animate-in fade-in duration-150"
        style={{ background: "var(--bg-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Settings2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                className="text-sm sm:text-base font-bold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                Pengaturan Perjalanan
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {detail.trip.nama}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[var(--bg-muted)] flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
            aria-label="Tutup pengaturan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1.5 px-4 sm:px-5 pt-3 pb-2 border-b border-[var(--border-color)] shrink-0 bg-[var(--bg-muted)]/40 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSection("info")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeSection === "info"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-muted)]"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Info & Regulasi
          </button>

          {detail.permissions.isOwner && (
            <>
              <button
                type="button"
                onClick={() => setActiveSection("share")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  activeSection === "share"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-muted)]"
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                Bagikan ({detail.shares.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("host")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  activeSection === "host"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-muted)]"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Penyesuaian Saldo
              </button>
            </>
          )}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 pb-safe">
          {activeSection === "info" && (
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-bold mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Nama Perjalanan
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field text-sm font-semibold"
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    className="block text-xs font-semibold mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Kota Asal
                  </label>
                  <input
                    type="text"
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                    className="input-field text-sm"
                    placeholder="Bandung"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Kota Tujuan
                  </label>
                  <input
                    type="text"
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    className="input-field text-sm"
                    placeholder="Jakarta"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    className="block text-xs font-semibold mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              {/* Rule Version Selector */}
              <div className="rounded-2xl p-3.5 bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-2">
                <p
                  className="text-xs font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Aturan Pembagian Biaya
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setRuleVersion(2)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      ruleVersion >= 2
                        ? "bg-blue-600/10 border-blue-500/40"
                        : "bg-[var(--bg-card)] border-[var(--border-color)] opacity-75"
                    }`}
                  >
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      Regulasi Baru (Townhall PK)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Potongan supir maks 50%/mobil (dibagi rata jika &gt;1
                      supir) + peserta 1 arah +10% bobot.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleVersion(1)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      ruleVersion === 1
                        ? "bg-blue-600/10 border-blue-500/40"
                        : "bg-[var(--bg-card)] border-[var(--border-color)] opacity-75"
                    }`}
                  >
                    <p
                      className="text-xs font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Regulasi Lama (Historis)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Setiap supir diskon 50%/orang, tanpa tambahan bobot single
                      trip.
                    </p>
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-rose-500">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost text-xs px-4 py-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs px-5 py-2 font-bold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          )}

          {activeSection === "share" && detail.permissions.isOwner && (
            <TripShareManager
              tripId={detail.trip.id}
              tripName={detail.trip.nama}
              shares={detail.shares}
            />
          )}

          {activeSection === "host" && detail.permissions.isOwner && (
            <HostControls
              tripId={detail.trip.id}
              participants={detail.participants}
              expenses={detail.expenses}
              adjustments={detail.adjustments}
            />
          )}
        </div>
      </div>
    </div>
  );
}
