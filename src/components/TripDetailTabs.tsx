"use client";

import { Fragment, useState } from "react";
import {
  Wallet,
  Receipt,
  Car,
  Users,
  Plus,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Check,
  Copy,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Settings2,
  X,
} from "lucide-react";
import { formatRupiah } from "@/lib/formatCurrency";
import type { BalanceRow, TripDetail } from "@/lib/tripQueries";
import type { UserPaymentAccount } from "@/types/expense";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseList } from "./ExpenseList";
import { TripPaymentManager } from "./TripPaymentManager";
import { LegVehicleOverview } from "./LegVehicleOverview";
import { ParticipantManager } from "./ParticipantManager";
import { VehicleManager } from "./VehicleManager";
import { TripSettingsModal } from "./TripSettingsModal";
import { SteeringIcon } from "@/components/icons/KbmIcons";

type TabKey = "saldo" | "pengeluaran" | "armada" | "peserta";

interface TripDetailTabsProps {
  detail: TripDetail;
  userAccounts: UserPaymentAccount[];
  lastUpdateText: string;
}

function formatWeightBadge(weight?: number): string {
  if (weight == null) return "";
  const rounded = Math.round(weight * 100) / 100;
  return `${rounded}x`;
}

function ParticipantBreakdownPanel({ saldo }: { saldo: BalanceRow }) {
  if (saldo.breakdown.length === 0 && saldo.adjustments === 0) {
    return (
      <p className="text-[11px] text-slate-400 italic">
        Belum ada rincian beban untuk peserta ini.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Rincian Porsi ({saldo.breakdown.length} nota)
      </p>
      <div className="space-y-1">
        {saldo.breakdown.map((item) => {
          const tags: string[] = [];
          if (item.isManualSplit) {
            tags.push("Makan");
          } else {
            if (item.weight != null) tags.push(formatWeightBadge(item.weight));
            if (item.isDriverOnExpense) tags.push("Supir");
            if (item.isSingleTripApplied) tags.push("1 Arah");
          }

          return (
            <div
              key={`${saldo.participantId}-${item.expenseId}`}
              className="flex items-center justify-between gap-2 text-[11px] py-1 px-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                  Leg {item.legOrder}
                </span>
                <span
                  className="font-medium truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.title}
                </span>
                {tags.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-slate-500 dark:text-slate-400 font-semibold shrink-0">
                    {tags.join(" · ")}
                  </span>
                )}
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-200 shrink-0">
                {formatRupiah(item.shareAmount)}
              </span>
            </div>
          );
        })}

        {saldo.adjustments !== 0 && (
          <div className="flex items-center justify-between gap-2 text-[11px] py-1 px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              Penyesuaian saldo (Host)
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              {saldo.adjustments > 0 ? "+" : ""}
              {formatRupiah(saldo.adjustments)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function TripDetailTabs({
  detail,
  userAccounts,
  lastUpdateText,
}: TripDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("saldo");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showQuickExpenseModal, setShowQuickExpenseModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPaymentManager, setShowPaymentManager] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedParticipantId, setExpandedParticipantId] = useState<
    string | null
  >(null);

  const isOwner = detail.permissions.isOwner;
  const canEdit = detail.permissions.canEdit;
  const isTownhallRule = detail.trip.ruleVersion >= 2;

  const activeExpenses = detail.expenses.filter((e) => !e.isExcluded);
  const totalExpense = activeExpenses.reduce(
    (sum, exp) => sum + exp.amountIdr,
    0,
  );

  const avgExpense =
    detail.participants.length > 0
      ? Math.round(totalExpense / detail.participants.length)
      : 0;

  const handleCopyAccount = (accountNumber: string, id: string) => {
    navigator.clipboard.writeText(accountNumber).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const toggleExpandParticipant = (participantId: string) => {
    setExpandedParticipantId((prev) =>
      prev === participantId ? null : participantId,
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 sm:pb-12">
      {/* ─── MODERN SEGMENTED TAB NAV + QUICK SETTINGS ──────────────────── */}
      <div className="flex items-stretch gap-1.5 sm:gap-2">
        <div className="flex-1 min-w-0 glass-card rounded-2xl p-1 sm:p-1.5 border border-[var(--border-color)]">
          <div className="grid grid-cols-4 gap-0.5 sm:gap-1">
            {/* Tab 1: Saldo & Bayar */}
            <button
              type="button"
              onClick={() => setActiveTab("saldo")}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-1.5 sm:py-2.5 px-1 sm:px-3 rounded-xl transition-all font-semibold text-[10px] sm:text-sm ${
                activeTab === "saldo"
                  ? "bg-blue-600 text-white shadow-md font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate max-w-full">Saldo</span>
            </button>

            {/* Tab 2: Pengeluaran */}
            <button
              type="button"
              onClick={() => setActiveTab("pengeluaran")}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-1.5 sm:py-2.5 px-1 sm:px-3 rounded-xl transition-all font-semibold text-[10px] sm:text-sm ${
                activeTab === "pengeluaran"
                  ? "bg-blue-600 text-white shadow-md font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate max-w-full">Nota</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full hidden sm:inline-block ${
                  activeTab === "pengeluaran"
                    ? "bg-blue-700 text-blue-100"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {detail.expenses.length}
              </span>
            </button>

            {/* Tab 3: Rute & Armada */}
            <button
              type="button"
              onClick={() => setActiveTab("armada")}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-1.5 sm:py-2.5 px-1 sm:px-3 rounded-xl transition-all font-semibold text-[10px] sm:text-sm ${
                activeTab === "armada"
                  ? "bg-blue-600 text-white shadow-md font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate max-w-full">Armada</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full hidden sm:inline-block ${
                  activeTab === "armada"
                    ? "bg-blue-700 text-blue-100"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {detail.legs.length}
              </span>
            </button>

            {/* Tab 4: Peserta */}
            <button
              type="button"
              onClick={() => setActiveTab("peserta")}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-1.5 sm:py-2.5 px-1 sm:px-3 rounded-xl transition-all font-semibold text-[10px] sm:text-sm ${
                activeTab === "peserta"
                  ? "bg-blue-600 text-white shadow-md font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate max-w-full">Peserta</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full hidden sm:inline-block ${
                  activeTab === "peserta"
                    ? "bg-blue-700 text-blue-100"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {detail.participants.length}
              </span>
            </button>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="glass-card rounded-2xl px-2.5 sm:px-3.5 border border-[var(--border-color)] flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
            title="Pengaturan Trip, Bagikan & Regulasi"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden md:inline">Atur Trip</span>
          </button>
        )}
      </div>

      {/* ─── TAB CONTENT 1: SALDO & PEMBAYARAN ───────────────────────────── */}
      {activeTab === "saldo" && (
        <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
          {/* Quick Metrics Bar (Compact High-Density) */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            <div className="p-2 sm:p-3.5 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] min-w-0">
              <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                Total Biaya
              </p>
              <p className="text-[11px] sm:text-lg font-extrabold text-blue-600 dark:text-blue-400 truncate mt-0.5">
                {formatRupiah(totalExpense)}
              </p>
            </div>

            <div className="p-2 sm:p-3.5 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] min-w-0">
              <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                Rata-rata / Org
              </p>
              <p className="text-[11px] sm:text-lg font-extrabold text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
                {formatRupiah(avgExpense)}
              </p>
            </div>

            <div className="p-2 sm:p-3.5 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] min-w-0">
              <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                Total Peserta
              </p>
              <p className="text-[11px] sm:text-lg font-extrabold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                {detail.participants.length} Orang
              </p>
            </div>
          </div>

          {/* Participant Balances (Expandable for Breakdown!) */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-color)]">
              <div>
                <h2
                  className="text-sm sm:text-base font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Rincian Saldo & Tanggungan ({detail.balances.length} Orang)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Klik nama peserta untuk lihat rincian porsi ·{" "}
                  {isTownhallRule
                    ? "Diskon supir maks 50%/mobil · 1 arah +10%"
                    : "Aturan lama (supir diskon 50%/orang)"}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Menerima
                </span>
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Perlu Transfer
                </span>
              </div>
            </div>

            {/* 1. DESKTOP & TABLET VIEW: Expandable Compact Table */}
            <div className="hidden sm:block overflow-hidden rounded-xl border border-[var(--border-color)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-muted)] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[var(--border-color)]">
                    <th className="py-2.5 px-3.5 font-bold">Peserta</th>
                    <th className="py-2.5 px-3.5 font-bold text-right">
                      Ditalangi (Paid)
                    </th>
                    <th className="py-2.5 px-3.5 font-bold text-right">
                      Porsi Beban
                    </th>
                    <th className="py-2.5 px-3.5 font-bold text-right">
                      Status / Saldo Bersih
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {detail.balances.length ? (
                    detail.balances.map((saldo, idx) => {
                      const participant = detail.participants.find(
                        (p) => p.id === saldo.participantId,
                      );
                      const isDriver = participant?.isDriver;
                      const isSingleTrip = participant?.isSingleTrip;
                      const isSurplus = saldo.balance >= 0;
                      const isExpanded =
                        expandedParticipantId === saldo.participantId;

                      return (
                        <Fragment key={saldo.participantId}>
                          <tr
                            onClick={() =>
                              toggleExpandParticipant(saldo.participantId)
                            }
                            className="hover:bg-[var(--bg-muted)]/70 transition-colors cursor-pointer"
                            style={{
                              background:
                                idx % 2 === 0
                                  ? "transparent"
                                  : "var(--bg-muted)",
                            }}
                          >
                            {/* Col 1: Name & Role */}
                            <td className="py-2.5 px-3.5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isSurplus
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {saldo.nama.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className="font-bold truncate text-xs sm:text-sm"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {saldo.nama}
                                  </span>
                                  {isDriver && (
                                    <span className="badge badge-blue text-[9px] font-bold py-0.2 px-1.5 shrink-0">
                                      <SteeringIcon
                                        size={12}
                                        className="mr-0.5"
                                      />
                                      {isTownhallRule ? "Supir" : "Supir (50%)"}
                                    </span>
                                  )}
                                  {isSingleTrip && (
                                    <span className="badge badge-amber text-[9px] font-bold py-0.2 px-1.5 shrink-0">
                                      1 Arah (+10%)
                                    </span>
                                  )}
                                  <span className="text-slate-400 ml-0.5">
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Col 2: Total Paid */}
                            <td className="py-2.5 px-3.5 text-right font-semibold text-slate-700 dark:text-slate-200">
                              {formatRupiah(saldo.totalPaid)}
                            </td>

                            {/* Col 3: Total Share */}
                            <td className="py-2.5 px-3.5 text-right font-medium text-slate-500 dark:text-slate-400">
                              {formatRupiah(saldo.totalShare)}
                            </td>

                            {/* Col 4: Net Balance Badge */}
                            <td className="py-2.5 px-3.5 text-right">
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs">
                                {isSurplus ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                                    <ArrowDownLeft className="w-3.5 h-3.5" />+
                                    Menerima {formatRupiah(saldo.balance)}
                                  </span>
                                ) : (
                                  <span className="text-rose-600 dark:text-rose-400 font-extrabold flex items-center gap-1">
                                    <ArrowUpRight className="w-3.5 h-3.5" />-
                                    Perlu Transfer{" "}
                                    {formatRupiah(Math.abs(saldo.balance))}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-[var(--bg-muted)]/60">
                              <td colSpan={4} className="px-4 py-3">
                                <ParticipantBreakdownPanel saldo={saldo} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-6 text-center text-xs text-slate-400"
                      >
                        Belum ada data perhitungan saldo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 2. MOBILE VIEW: Expandable Compact Cards */}
            <div className="space-y-1.5 sm:hidden">
              {detail.balances.length ? (
                detail.balances.map((saldo) => {
                  const participant = detail.participants.find(
                    (p) => p.id === saldo.participantId,
                  );
                  const isDriver = participant?.isDriver;
                  const isSingleTrip = participant?.isSingleTrip;
                  const isSurplus = saldo.balance >= 0;
                  const isExpanded =
                    expandedParticipantId === saldo.participantId;

                  return (
                    <div
                      key={saldo.participantId}
                      className="rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleExpandParticipant(saldo.participantId)
                        }
                        className="w-full p-2.5 flex items-center justify-between gap-2 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span
                              className="font-bold text-xs truncate"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {saldo.nama}
                            </span>
                            {isDriver && (
                              <span className="badge badge-blue text-[9px] font-bold py-0.2 px-1">
                                <SteeringIcon size={13} className="mr-1" />
                                Supir
                              </span>
                            )}
                            {isSingleTrip && (
                              <span className="badge badge-amber text-[9px] font-bold py-0.2 px-1">
                                1 Arah +10%
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            Bayar: {formatRupiah(saldo.totalPaid)} · Porsi:{" "}
                            {formatRupiah(saldo.totalShare)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-extrabold ${
                              isSurplus
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isSurplus ? "+ Terima" : "- Bayar"}{" "}
                            {formatRupiah(Math.abs(saldo.balance))}
                          </span>
                          <span className="text-slate-400">
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-2.5 pb-2.5 pt-2 border-t border-[var(--border-color)]">
                          <ParticipantBreakdownPanel saldo={saldo} />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  Belum ada data perhitungan saldo.
                </div>
              )}
            </div>
          </div>

          {/* Rekomendasi Transfer ("Siapa Bayar ke Siapa") */}
          {detail.transfers.length > 0 && (
            <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3">
              <div className="pb-2 border-b border-[var(--border-color)]">
                <h2
                  className="text-sm sm:text-base font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Rekomendasi Transfer ({detail.transfers.length} Transaksi)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Skema transfer paling ringkas untuk melunasi seluruh saldo.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {detail.transfers.map((tr, idx) => (
                  <div
                    key={`${tr.fromParticipantId}-${tr.toParticipantId}-${idx}`}
                    className="p-2.5 sm:p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 text-xs">
                      <span className="font-bold text-rose-600 dark:text-rose-400 truncate">
                        {tr.fromName}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate">
                        {tr.toName}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 shrink-0">
                      {formatRupiah(tr.amountIdr)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rekening Pembayaran Host (Compact 1-Click Copy UI) */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h2
                    className="text-sm sm:text-base font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Rekening Pembayaran & Transfer
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Tujuan transfer peserta untuk melunasi tanggungan.
                  </p>
                </div>
              </div>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => setShowPaymentManager((v) => !v)}
                  className="btn-secondary text-xs px-2.5 py-1 font-bold flex items-center gap-1"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>
                    {showPaymentManager ? "Tutup Pengaturan" : "Atur Rekening"}
                  </span>
                </button>
              )}
            </div>

            {detail.hostAccounts.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {detail.hostAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] flex items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-bold truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {acc.label}
                      </p>
                      <p className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
                        {acc.accountNumber}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        a/n {acc.accountName}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopyAccount(acc.accountNumber, acc.id)
                      }
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-300 transition-all shrink-0"
                      title="Salin Nomor Rekening"
                    >
                      {copiedId === acc.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center rounded-xl bg-[var(--bg-muted)] border border-dashed border-[var(--border-color)] text-xs text-slate-400">
                Belum ada rekening pembayaran yang dilampirkan pada trip ini.
                {isOwner &&
                  ' Klik tombol "Atur Rekening" untuk melampirkan rekening transfer.'}
              </div>
            )}

            {isOwner && showPaymentManager && (
              <div className="pt-3 border-t border-[var(--border-color)] animate-in fade-in duration-200">
                <TripPaymentManager
                  tripId={detail.trip.id}
                  tripName={detail.trip.nama}
                  attachments={detail.paymentAttachments}
                  userAccounts={userAccounts}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 2: PENGELUARAN & TAMBAH NOTA ───────────────────── */}
      {activeTab === "pengeluaran" && (
        <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 sm:p-4 glass-card rounded-2xl border border-[var(--border-color)]">
            <div>
              <h2
                className="text-sm sm:text-base font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Daftar Pengeluaran & Nota ({detail.expenses.length})
              </h2>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                <span>Update: {lastUpdateText}</span>
              </p>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => setShowAddExpense((v) => !v)}
                className="btn-primary px-3.5 py-1.5 sm:py-2 text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
              >
                {showAddExpense ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Tutup Form</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Catat Nota Baru</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Collapsible Expense Form */}
          {canEdit && showAddExpense && (
            <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 border-2 border-blue-500/30 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-color)]">
                <div>
                  <h3
                    className="text-sm sm:text-base font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Tambah Pengeluaran / Nota Baru
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Masukkan rincian nota atau porsi makan untuk dihitung ke
                    pembagian biaya.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="btn-ghost text-xs py-1 px-2"
                >
                  Tutup
                </button>
              </div>

              <ExpenseForm
                tripId={detail.trip.id}
                participants={detail.participants}
                legs={detail.legs}
                ruleVersion={detail.trip.ruleVersion}
              />
            </div>
          )}

          {/* Expense List */}
          <div className="space-y-3">
            <ExpenseList
              tripId={detail.trip.id}
              expenses={detail.expenses}
              participants={detail.participants}
              legs={detail.legs}
              canEdit={canEdit}
            />
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 3: RUTE & ARMADA ────────────────────────────────── */}
      {activeTab === "armada" && (
        <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
          <LegVehicleOverview
            tripId={detail.trip.id}
            legs={detail.legs}
            participants={detail.participants}
            canEdit={isOwner}
            ruleVersion={detail.trip.ruleVersion}
          />

          {isOwner && (
            <VehicleManager
              tripId={detail.trip.id}
              legs={detail.legs}
              participants={detail.participants}
              fleet={detail.fleetVehicles}
            />
          )}
        </div>
      )}

      {/* ─── TAB CONTENT 4: PESERTA ──────────────────────────────────────── */}
      {activeTab === "peserta" && (
        <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
          {isOwner ? (
            <ParticipantManager
              tripId={detail.trip.id}
              participants={detail.participants}
            />
          ) : (
            <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3">
              <h2
                className="text-sm sm:text-base font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Daftar Peserta Perjalanan ({detail.participants.length} Orang)
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {detail.participants.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] flex items-center justify-between gap-2"
                  >
                    <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {p.nama}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {p.isDriver && (
                        <span className="badge badge-blue text-[9px] font-bold">
                          <SteeringIcon size={13} className="mr-1" />
                          Supir
                        </span>
                      )}
                      {p.isSingleTrip && (
                        <span className="badge badge-amber text-[9px] font-bold">
                          1 Arah +10%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── QUICK "+ NOTA" FLOATING ACTION BUTTON (Any Tab) ─────────────── */}
      {canEdit && (
        <button
          type="button"
          onClick={() => setShowQuickExpenseModal(true)}
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
          className="fixed right-4 sm:right-5 z-40 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-xl hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Nota</span>
        </button>
      )}

      {/* ─── QUICK EXPENSE MODAL ─────────────────────────────────────────── */}
      {canEdit && showQuickExpenseModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setShowQuickExpenseModal(false)}
        >
          <div
            className="w-full max-w-xl max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-[var(--border-color)] shadow-2xl overflow-hidden animate-in fade-in duration-150"
            style={{ background: "var(--bg-card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-[var(--border-color)] shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3
                  className="text-sm sm:text-base font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Catat Nota Cepat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickExpenseModal(false)}
                className="w-8 h-8 rounded-xl bg-[var(--bg-muted)] flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Tutup form nota"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto pb-safe">
              <ExpenseForm
                tripId={detail.trip.id}
                participants={detail.participants}
                legs={detail.legs}
                ruleVersion={detail.trip.ruleVersion}
                embedded
                onSuccess={() => setShowQuickExpenseModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── TRIP SETTINGS MODAL (Info, Regulasi, Bagikan, HostControls) ─── */}
      {canEdit && showSettingsModal && (
        <TripSettingsModal
          detail={detail}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
}
