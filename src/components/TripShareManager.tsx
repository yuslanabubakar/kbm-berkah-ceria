"use client";

import { useState } from "react";
import { Share2, UserPlus, X, Trash2 } from "lucide-react";
import { useToast } from "@/components/Toast";

type TripShare = {
  id: string;
  shared_with_email: string;
  can_edit: boolean;
  created_at: string;
};

type Props = {
  tripId: string;
  tripName: string;
  shares: TripShare[];
};

export function TripShareManager({
  tripId,
  tripName,
  shares: initialShares,
}: Props) {
  const [shares, setShares] = useState<TripShare[]>(initialShares);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const showToast = useToast();

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/trips/${tripId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Gagal membagikan trip");
        return;
      }
      setShares([data.data, ...shares]);
      setEmail("");
      setShowForm(false);
      showToast(`Trip dibagikan ke ${email}`, "success");
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (shareId: string, sharedEmail: string) => {
    if (!confirm("Hapus akses sharing?")) return;
    try {
      const response = await fetch(`/api/trips/${tripId}/shares/${shareId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        showToast("Gagal menghapus sharing", "error");
        return;
      }
      setShares(shares.filter((s) => s.id !== shareId));
      showToast(`Akses ${sharedEmail} dihapus`, "success");
    } catch {
      showToast("Terjadi kesalahan", "error");
    }
  };

  return (
    <div
      className="rounded-3xl p-5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Share2 size={15} style={{ color: "#2E5AAC" }} />
            <h3
              className="font-bold text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              {tripName}
            </h3>
          </div>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {shares.length > 0
              ? `Dibagikan ke ${shares.length} orang`
              : "Belum ada sharing aktif"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
          style={{
            background: showForm
              ? "var(--bg-muted)"
              : "rgba(46, 90, 172, 0.10)",
            color: showForm ? "var(--text-secondary)" : "#2E5AAC",
            border: `1px solid ${showForm ? "var(--border-color)" : "rgba(46, 90, 172, 0.25)"}`,
          }}
        >
          {showForm ? <X size={13} /> : <UserPlus size={13} />}
          {showForm ? "Batal" : "+ Bagikan"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleShare}
          className="mt-3 rounded-2xl p-3 animate-slide-down"
          style={{
            background: "var(--bg-muted)",
            border: "1px solid var(--border-color)",
          }}
        >
          <label
            className="block text-xs font-semibold mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Email pengguna
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh@email.com"
              required
              className="input-field flex-1 text-sm"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {isLoading ? "..." : "Bagikan"}
            </button>
          </div>
          {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
          <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            Pengguna akan bisa melihat trip (read-only)
          </p>
        </form>
      )}

      {shares.length > 0 && (
        <div className="mt-3 space-y-2">
          {shares.map((share) => (
            <div
              key={share.id}
              className="flex items-center justify-between rounded-xl px-3 py-2"
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div>
                <p
                  className="text-xs font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {share.shared_with_email}
                </p>
                <p
                  className="text-[10px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Lihat saja ·{" "}
                  {new Date(share.created_at).toLocaleDateString("id-ID")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(share.id, share.shared_with_email)}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-all"
                style={{
                  background: "rgba(225, 29, 72, 0.08)",
                  color: "#e11d48",
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
