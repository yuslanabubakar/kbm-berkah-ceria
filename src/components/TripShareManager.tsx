"use client";

import { useState } from "react";

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

export function TripShareManager({ tripId, tripName, shares: initialShares }: Props) {
  const [shares, setShares] = useState<TripShare[]>(initialShares);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/trips/${tripId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Gagal membagikan trip");
        return;
      }

      setShares([data.data, ...shares]);
      setEmail("");
      setShowForm(false);
    } catch (err) {
      setError("Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (shareId: string) => {
    if (!confirm("Hapus akses sharing?")) return;

    try {
      const response = await fetch(`/api/trips/${tripId}/shares/${shareId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        alert("Gagal menghapus sharing");
        return;
      }

      setShares(shares.filter((s) => s.id !== shareId));
    } catch (err) {
      alert("Terjadi kesalahan");
    }
  };

  return (
    <div className="rounded-2xl border bg-white/90 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{tripName}</h3>
          <p className="text-sm text-slate-500">Bagikan trip dengan orang lain</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "Batal" : "+ Bagikan"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleShare} className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <label className="block text-sm font-medium text-slate-700">
            Email pengguna
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh@email.com"
              required
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "..." : "Bagikan"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <p className="mt-2 text-xs text-slate-600">
            Pengguna dengan email ini akan bisa melihat trip (read-only)
          </p>
        </form>
      )}

      {shares.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-slate-700">Dibagikan ke:</p>
          {shares.map((share) => (
            <div
              key={share.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{share.shared_with_email}</p>
                <p className="text-xs text-slate-500">
                  Akses: Lihat saja · {new Date(share.created_at).toLocaleDateString("id-ID")}
                </p>
              </div>
              <button
                onClick={() => handleRemove(share.id)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}

      {shares.length === 0 && !showForm && (
        <p className="mt-4 text-sm text-slate-500">Belum ada sharing aktif</p>
      )}
    </div>
  );
}
