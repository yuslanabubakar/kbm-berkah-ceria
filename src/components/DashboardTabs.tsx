"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Map,
  CreditCard,
  Share2,
  BarChart3,
  Plus,
  ArrowRight,
} from "lucide-react";
import { TripCard } from "@/components/TripCard";
import { DashboardPaymentSection } from "@/components/DashboardPaymentSection";
import { TripShareManager } from "@/components/TripShareManager";
import type { Trip } from "@/types/expense";
import type { UserPaymentAccount } from "@/types/expense";
import { formatRupiah } from "@/lib/formatCurrency";

type TripSummary = Trip & {
  isOwner: boolean;
  shares: Array<{
    id: string;
    shared_with_email: string;
    can_edit: boolean;
    created_at: string;
  }>;
};

type Props = {
  trips: TripSummary[];
  userAccounts: UserPaymentAccount[];
};

const TABS = [
  { id: "trips", label: "Perjalanan", icon: Map, mobileLabel: "Trip" },
  {
    id: "payments",
    label: "Rekening Host",
    icon: CreditCard,
    mobileLabel: "Rekening",
  },
  { id: "shares", label: "Bagikan Trip", icon: Share2, mobileLabel: "Bagikan" },
  {
    id: "stats",
    label: "Statistik",
    icon: BarChart3,
    mobileLabel: "Statistik",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ── Stats Cards ──────────────────────────── */
function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div
      className="glass-card rounded-2xl p-5"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-extrabold"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ── Stat Summary Tab ─────────────────────── */
function StatsTab({ trips }: { trips: TripSummary[] }) {
  const totalSpend = trips.reduce((s, t) => s + (t.totalPengeluaran || 0), 0);
  const activeTrips = trips.filter(
    (t) => !t.tanggalSelesai || new Date(t.tanggalSelesai) >= new Date(),
  ).length;
  const finishedTrips = trips.length - activeTrips;
  const ownerTrips = trips.filter((t) => t.isOwner).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Pengeluaran"
          value={formatRupiah(totalSpend)}
          sub="Semua trip"
          color="#2E5AAC"
        />
        <StatCard
          label="Trip Aktif"
          value={activeTrips}
          sub="Sedang berjalan"
          color="#10b981"
        />
        <StatCard
          label="Trip Selesai"
          value={finishedTrips}
          sub="Riwayat perjalanan"
          color="#6366f1"
        />
        <StatCard
          label="Trip Saya"
          value={ownerTrips}
          sub="Sebagai Host"
          color="#f59e0b"
        />
      </div>

      <div className="glass-card rounded-3xl p-6">
        <h3
          className="font-semibold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Distribusi Perjalanan
        </h3>
        {trips.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Belum ada data perjalanan.
          </p>
        ) : (
          <div className="space-y-3">
            {trips.slice(0, 5).map((trip) => {
              const pct =
                totalSpend > 0
                  ? Math.round((trip.totalPengeluaran / totalSpend) * 100)
                  : 0;
              return (
                <div key={trip.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span
                      style={{ color: "var(--text-primary)" }}
                      className="font-medium truncate max-w-[180px]"
                    >
                      {trip.nama}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>{pct}%</span>
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full"
                    style={{ background: "var(--bg-muted)" }}
                  >
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: "linear-gradient(90deg, #2E5AAC, #3b82f6)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────── */
export function DashboardTabs({ trips, userAccounts }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("trips");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "done">(
    "all",
  );

  const ownerTrips = trips.filter((t) => t.isOwner);

  const filteredTrips = trips.filter((trip) => {
    const matchSearch =
      !search ||
      trip.nama.toLowerCase().includes(search.toLowerCase()) ||
      (trip.lokasi || "").toLowerCase().includes(search.toLowerCase());
    const now = new Date();
    const ended = trip.tanggalSelesai && new Date(trip.tanggalSelesai) < now;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !ended) ||
      (statusFilter === "done" && ended);
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* ── Desktop Tab Bar ─────────── */}
      <div
        className="mb-6 hidden items-center justify-between rounded-2xl p-1.5 md:flex"
        style={{
          background: "var(--bg-muted)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`tab-pill flex items-center gap-2 ${activeTab === id ? "active" : ""}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        {activeTab === "trips" && (
          <Link href="/perjalanan/baru" className="btn-primary text-xs">
            <Plus size={14} />
            Buat Trip Baru
          </Link>
        )}
      </div>

      {/* ── Tab Content ─────────────── */}
      <div className="animate-fade-in">
        {/* TRIPS TAB */}
        {activeTab === "trips" && (
          <div className="space-y-5">
            {/* Search & Filter */}
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari trip..."
                className="input-field max-w-xs flex-1 text-sm"
              />
              <div
                className="flex gap-1 rounded-xl p-1"
                style={{
                  background: "var(--bg-muted)",
                  border: "1px solid var(--border-color)",
                }}
              >
                {(["all", "active", "done"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      background:
                        statusFilter === s ? "#2E5AAC" : "transparent",
                      color:
                        statusFilter === s ? "white" : "var(--text-secondary)",
                    }}
                  >
                    {s === "all"
                      ? "Semua"
                      : s === "active"
                        ? "Aktif"
                        : "Selesai"}
                  </button>
                ))}
              </div>
            </div>

            {/* Trip Grid */}
            {filteredTrips.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2">
                {filteredTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            ) : (
              <div
                className="rounded-3xl p-12 text-center"
                style={{
                  background: "var(--bg-muted)",
                  border: "1px dashed var(--border-strong)",
                }}
              >
                <p className="text-4xl mb-3">🗺️</p>
                <p
                  className="font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {search ? "Trip tidak ditemukan" : "Belum ada perjalanan"}
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {search ? "Coba kata kunci lain" : "Yuk buat trip pertamamu!"}
                </p>
                {!search && (
                  <Link
                    href="/perjalanan/baru"
                    className="btn-primary mt-4 inline-flex"
                  >
                    <Plus size={15} />
                    Buat Perjalanan
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === "payments" && (
          <DashboardPaymentSection initialAccounts={userAccounts} />
        )}

        {/* SHARES TAB */}
        {activeTab === "shares" && (
          <div className="space-y-4">
            {ownerTrips.length > 0 ? (
              ownerTrips.map((trip) => (
                <TripShareManager
                  key={`share-${trip.id}`}
                  tripId={trip.id}
                  tripName={trip.nama}
                  shares={trip.shares}
                />
              ))
            ) : (
              <div
                className="rounded-3xl p-12 text-center"
                style={{
                  background: "var(--bg-muted)",
                  border: "1px dashed var(--border-strong)",
                }}
              >
                <p className="text-4xl mb-3">🔗</p>
                <p
                  className="font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Belum ada trip untuk dibagikan
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Buat perjalanan dulu sebagai Host untuk bisa membagikan akses.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === "stats" && <StatsTab trips={trips} />}
      </div>

      {/* ── Mobile Bottom Nav ─────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden pb-safe"
        style={{
          background: "var(--navbar-bg)",
          borderTop: "1px solid var(--border-color)",
          backdropFilter: "blur(20px)",
        }}
      >
        {TABS.map(({ id, mobileLabel, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors"
              style={{ color: active ? "#2E5AAC" : "var(--text-muted)" }}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.8}
                className="transition-transform"
                style={{ transform: active ? "scale(1.1)" : "scale(1)" }}
              />
              {mobileLabel}
            </button>
          );
        })}
      </nav>

      {/* Mobile FAB - only on trips tab */}
      {activeTab === "trips" && (
        <Link href="/perjalanan/baru" className="fab md:hidden">
          <Plus size={20} />
          Trip Baru
        </Link>
      )}

      {/* Bottom padding for mobile nav */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
