"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatRupiah } from "@/lib/formatCurrency";
import type { CommunityTripItem } from "@/lib/tripQueries";

type Props = {
  trips: CommunityTripItem[];
};

export function CommunityTripLedger({ trips }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "finished"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const activeCount = useMemo(
    () => trips.filter((t) => !t.isFinished).length,
    [trips],
  );
  const finishedCount = useMemo(
    () => trips.filter((t) => t.isFinished).length,
    [trips],
  );

  const filteredTrips = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trips.filter((t) => {
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.originCity || "").toLowerCase().includes(q) ||
        (t.destinationCity || "").toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !t.isFinished) ||
        (statusFilter === "finished" && t.isFinished);

      return matchSearch && matchStatus;
    });
  }, [trips, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize));

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: "all" | "active" | "finished") => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const paginatedTrips = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrips.slice(start, start + pageSize);
  }, [filteredTrips, currentPage, pageSize]);

  const startItem =
    filteredTrips.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredTrips.length);

  return (
    <div className="space-y-4">
      {/* ── Search & Filter Controls ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="input-field pl-9 py-2 text-xs sm:text-sm w-full"
            placeholder="Cari nama perjalanan / kota rute..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="text-xs text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills & Page Size */}
        <div className="flex items-center gap-1.5 justify-between sm:justify-end flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => handleStatusChange("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Semua ({trips.length})
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("active")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                statusFilter === "active"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Aktif ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("finished")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "finished"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Selesai ({finishedCount})
            </button>
          </div>

          <select
            className="input-field py-1 px-2 text-xs font-semibold rounded-xl"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            title="Jumlah per halaman"
          >
            <option value={5}>5 / hal</option>
            <option value={10}>10 / hal</option>
            <option value={20}>20 / hal</option>
          </select>
        </div>
      </div>

      {/* ── Table & Cards Content ────────────────────────────────────────── */}
      {filteredTrips.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[var(--bg-muted)] border border-dashed border-[var(--border-color)] text-xs text-slate-400 space-y-1">
          <Filter className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            Tidak ada perjalanan yang sesuai
          </p>
          <p className="text-[11px]">
            Coba ubah kata kunci pencarian atau ganti filter status di atas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border-color)]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-color)] text-slate-500 font-bold">
                  <th className="py-2.5 px-4">Nama Perjalanan</th>
                  <th className="py-2.5 px-3">Rute & Lokasi</th>
                  <th className="py-2.5 px-3">Jadwal Tanggal</th>
                  <th className="py-2.5 px-3 text-center">Peserta</th>
                  <th className="py-2.5 px-3 text-center">Armada</th>
                  <th className="py-2.5 px-4 text-right">Total Biaya</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-card)]">
                {paginatedTrips.map((trip) => {
                  const hasRoute = trip.originCity || trip.destinationCity;
                  const dateText = trip.startDate
                    ? format(new Date(trip.startDate), "d MMM yyyy", {
                        locale: localeId,
                      })
                    : "-";

                  return (
                    <tr
                      key={trip.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <span
                            className="truncate max-w-[200px]"
                            title={trip.name}
                          >
                            {trip.name}
                          </span>
                          {trip.isFinished ? (
                            <span className="badge badge-gray text-[10px] py-0 px-1.5 font-bold shrink-0">
                              Selesai
                            </span>
                          ) : (
                            <span className="badge badge-emerald text-[10px] py-0 px-1.5 font-bold flex items-center gap-1 shrink-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Aktif
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {hasRoute ? (
                          <span className="flex items-center gap-1 truncate max-w-[180px]">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">
                              {trip.originCity || "?"} ➔{" "}
                              {trip.destinationCity || "?"}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium whitespace-nowrap">
                        {dateText}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="badge badge-blue text-[11px] py-0.5 px-2 font-bold">
                          {trip.participantCount} org
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="badge badge-indigo text-[11px] py-0.5 px-2 font-bold">
                          {trip.vehicleCount} mobil
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {formatRupiah(trip.totalExpense)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/perjalanan/${trip.id}`}
                          className="btn-secondary py-1 px-2.5 text-xs font-bold inline-flex items-center gap-1"
                        >
                          <span>Detail</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Compact Cards View */}
          <div className="space-y-2 md:hidden">
            {paginatedTrips.map((trip) => {
              const hasRoute = trip.originCity || trip.destinationCity;
              const dateText = trip.startDate
                ? format(new Date(trip.startDate), "d MMM yyyy", {
                    locale: localeId,
                  })
                : "-";

              return (
                <div
                  key={trip.id}
                  className="p-3 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p
                          className="font-bold text-xs sm:text-sm truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {trip.name}
                        </p>
                        {trip.isFinished ? (
                          <span className="badge badge-gray text-[9px] py-0 px-1.5 font-bold">
                            Selesai
                          </span>
                        ) : (
                          <span className="badge badge-emerald text-[9px] py-0 px-1.5 font-bold">
                            Aktif
                          </span>
                        )}
                      </div>

                      {hasRoute && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate">
                            {trip.originCity || "?"} ➔{" "}
                            {trip.destinationCity || "?"}
                          </span>
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        📅 {dateText}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                        {formatRupiah(trip.totalExpense)}
                      </p>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <span className="badge badge-blue text-[9px] py-0 px-1 font-bold">
                          {trip.participantCount} org
                        </span>
                        <span className="badge badge-indigo text-[9px] py-0 px-1 font-bold">
                          {trip.vehicleCount} mobil
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-[var(--border-color)] flex justify-end">
                    <Link
                      href={`/perjalanan/${trip.id}`}
                      className="btn-secondary py-1 px-2.5 text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      <span>Lihat Detail</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination Footer ────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 pt-2 text-xs font-semibold text-slate-500">
            <span className="text-[11px] text-slate-400">
              Menampilkan{" "}
              <span className="font-bold text-slate-600 dark:text-slate-300">
                {startItem}-{endItem}
              </span>{" "}
              dari{" "}
              <span className="font-bold text-slate-600 dark:text-slate-300">
                {filteredTrips.length}
              </span>{" "}
              trip
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2.5 py-1 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold text-[11px]">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
