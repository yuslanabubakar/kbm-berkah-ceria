"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Car,
  Users,
  CheckCircle2,
  ChevronLeft,
  Plus,
  Trash2,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowRight,
  Receipt,
  Route,
  Copy,
  Utensils,
  CreditCard,
  Building,
  Smartphone,
  Banknote,
} from "lucide-react";
import { formatRupiah } from "@/lib/formatCurrency";
import type { UserPaymentAccount, HostPaymentChannel } from "@/types/expense";
import {
  DEFAULT_VEHICLE_LABEL,
  DEFAULT_PARTICIPANTS,
  DriverMap,
  LegItem,
  VehicleItem,
  InitialExpenseItem,
  LegAssignmentMap,
  EXPENSE_CATEGORIES,
  detectExpenseCategory,
  getTodayDateString,
  parseParticipantsList,
  validateStep1,
  validateStep2,
  validateExpenseItem,
  buildFullCreateTripPayload,
} from "./createTripFormUtils";

type Step = 1 | 2 | 3 | 4;

interface ApiResponse {
  message: string;
  data?: { tripId: string };
}

interface CreateTripFormProps {
  initialUserAccounts?: UserPaymentAccount[];
}

export function CreateTripForm({
  initialUserAccounts = [],
}: CreateTripFormProps) {
  const router = useRouter();

  // Current active step
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Step 1: Trip Info & Legs
  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState("");
  const [legs, setLegs] = useState<LegItem[]>([
    { id: "leg-1", origin: "Bandung", destination: "Jakarta" },
  ]);

  // Step 2: Fleet Vehicles & Participants
  const [vehicles, setVehicles] = useState<VehicleItem[]>([
    { id: "v-1", label: "Avanza Utama", plateNumber: "" },
  ]);
  const [participants, setParticipants] =
    useState<string[]>(DEFAULT_PARTICIPANTS);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [driverMap, setDriverMap] = useState<DriverMap>({});
  const [participantVehicleMap, setParticipantVehicleMap] = useState<
    Record<string, string>
  >({});

  // Per-Leg assignment mapping: legId -> participantName -> { vehicleId, isDriver, isParticipating }
  const [legAssignmentMap, setLegAssignmentMap] = useState<LegAssignmentMap>(
    {},
  );
  const [activeLegTabId, setActiveLegTabId] = useState<string>("");

  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");

  // Step 3: Initial Expenses, Food Stop & Payment Accounts
  const [expensesList, setExpensesList] = useState<InitialExpenseItem[]>([]);
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState<number | "">("");
  const [expPayer, setExpPayer] = useState("");
  const [expCategory, setExpCategory] = useState("lainnya");
  const [expVehicleId, setExpVehicleId] = useState<string>("all");
  const [expLegId, setExpLegId] = useState<string>("");
  const [expNotes, setExpNotes] = useState("");

  // Food Stop State
  const [isFoodStop, setIsFoodStop] = useState(false);
  const [foodStopAmounts, setFoodStopAmounts] = useState<
    Record<string, number>
  >({});

  // Payment Accounts State (Default empty, minimalist collapsible picker)
  const [userAccounts, setUserAccounts] =
    useState<UserPaymentAccount[]>(initialUserAccounts);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [showAccountsPicker, setShowAccountsPicker] = useState(false);
  const [showNewAccountForm, setShowNewAccountForm] = useState(false);
  const [newAccountLabel, setNewAccountLabel] = useState("");
  const [newAccountChannel, setNewAccountChannel] =
    useState<HostPaymentChannel>("bank");
  const [newAccountProvider, setNewAccountProvider] = useState("BCA");
  const [newAccountOwner, setNewAccountOwner] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newAccountInstructions, setNewAccountInstructions] = useState("");
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  // Status & submission
  const [stepError, setStepError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch payment accounts if not passed
  useEffect(() => {
    if (initialUserAccounts.length === 0) {
      fetch("/api/payment-accounts")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.data && Array.isArray(data.data)) {
            setUserAccounts(data.data);
          }
        })
        .catch(() => {});
    }
  }, [initialUserAccounts]);

  // Sync activeLegTabId & expLegId
  useEffect(() => {
    if (legs.length > 0) {
      if (!activeLegTabId || !legs.some((l) => l.id === activeLegTabId)) {
        setActiveLegTabId(legs[0].id);
      }
      if (!expLegId || !legs.some((l) => l.id === expLegId)) {
        setExpLegId(legs[0].id);
      }
    }
  }, [legs, activeLegTabId, expLegId]);

  // Auto set default payer when participants change
  useEffect(() => {
    if (participants.length > 0 && !expPayer) {
      setExpPayer(participants[0]);
    }
  }, [participants, expPayer]);

  // Clean driverMap whenever participants change
  useEffect(() => {
    setDriverMap((prev) => {
      const next: DriverMap = {};
      participants.forEach((name) => {
        next[name] = prev[name] ?? false;
      });
      return next;
    });
  }, [participants]);

  // Auto clean/sync participantVehicleMap whenever participants or vehicles change
  useEffect(() => {
    setParticipantVehicleMap((prev) => {
      const next: Record<string, string> = {};
      const defaultVehicleId = vehicles[0]?.id || "";
      participants.forEach((name) => {
        const existingVid = prev[name];
        const isValid = vehicles.some((v) => v.id === existingVid);
        next[name] = isValid ? existingVid : defaultVehicleId;
      });
      return next;
    });
  }, [participants, vehicles]);

  // Auto clean/sync legAssignmentMap for all legs
  useEffect(() => {
    setLegAssignmentMap((prev) => {
      const next: LegAssignmentMap = {};
      const defaultVehicleId = vehicles[0]?.id || "";

      legs.forEach((leg) => {
        next[leg.id] = next[leg.id] || {};
        participants.forEach((name) => {
          const existing = prev[leg.id]?.[name];
          const isValidVehicle = vehicles.some(
            (v) => v.id === existing?.vehicleId,
          );

          next[leg.id][name] = {
            vehicleId: isValidVehicle
              ? existing!.vehicleId
              : participantVehicleMap[name] || defaultVehicleId,
            isDriver: existing ? existing.isDriver : driverMap[name] ?? false,
            isParticipating: existing ? existing.isParticipating : true,
          };
        });
      });

      return next;
    });
  }, [legs, participants, vehicles, driverMap, participantVehicleMap]);

  const activeLegConfig = useMemo(() => {
    const legId = activeLegTabId || legs[0]?.id;
    return legAssignmentMap[legId] || {};
  }, [activeLegTabId, legs, legAssignmentMap]);

  const expenseEligibleParticipants = useMemo(() => {
    const currentExpenseLegId = expLegId || legs[0]?.id;
    const currentExpLegConfig = legAssignmentMap[currentExpenseLegId] || {};

    return participants.filter((p) => {
      const isParticipating = currentExpLegConfig[p]?.isParticipating ?? true;
      if (!isParticipating) return false;
      if (expVehicleId !== "all") {
        const assignedVid =
          currentExpLegConfig[p]?.vehicleId || vehicles[0]?.id;
        if (assignedVid !== expVehicleId) return false;
      }
      return true;
    });
  }, [participants, expLegId, legs, legAssignmentMap, expVehicleId, vehicles]);

  const foodStopTotal = useMemo(() => {
    return expenseEligibleParticipants.reduce(
      (sum, p) => sum + (foodStopAmounts[p] ?? 0),
      0,
    );
  }, [expenseEligibleParticipants, foodStopAmounts]);

  const totalInitialExpenses = useMemo(
    () => expensesList.reduce((sum, exp) => sum + exp.amountIdr, 0),
    [expensesList],
  );

  // ─── LEGS MANAGEMENT ──────────────────────────────────────────────
  const handleAddLeg = () => {
    const lastDest = legs[legs.length - 1]?.destination || "";
    setLegs((prev) => [
      ...prev,
      {
        id: `leg-${Date.now()}`,
        origin: lastDest || "Bandung",
        destination: "",
      },
    ]);
  };

  const handleUpdateLeg = (
    id: string,
    field: "origin" | "destination",
    value: string,
  ) => {
    setLegs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    );
  };

  const handleRemoveLeg = (id: string) => {
    if (legs.length <= 1) return;
    setLegs((prev) => prev.filter((l) => l.id !== id));
  };

  // ─── VEHICLES MANAGEMENT ──────────────────────────────────────────
  const handleAddVehicle = () => {
    setVehicles((prev) => [
      ...prev,
      {
        id: `v-${Date.now()}`,
        label: `Mobil ${prev.length + 1}`,
        plateNumber: "",
      },
    ]);
  };

  const handleUpdateVehicle = (
    id: string,
    field: "label" | "plateNumber",
    value: string,
  ) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
    );
  };

  const handleRemoveVehicle = (id: string) => {
    if (vehicles.length <= 1) return;
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  // ─── PARTICIPANTS MANAGEMENT ──────────────────────────────────────
  const handleAddParticipant = () => {
    const trimmed = newParticipantName.trim();
    if (!trimmed) return;

    if (participants.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      setStepError(`Peserta "${trimmed}" sudah ada di dalam daftar.`);
      return;
    }

    setParticipants((prev) => [...prev, trimmed]);
    setNewParticipantName("");
    setStepError(null);
  };

  const handleRemoveParticipant = (nameToRemove: string) => {
    setParticipants((prev) => prev.filter((name) => name !== nameToRemove));
    setDriverMap((prev) => {
      const next = { ...prev };
      delete next[nameToRemove];
      return next;
    });
    setParticipantVehicleMap((prev) => {
      const next = { ...prev };
      delete next[nameToRemove];
      return next;
    });
    setLegAssignmentMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((legId) => {
        if (next[legId]) {
          delete next[legId][nameToRemove];
        }
      });
      return next;
    });
  };

  const handleToggleDriverForLeg = (legId: string, name: string) => {
    setLegAssignmentMap((prev) => {
      const legConfig = prev[legId] || {};
      const currentVal = legConfig[name]?.isDriver ?? false;
      return {
        ...prev,
        [legId]: {
          ...legConfig,
          [name]: {
            ...legConfig[name],
            vehicleId: legConfig[name]?.vehicleId || vehicles[0]?.id || "",
            isParticipating: legConfig[name]?.isParticipating ?? true,
            isDriver: !currentVal,
          },
        },
      };
    });
  };

  const handleSetVehicleForLeg = (
    legId: string,
    name: string,
    vehicleId: string,
  ) => {
    setLegAssignmentMap((prev) => {
      const legConfig = prev[legId] || {};
      return {
        ...prev,
        [legId]: {
          ...legConfig,
          [name]: {
            ...legConfig[name],
            isDriver: legConfig[name]?.isDriver ?? false,
            isParticipating: legConfig[name]?.isParticipating ?? true,
            vehicleId,
          },
        },
      };
    });
  };

  const handleToggleParticipationForLeg = (legId: string, name: string) => {
    setLegAssignmentMap((prev) => {
      const legConfig = prev[legId] || {};
      const currentVal = legConfig[name]?.isParticipating ?? true;
      return {
        ...prev,
        [legId]: {
          ...legConfig,
          [name]: {
            ...legConfig[name],
            vehicleId: legConfig[name]?.vehicleId || vehicles[0]?.id || "",
            isDriver: legConfig[name]?.isDriver ?? false,
            isParticipating: !currentVal,
          },
        },
      };
    });
  };

  const handleCopyLegConfigToAll = (sourceLegId: string) => {
    const sourceConfig = legAssignmentMap[sourceLegId];
    if (!sourceConfig) return;

    setLegAssignmentMap((prev) => {
      const next = { ...prev };
      legs.forEach((l) => {
        next[l.id] = { ...sourceConfig };
      });
      return next;
    });

    setStatus("Susunan peserta & supir berhasil disalin ke seluruh etape!");
    setTimeout(() => setStatus(null), 2500);
  };

  const handleApplyBulkPaste = () => {
    const parsed = parseParticipantsList(bulkPasteText);
    if (parsed.length > 0) {
      setParticipants(parsed);
      setShowBulkPaste(false);
      setBulkPasteText("");
      setStepError(null);
    } else {
      setStepError("Masukkan minimal 1 nama peserta pada kolom teks.");
    }
  };

  // ─── EXPENSES MANAGEMENT ──────────────────────────────────────────
  const handleTitleChange = (val: string) => {
    setExpTitle(val);
    const autoCat = detectExpenseCategory(val);
    setExpCategory(autoCat);
  };

  const handleAddExpense = () => {
    const numAmount = isFoodStop ? foodStopTotal : Number(expAmount);
    const splits = isFoodStop
      ? expenseEligibleParticipants
          .filter((p) => (foodStopAmounts[p] ?? 0) > 0)
          .map((p) => ({
            participantName: p,
            amountIdr: foodStopAmounts[p] ?? 0,
          }))
      : undefined;

    const validation = validateExpenseItem({
      title: expTitle,
      amountIdr: numAmount,
      payerName: expPayer || participants[0] || "",
      isFoodStop,
      splits,
    });

    if (!validation.isValid) {
      setStepError(validation.error || "Lengkapi data pengeluaran.");
      return;
    }

    const newExpense: InitialExpenseItem = {
      id: `exp-${Date.now()}`,
      title: expTitle.trim(),
      amountIdr: numAmount,
      payerName: expPayer || participants[0] || "Peserta",
      category: expCategory,
      notes: expNotes.trim(),
      vehicleId: expVehicleId === "all" ? null : expVehicleId,
      legId: expLegId || legs[0]?.id || null,
      isFoodStop,
      splits,
    };

    setExpensesList((prev) => [newExpense, ...prev]);
    setExpTitle("");
    setExpAmount("");
    setExpNotes("");
    setIsFoodStop(false);
    setFoodStopAmounts({});
    setStepError(null);
  };

  const handleRemoveExpense = (id: string) => {
    setExpensesList((prev) => prev.filter((e) => e.id !== id));
  };

  // ─── PAYMENT ACCOUNTS MANAGEMENT ──────────────────────────────────
  const handleToggleAccount = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCreateNewAccount = async () => {
    if (
      !newAccountLabel.trim() ||
      !newAccountOwner.trim() ||
      !newAccountNumber.trim()
    ) {
      setStepError("Lengkapi nama akun, pemilik, dan nomor rekening/e-wallet.");
      return;
    }

    setIsAddingAccount(true);
    setStepError(null);

    try {
      const res = await fetch("/api/payment-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newAccountLabel.trim(),
          channel: newAccountChannel,
          provider: newAccountProvider.trim() || undefined,
          accountName: newAccountOwner.trim(),
          accountNumber: newAccountNumber.trim(),
          instructions: newAccountInstructions.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.data) {
        throw new Error(data.message || "Gagal menyimpan rekening.");
      }

      const created = data.data as UserPaymentAccount;
      setUserAccounts((prev) => [...prev, created]);
      setSelectedAccountIds((prev) => [...prev, created.id]);
      setShowNewAccountForm(false);
      setNewAccountLabel("");
      setNewAccountOwner("");
      setNewAccountNumber("");
      setNewAccountInstructions("");
    } catch (err: unknown) {
      setStepError(
        err instanceof Error ? err.message : "Gagal menambah rekening.",
      );
    } finally {
      setIsAddingAccount(false);
    }
  };

  // ─── STEP NAVIGATION & VALIDATIONS ────────────────────────────────
  const handleGoToStep2 = () => {
    const v1 = validateStep1({ tripName, startDate, endDate });
    if (!v1.isValid) {
      setStepError(v1.error || "Lengkapi data rute & jadwal terlebih dahulu.");
      return;
    }
    setStepError(null);
    setCurrentStep(2);
  };

  const handleGoToStep3 = () => {
    const v2 = validateStep2(participants, vehicles);
    if (!v2.isValid) {
      setStepError(v2.error || "Lengkapi data armada & peserta.");
      return;
    }
    setStepError(null);
    setCurrentStep(3);
  };

  const handleGoToStep4 = () => {
    setStepError(null);
    setCurrentStep(4);
  };

  const handleStepClick = (targetStep: Step) => {
    if (targetStep === currentStep) return;

    if (targetStep === 1) {
      setStepError(null);
      setCurrentStep(1);
      return;
    }

    const v1 = validateStep1({ tripName, startDate, endDate });
    if (!v1.isValid) {
      setCurrentStep(1);
      setStepError(v1.error || "Lengkapi data Step 1 terlebih dahulu.");
      return;
    }

    if (targetStep === 2) {
      setStepError(null);
      setCurrentStep(2);
      return;
    }

    const v2 = validateStep2(participants, vehicles);
    if (!v2.isValid) {
      setCurrentStep(2);
      setStepError(v2.error || "Lengkapi data peserta di Step 2.");
      return;
    }

    setStepError(null);
    setCurrentStep(targetStep);
  };

  // ─── SUBMIT FINAL DATA ────────────────────────────────────────────
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const v1 = validateStep1({ tripName, startDate, endDate });
    if (!v1.isValid) {
      setCurrentStep(1);
      setStepError(v1.error || "Data rute belum lengkap.");
      return;
    }

    const v2 = validateStep2(participants, vehicles);
    if (!v2.isValid) {
      setCurrentStep(2);
      setStepError(v2.error || "Data armada atau peserta belum lengkap.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Menyimpan seluruh data perjalanan...");
    setStepError(null);

    const payload = buildFullCreateTripPayload({
      tripName,
      startDate,
      endDate,
      legs,
      vehicles,
      participants,
      driverMap,
      participantVehicleMap,
      legAssignmentMap,
      expenses: expensesList,
      paymentAccountIds: selectedAccountIds,
    });

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response
        .json()
        .catch(() => ({
          message: "Gagal memproses respons server",
        }))) as ApiResponse;

      if (!response.ok || !result.data) {
        setStatus(result.message || "Gagal membuat perjalanan.");
        setIsSubmitting(false);
        return;
      }

      setStatus("Perjalanan berhasil dibuat! Mengalihkan ke dashboard...");
      router.push(`/perjalanan/${result.data.tripId}`);
    } catch {
      setStatus("Terjadi kesalahan koneksi jaringan.");
      setIsSubmitting(false);
    }
  }

  const step1Valid = validateStep1({ tripName, startDate, endDate }).isValid;
  const step2Valid = validateStep2(participants, vehicles).isValid;

  return (
    <div className="space-y-6">
      {/* ─── STEPPER HEADER ──────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-3 sm:p-4">
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3 items-center">
          {/* Step 1 Tab */}
          <button
            type="button"
            onClick={() => handleStepClick(1)}
            className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl transition-all text-left ${
              currentStep === 1
                ? "bg-blue-600/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold"
                : step1Valid
                  ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                  : "opacity-60 text-slate-400"
            }`}
          >
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 1
                  ? "bg-blue-600 text-white shadow"
                  : step1Valid
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {step1Valid && currentStep !== 1 ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                "1"
              )}
            </div>
            <div className="min-w-0 hidden md:block">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Langkah 1
              </p>
              <p className="text-xs font-bold truncate">Rute & Jadwal</p>
            </div>
          </button>

          {/* Step 2 Tab */}
          <button
            type="button"
            onClick={() => handleStepClick(2)}
            className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl transition-all text-left ${
              currentStep === 2
                ? "bg-blue-600/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold"
                : step2Valid && step1Valid
                  ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                  : "opacity-60 text-slate-400"
            }`}
          >
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 2
                  ? "bg-blue-600 text-white shadow"
                  : step2Valid && step1Valid
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {step2Valid && step1Valid && currentStep > 2 ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                "2"
              )}
            </div>
            <div className="min-w-0 hidden md:block">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Langkah 2
              </p>
              <p className="text-xs font-bold truncate">Armada & Peserta</p>
            </div>
          </button>

          {/* Step 3 Tab */}
          <button
            type="button"
            onClick={() => handleStepClick(3)}
            className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl transition-all text-left ${
              currentStep === 3
                ? "bg-blue-600/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold"
                : expensesList.length > 0
                  ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                  : "opacity-70 text-slate-500 hover:opacity-100"
            }`}
          >
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 3
                  ? "bg-blue-600 text-white shadow"
                  : expensesList.length > 0
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {expensesList.length > 0 && currentStep > 3 ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                "3"
              )}
            </div>
            <div className="min-w-0 hidden md:block">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Langkah 3
              </p>
              <p className="text-xs font-bold truncate">Pengeluaran & Bayar</p>
            </div>
          </button>

          {/* Step 4 Tab */}
          <button
            type="button"
            onClick={() => handleStepClick(4)}
            className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl transition-all text-left ${
              currentStep === 4
                ? "bg-blue-600/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold"
                : "opacity-60 text-slate-400 hover:opacity-80"
            }`}
          >
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 4
                  ? "bg-blue-600 text-white shadow"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              4
            </div>
            <div className="min-w-0 hidden md:block">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Langkah 4
              </p>
              <p className="text-xs font-bold truncate">Review & Simpan</p>
            </div>
          </button>
        </div>
      </div>

      {/* ─── ERROR BANNER ────────────────────────────────────────────────── */}
      {stepError && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-medium animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{stepError}</span>
        </div>
      )}

      {/* ─── STEP 1: RUTE & JADWAL ───────────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-lg sm:text-xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Informasi & Etape Perjalanan
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Nama trip, jadwal tanggal, dan etape rute (bisa tambah
                multi-leg).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label
              className="block text-xs font-bold"
              style={{ color: "var(--text-secondary)" }}
            >
              Nama Perjalanan <span className="text-rose-500">*</span>
              <input
                type="text"
                className="input-field mt-1.5 font-semibold text-base"
                placeholder="Contoh: KBM Bandung - Jakarta 2026"
                value={tripName}
                onChange={(e) => {
                  setTripName(e.target.value);
                  if (stepError) setStepError(null);
                }}
                autoFocus
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label
                className="block text-xs font-bold"
                style={{ color: "var(--text-secondary)" }}
              >
                Tanggal Mulai <span className="text-rose-500">*</span>
                <input
                  type="date"
                  className="input-field mt-1.5"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (stepError) setStepError(null);
                  }}
                  required
                />
              </label>

              <label
                className="block text-xs font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Tanggal Selesai (Opsional)
                <input
                  type="date"
                  className="input-field mt-1.5"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (stepError) setStepError(null);
                  }}
                />
              </label>
            </div>

            {/* Etape / Leg Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label
                  className="block text-xs font-bold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Rute / Etape Perjalanan ({legs.length} Leg)
                </label>
                <button
                  type="button"
                  onClick={handleAddLeg}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Leg Lanjutan
                </button>
              </div>

              <div className="space-y-2.5">
                {legs.map((leg, index) => (
                  <div
                    key={leg.id}
                    className="p-3.5 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] flex flex-wrap items-center gap-3"
                  >
                    <span className="badge badge-blue text-xs font-bold py-1 px-2 shrink-0">
                      Leg {index + 1}
                    </span>

                    <div className="grid grid-cols-2 gap-2 flex-1 min-w-[240px]">
                      <input
                        type="text"
                        className="input-field py-1.5 text-xs font-medium"
                        placeholder="Kota Asal (e.g. Bandung)"
                        value={leg.origin}
                        onChange={(e) =>
                          handleUpdateLeg(leg.id, "origin", e.target.value)
                        }
                      />
                      <input
                        type="text"
                        className="input-field py-1.5 text-xs font-medium"
                        placeholder="Kota Tujuan (e.g. Jakarta)"
                        value={leg.destination}
                        onChange={(e) =>
                          handleUpdateLeg(leg.id, "destination", e.target.value)
                        }
                      />
                    </div>

                    {legs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLeg(leg.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Hapus etape ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleGoToStep2}
              className="btn-primary px-6 py-3 text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <span>Lanjut ke Armada & Peserta</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: ARMADA & PESERTA ────────────────────────────────────── */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Card Multi-Kendaraan */}
          <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    className="text-base sm:text-lg font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Armada Kendaraan ({vehicles.length})
                  </h2>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Tambah beberapa mobil bila perjalanan konvoi.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddVehicle}
                className="btn-secondary text-xs px-3 py-1.5 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Mobil
              </button>
            </div>

            <div className="space-y-2.5">
              {vehicles.map((v, index) => (
                <div
                  key={v.id}
                  className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-wrap items-center gap-3"
                >
                  <span className="badge badge-indigo text-xs font-bold py-1 px-2 shrink-0">
                    Mobil {index + 1}
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-w-[240px]">
                    <input
                      type="text"
                      className="input-field py-1.5 text-xs font-medium"
                      placeholder="Nama Mobil (cth: Avanza Hitam / Innova)"
                      value={v.label}
                      onChange={(e) =>
                        handleUpdateVehicle(v.id, "label", e.target.value)
                      }
                      required
                    />
                    <input
                      type="text"
                      className="input-field py-1.5 text-xs uppercase tracking-wider"
                      placeholder="Plat Nomor (cth: N 1234 AB)"
                      value={v.plateNumber}
                      onChange={(e) =>
                        handleUpdateVehicle(v.id, "plateNumber", e.target.value)
                      }
                    />
                  </div>

                  {vehicles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveVehicle(v.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Hapus kendaraan ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Card Peserta & Supir per Etape / Leg */}
          <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    className="text-base sm:text-lg font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Daftar Peserta, Supir & Penugasan Mobil
                  </h2>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Peserta, mobil, dan supir bisa diatur berbeda di tiap etape
                    (leg).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="badge badge-blue text-xs font-bold py-1 px-2.5">
                  {participants.length} Peserta
                </span>
              </div>
            </div>

            {/* Quick Add Master Participant */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    className="input-field pr-20"
                    placeholder="Ketik nama peserta baru lalu tekan Enter..."
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddParticipant();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddParticipant}
                    disabled={!newParticipantName.trim()}
                    className="absolute right-1.5 top-1.5 bottom-1.5 btn-primary px-3 py-1 text-xs font-bold rounded-lg disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" />
                    Tambah
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setBulkPasteText(participants.join("\n"));
                    setShowBulkPaste((v) => !v);
                  }}
                  className="btn-secondary px-3.5 py-2 text-xs font-semibold shrink-0"
                  title="Paste banyak nama sekaligus"
                >
                  <FileText className="w-4 h-4 inline mr-1" />
                  <span className="hidden sm:inline">
                    {showBulkPaste ? "Tutup Mode Paste" : "Paste Banyak"}
                  </span>
                </button>
              </div>

              {/* Bulk Paste Area (Collapsible) */}
              {showBulkPaste && (
                <div className="p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-3 animate-in fade-in duration-200">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Tempel daftar nama (satu nama per baris):
                  </p>
                  <textarea
                    className="input-field h-32 font-mono text-sm resize-none"
                    value={bulkPasteText}
                    onChange={(e) => setBulkPasteText(e.target.value)}
                    placeholder={"Yuslan\nGani\nRasyid\nResya"}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBulkPaste(false)}
                      className="btn-ghost text-xs px-3 py-1.5"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyBulkPaste}
                      className="btn-primary text-xs px-4 py-1.5 font-bold"
                    >
                      Terapkan Daftar Nama
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* LEGS TABS SELECTOR (When > 1 leg) */}
            {legs.length > 1 && (
              <div className="p-3.5 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pilih Etape / Leg untuk Mengatur Peserta & Supir:
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopyLegConfigToAll(activeLegTabId || legs[0]?.id)
                    }
                    className="btn-ghost text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-blue-500/20 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    title="Salin susunan penumpang & supir dari leg ini ke seluruh leg lainnya"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Susunan Ini ke Semua Leg</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {legs.map((l, idx) => {
                    const isTabActive =
                      (activeLegTabId || legs[0]?.id) === l.id;
                    const legConfig = legAssignmentMap[l.id] || {};
                    const participatingCount = participants.filter(
                      (p) => legConfig[p]?.isParticipating ?? true,
                    ).length;
                    const legDriverCount = participants.filter(
                      (p) =>
                        (legConfig[p]?.isParticipating ?? true) &&
                        (legConfig[p]?.isDriver ?? false),
                    ).length;

                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setActiveLegTabId(l.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                          isTabActive
                            ? "bg-blue-600 text-white border-blue-600 shadow"
                            : "bg-[var(--bg-secondary)] border-[var(--border-color)] text-slate-700 dark:text-slate-300 hover:border-slate-400"
                        }`}
                      >
                        <Route className="w-3.5 h-3.5" />
                        <span>
                          Leg {idx + 1}: {l.origin || "Asal"} ➔{" "}
                          {l.destination || "Tujuan"}
                        </span>
                        <span
                          className={`text-[10px] py-0.5 px-1.5 rounded-md font-bold ${
                            isTabActive
                              ? "bg-blue-700 text-blue-100"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {participatingCount} orang • {legDriverCount} supir
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Breakdown Kapasitas Kendaraan untuk Leg yang Aktif */}
            {vehicles.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)]">
                <span className="text-xs font-bold text-slate-500">
                  Distribusi Penumpang:
                </span>
                {vehicles.map((v) => {
                  const legId = activeLegTabId || legs[0]?.id;
                  const legConfig = legAssignmentMap[legId] || {};
                  const count = participants.filter(
                    (p) =>
                      (legConfig[p]?.isParticipating ?? true) &&
                      (legConfig[p]?.vehicleId || vehicles[0]?.id) === v.id,
                  ).length;
                  const driversInCar = participants.filter(
                    (p) =>
                      (legConfig[p]?.isParticipating ?? true) &&
                      (legConfig[p]?.vehicleId || vehicles[0]?.id) === v.id &&
                      legConfig[p]?.isDriver,
                  ).length;

                  return (
                    <span
                      key={v.id}
                      className="badge badge-indigo text-xs font-bold py-1 px-2.5"
                    >
                      🚗 {v.label}: {count} orang ({driversInCar} supir)
                    </span>
                  );
                })}
              </div>
            )}

            {/* Interactive Participant Cards for Active Leg */}
            <div className="space-y-2">
              <p
                className="text-xs font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Susunan Peserta untuk{" "}
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {legs.find((l) => l.id === (activeLegTabId || legs[0]?.id))
                    ?.origin || "Asal"}{" "}
                  ➔{" "}
                  {legs.find((l) => l.id === (activeLegTabId || legs[0]?.id))
                    ?.destination || "Tujuan"}
                </span>
                :
              </p>

              {participants.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-[var(--border-color)] text-xs text-slate-400">
                  Belum ada peserta. Tambahkan nama peserta di kolom atas.
                </div>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {participants.map((name) => {
                    const currentLegId = activeLegTabId || legs[0]?.id;
                    const pConfig = activeLegConfig[name] || {
                      vehicleId: vehicles[0]?.id || "",
                      isDriver: driverMap[name] ?? false,
                      isParticipating: true,
                    };
                    const isParticipating = pConfig.isParticipating ?? true;
                    const isDriver = pConfig.isDriver ?? false;
                    const assignedVid = pConfig.vehicleId || vehicles[0]?.id;

                    return (
                      <div
                        key={name}
                        className={`p-3 rounded-2xl border transition-all space-y-2 ${
                          !isParticipating
                            ? "opacity-50 bg-slate-100 dark:bg-slate-900 border-[var(--border-color)]"
                            : isDriver
                              ? "bg-blue-600/10 border-blue-500/40 shadow-sm"
                              : "bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isParticipating}
                              onChange={() =>
                                handleToggleParticipationForLeg(
                                  currentLegId,
                                  name,
                                )
                              }
                              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                              title="Ikut di etape/leg ini"
                            />
                            <span
                              className={`text-xs sm:text-sm font-semibold truncate ${
                                !isParticipating
                                  ? "line-through text-slate-400"
                                  : ""
                              }`}
                              style={{
                                color: isParticipating
                                  ? "var(--text-primary)"
                                  : "var(--text-muted)",
                              }}
                            >
                              {name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isParticipating && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleDriverForLeg(currentLegId, name)
                                }
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  isDriver
                                    ? "bg-blue-600 text-white shadow"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                                title="Toggle status supir di etape ini (Diskon 50%)"
                              >
                                <Car className="w-3.5 h-3.5" />
                                <span>
                                  {isDriver ? "Supir (50%)" : "Supir?"}
                                </span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveParticipant(name)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title={`Hapus ${name} dari daftar trip`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Vehicle Assignment Dropdown for Active Leg */}
                        {isParticipating && vehicles.length > 1 && (
                          <div className="pt-1.5 border-t border-[var(--border-color)] flex items-center justify-between gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                              Naik Mobil:
                            </span>
                            <select
                              className="input-field py-1 px-2 text-xs font-semibold rounded-lg flex-1 min-w-0"
                              value={assignedVid}
                              onChange={(e) =>
                                handleSetVehicleForLeg(
                                  currentLegId,
                                  name,
                                  e.target.value,
                                )
                              }
                            >
                              {vehicles.map((v) => (
                                <option key={v.id} value={v.id}>
                                  🚗 {v.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Step 2 */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setStepError(null);
                setCurrentStep(1);
              }}
              className="btn-secondary px-5 py-3 text-sm font-semibold flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali ke Rute</span>
            </button>

            <button
              type="button"
              onClick={handleGoToStep3}
              className="btn-primary px-6 py-3 text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <span>Lanjut ke Pengeluaran & Bayar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: PENGELUARAN & REKENING PEMBAYARAN ────────────────────── */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Card 1: Rekening Pembayaran Host (Minimalist & Compact) */}
          <div className="glass-card rounded-3xl p-5 sm:p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2
                      className="text-sm sm:text-base font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Rekening Pembayaran Trip
                    </h2>
                    <span
                      className={`text-[10px] font-bold py-0.5 px-2 rounded-full ${
                        selectedAccountIds.length > 0
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {selectedAccountIds.length > 0
                        ? `${selectedAccountIds.length} Terpilih`
                        : "Opsional"}
                    </span>
                  </div>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Pilih rekening/e-wallet untuk peserta mentransfer
                    settlement.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccountsPicker((v) => !v)}
                  className={`text-xs px-3 py-1.5 font-bold rounded-xl transition-all flex items-center gap-1.5 border ${
                    showAccountsPicker
                      ? "bg-emerald-600 text-white border-emerald-600 shadow"
                      : "btn-secondary"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>
                    {showAccountsPicker ? "Tutup Pilihan" : "+ Pilih Rekening"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowNewAccountForm((v) => !v);
                    setShowAccountsPicker(true);
                  }}
                  className="btn-ghost text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 py-1 px-2.5 border border-emerald-500/20 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Rekening Baru</span>
                </button>
              </div>
            </div>

            {/* Selected Accounts Preview Pills (When not expanded or as quick summary) */}
            {selectedAccountIds.length > 0 && !showAccountsPicker && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {userAccounts
                  .filter((a) => selectedAccountIds.includes(a.id))
                  .map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>
                        {a.label} ({a.accountNumber})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleAccount(a.id)}
                        className="text-emerald-500 hover:text-rose-500 ml-0.5"
                        title="Batal pilih rekening ini"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              </div>
            )}

            {selectedAccountIds.length === 0 && !showAccountsPicker && (
              <p className="text-[11px] text-slate-400 italic">
                Belum ada rekening yang dipilih (bisa dipilih lewat tombol
                &ldquo;+ Pilih Rekening&rdquo; di atas atau diatur nanti di
                dashboard).
              </p>
            )}

            {/* Quick Add New Payment Account Form */}
            {showNewAccountForm && (
              <div className="p-4 rounded-2xl bg-[var(--bg-muted)] border border-emerald-500/30 space-y-3 animate-in fade-in duration-200">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Tambah Rekening / E-Wallet Baru:
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-500">
                      Jenis Saluran
                    </label>
                    <select
                      className="input-field py-1.5 text-xs"
                      value={newAccountChannel}
                      onChange={(e) =>
                        setNewAccountChannel(
                          e.target.value as HostPaymentChannel,
                        )
                      }
                    >
                      <option value="bank">Bank Transfer</option>
                      <option value="ewallet">
                        E-Wallet (GoPay, OVO, Dana)
                      </option>
                      <option value="cash">Tunai / Cash</option>
                      <option value="other">Lainnya / QRIS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-500">
                      Nama Akun / Label
                    </label>
                    <input
                      type="text"
                      className="input-field py-1.5 text-xs"
                      placeholder="Cth: BCA Utama / QRIS"
                      value={newAccountLabel}
                      onChange={(e) => setNewAccountLabel(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-500">
                      Bank / Provider
                    </label>
                    <input
                      type="text"
                      className="input-field py-1.5 text-xs"
                      placeholder="Cth: BCA, Mandiri, GoPay"
                      value={newAccountProvider}
                      onChange={(e) => setNewAccountProvider(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-500">
                      Nama Pemilik Rekening
                    </label>
                    <input
                      type="text"
                      className="input-field py-1.5 text-xs"
                      placeholder="Cth: Yuslan Abubakar"
                      value={newAccountOwner}
                      onChange={(e) => setNewAccountOwner(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1 text-slate-500">
                      Nomor Rekening / HP
                    </label>
                    <input
                      type="text"
                      className="input-field py-1.5 text-xs font-mono font-bold"
                      placeholder="Cth: 1234567890"
                      value={newAccountNumber}
                      onChange={(e) => setNewAccountNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewAccountForm(false)}
                    className="btn-ghost text-xs px-3 py-1.5"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewAccount}
                    disabled={isAddingAccount}
                    className="btn-primary text-xs px-4 py-1.5 font-bold"
                  >
                    {isAddingAccount ? "Menyimpan..." : "Simpan Rekening"}
                  </button>
                </div>
              </div>
            )}

            {/* Compact Checkable List (When Expanded) */}
            {showAccountsPicker && (
              <div className="pt-2 border-t border-[var(--border-color)] space-y-2 animate-in fade-in duration-150">
                {userAccounts.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-[var(--bg-muted)] text-xs text-slate-400">
                    Belum ada rekening pembayaran yang tersimpan. Klik
                    &ldquo;Rekening Baru&rdquo; di atas untuk menambahkan.
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto pr-1">
                    {userAccounts.map((acc) => {
                      const isChecked = selectedAccountIds.includes(acc.id);

                      return (
                        <label
                          key={acc.id}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                            isChecked
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-100 font-semibold"
                              : "bg-[var(--bg-secondary)] border-[var(--border-color)] opacity-70 hover:opacity-100 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleAccount(acc.id)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0"
                          />
                          <div className="min-w-0 flex-1 text-xs">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold truncate">
                                {acc.label}
                              </span>
                              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                ({acc.accountNumber})
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              a/n {acc.accountName}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Form Tambah Pengeluaran Awal */}
          <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    className="text-base sm:text-lg font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Catat Pengeluaran Langsung
                  </h2>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Catat nota bensin, tol, makan (individual), dll. langsung di
                    sini (bisa dilewati).
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-400">Total Pengeluaran</p>
                <p className="text-base sm:text-lg font-extrabold text-amber-500">
                  {formatRupiah(totalInitialExpenses)}
                </p>
              </div>
            </div>

            {/* Input Pengeluaran Box */}
            <div className="p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    className="block text-xs font-bold mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Judul Pengeluaran
                  </label>
                  <input
                    type="text"
                    className="input-field py-2 text-sm"
                    placeholder="Contoh: Bensin Pertamax / Makan Siang Resto"
                    value={expTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-bold mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {isFoodStop
                      ? "Total Dihitung Otomatis (Rp)"
                      : "Nominal (Rp)"}
                  </label>
                  <input
                    type="number"
                    className={`input-field py-2 text-sm font-semibold ${
                      isFoodStop
                        ? "opacity-75 bg-slate-100 dark:bg-slate-800"
                        : ""
                    }`}
                    placeholder={
                      isFoodStop ? String(foodStopTotal) : "Contoh: 250000"
                    }
                    value={isFoodStop ? foodStopTotal || "" : expAmount}
                    disabled={isFoodStop}
                    onChange={(e) =>
                      setExpAmount(e.target.value ? Number(e.target.value) : "")
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    className="block text-xs font-semibold mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Dibayar Oleh
                  </label>
                  <select
                    className="input-field py-2 text-xs"
                    value={expPayer}
                    onChange={(e) => setExpPayer(e.target.value)}
                  >
                    {participants.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="block text-xs font-semibold mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Kategori Biaya
                  </label>
                  <select
                    className="input-field py-2 text-xs"
                    value={expCategory}
                    disabled={isFoodStop}
                    onChange={(e) => setExpCategory(e.target.value)}
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="block text-xs font-semibold mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Etape / Rute (Leg)
                  </label>
                  <select
                    className="input-field py-2 text-xs"
                    value={expLegId || legs[0]?.id}
                    onChange={(e) => setExpLegId(e.target.value)}
                  >
                    {legs.map((l, idx) => (
                      <option key={l.id} value={l.id}>
                        Leg {idx + 1}: {l.origin || "Asal"} ➔{" "}
                        {l.destination || "Tujuan"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="block text-xs font-semibold mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Cakupan Kendaraan
                  </label>
                  <select
                    className="input-field py-2 text-xs"
                    value={expVehicleId}
                    onChange={(e) => setExpVehicleId(e.target.value)}
                  >
                    <option value="all">🌐 Semua Peserta</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        🚗 Khusus {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 🍽️ Food Stop Toggle & Individual Split Box */}
              <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFoodStop}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsFoodStop(checked);
                      if (checked) {
                        setExpCategory("makan");
                        if (!expTitle) setExpTitle("Makan & Kuliner");
                      }
                    }}
                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 inline" />
                      Pemberhentian Makan (Tagihan berbeda per orang)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Aktifkan jika tiap peserta punya porsi/nominal tagihan
                      makan berbeda. Total dihitung otomatis dari nominal per
                      orang.
                    </p>
                  </div>
                </label>

                {isFoodStop && (
                  <div className="pt-2 border-t border-amber-500/20 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Input Nominal Tagihan per Peserta:
                      </span>
                      <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                        Total Makan: {formatRupiah(foodStopTotal)} (
                        {
                          expenseEligibleParticipants.filter(
                            (p) => (foodStopAmounts[p] || 0) > 0,
                          ).length
                        }{" "}
                        orang)
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-52 overflow-y-auto pr-1">
                      {expenseEligibleParticipants.map((name) => (
                        <div
                          key={name}
                          className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between gap-2"
                        >
                          <span className="text-xs font-semibold truncate flex-1">
                            {name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-slate-400 font-bold">
                              Rp
                            </span>
                            <input
                              type="number"
                              placeholder="0"
                              className="input-field py-1 px-2 text-xs font-bold text-right w-24"
                              value={foodStopAmounts[name] || ""}
                              onChange={(e) => {
                                const val = e.target.value
                                  ? Number(e.target.value)
                                  : 0;
                                setFoodStopAmounts((prev) => ({
                                  ...prev,
                                  [name]: val,
                                }));
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <input
                  type="text"
                  className="input-field py-1.5 text-xs flex-1"
                  placeholder="Catatan tambahan (opsional, cth: nota di dompet Yuslan)"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                />

                <button
                  type="button"
                  onClick={handleAddExpense}
                  className="btn-primary w-full sm:w-auto px-5 py-2 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan Nota</span>
                </button>
              </div>
            </div>

            {/* List Pengeluaran yang Sudah Dimasukkan */}
            <div className="space-y-2">
              <p
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Daftar Pengeluaran Terinput ({expensesList.length} Transaksi)
              </p>

              {expensesList.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border-color)] text-xs text-slate-400 space-y-1">
                  <p>Belum ada pengeluaran yang dimasukkan.</p>
                  <p className="text-[11px] text-slate-400">
                    Kamu bisa langsung klik &ldquo;Lanjut ke Review&rdquo; dan
                    mencatat pengeluaran nanti di dashboard.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {expensesList.map((exp) => {
                    const catObj = EXPENSE_CATEGORIES.find(
                      (c) => c.id === exp.category,
                    );
                    const vehicleObj = vehicles.find(
                      (v) => v.id === exp.vehicleId,
                    );
                    const legIndex = legs.findIndex((l) => l.id === exp.legId);
                    const legObj = legIndex >= 0 ? legs[legIndex] : legs[0];
                    const legText = legObj
                      ? `Leg ${legIndex >= 0 ? legIndex + 1 : 1} (${legObj.origin || "Asal"} ➔ ${legObj.destination || "Tujuan"})`
                      : "";

                    return (
                      <div
                        key={exp.id}
                        className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl shrink-0">
                            {exp.isFoodStop ? "🍽️" : catObj?.emoji || "📦"}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className="text-xs sm:text-sm font-bold truncate"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {exp.title}
                              </p>
                              {exp.isFoodStop && (
                                <span className="badge badge-amber text-[9px] py-0.2 px-1 font-bold">
                                  Pemberhentian Makan
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              Oleh:{" "}
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                {exp.payerName}
                              </span>
                              {legText && ` • ${legText}`}
                              {vehicleObj
                                ? ` • Khusus ${vehicleObj.label}`
                                : " • Semua Peserta"}
                            </p>
                            {exp.splits && exp.splits.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {exp.splits.map((s) => (
                                  <span
                                    key={s.participantName}
                                    className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium"
                                  >
                                    {s.participantName}:{" "}
                                    {formatRupiah(s.amountIdr)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs sm:text-sm font-extrabold text-amber-500">
                            {formatRupiah(exp.amountIdr)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExpense(exp.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Hapus pengeluaran ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Step 3 */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setStepError(null);
                setCurrentStep(2);
              }}
              className="btn-secondary px-5 py-3 text-sm font-semibold flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali ke Armada & Peserta</span>
            </button>

            <button
              type="button"
              onClick={handleGoToStep4}
              className="btn-primary px-6 py-3 text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <span>Lanjut ke Review & Simpan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 4: REVIEW & SIMPAN ─────────────────────────────────────── */}
      {currentStep === 4 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2
                  className="text-lg sm:text-xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Ringkasan & Simpan Perjalanan
                </h2>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Periksa ringkasan lengkap data sebelum disimpan ke sistem.
                </p>
              </div>
            </div>

            {/* Highlights Grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Trip & Route */}
              <div className="p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Rute & Jadwal
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-[11px] text-blue-500 hover:underline font-semibold"
                  >
                    Ubah
                  </button>
                </div>
                <p
                  className="text-sm font-extrabold truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {tripName}
                </p>
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {legs.map((l, i) => (
                    <div
                      key={l.id}
                      className="flex items-center gap-1 truncate"
                    >
                      <Route className="w-3 h-3 text-blue-500 shrink-0" />
                      <span>
                        Leg {i + 1}: {l.origin || "?"} ➔ {l.destination || "?"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 pt-1">
                  📅 {startDate} {endDate ? `s/d ${endDate}` : "(1 Hari)"}
                </p>
              </div>

              {/* Fleet Vehicles */}
              <div className="p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Armada ({vehicles.length})
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-[11px] text-blue-500 hover:underline font-semibold"
                  >
                    Ubah
                  </button>
                </div>
                <div className="space-y-1">
                  {vehicles.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium truncate"
                    >
                      <Car className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{v.label}</span>
                      {v.plateNumber && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({v.plateNumber})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Expenses */}
              <div className="p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Pengeluaran Awal
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="text-[11px] text-blue-500 hover:underline font-semibold"
                  >
                    Ubah
                  </button>
                </div>
                <p className="text-base font-extrabold text-amber-500">
                  {formatRupiah(totalInitialExpenses)}
                </p>
                <p className="text-xs text-slate-500">
                  {expensesList.length} transaksi nota terdaftar
                </p>
              </div>
            </div>

            {/* Attached Payment Methods Preview */}
            <div className="p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Rekening Tujuan Transfer Host ({selectedAccountIds.length}{" "}
                  Rekening)
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="text-[11px] text-blue-500 hover:underline font-semibold"
                >
                  Ubah Rekening
                </button>
              </div>

              {selectedAccountIds.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Belum ada rekening pembayaran yang dilampirkan (bisa
                  ditambahkan nanti di dashboard).
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {userAccounts
                    .filter((a) => selectedAccountIds.includes(a.id))
                    .map((a) => (
                      <span
                        key={a.id}
                        className="badge badge-emerald text-xs font-bold py-1 px-2.5 flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>
                          {a.label} ({a.accountNumber}) · a/n {a.accountName}
                        </span>
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Participants Grouped by Leg & Vehicle */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Susunan Peserta & Supir per Etape ({legs.length} Leg)
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs text-blue-500 hover:underline font-semibold"
                >
                  Ubah Susunan
                </button>
              </div>

              <div className="space-y-3">
                {legs.map((leg, legIdx) => {
                  const legConfig = legAssignmentMap[leg.id] || {};

                  return (
                    <div
                      key={leg.id}
                      className="p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-3"
                    >
                      <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
                        <span className="badge badge-blue text-xs font-bold py-0.5 px-2">
                          Leg {legIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {leg.origin || "Asal"} ➔ {leg.destination || "Tujuan"}
                        </span>
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {vehicles.map((v) => {
                          const carParticipants = participants.filter(
                            (p) =>
                              (legConfig[p]?.isParticipating ?? true) &&
                              (legConfig[p]?.vehicleId || vehicles[0]?.id) ===
                                v.id,
                          );

                          return (
                            <div
                              key={v.id}
                              className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                  <Car className="w-3.5 h-3.5" />
                                  <span>
                                    {v.label} ({carParticipants.length} orang)
                                  </span>
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {carParticipants.length === 0 ? (
                                  <span className="text-[11px] text-slate-400 italic">
                                    Tidak ada penumpang
                                  </span>
                                ) : (
                                  carParticipants.map((name) => {
                                    const isDriver =
                                      legConfig[name]?.isDriver ?? false;
                                    return (
                                      <div
                                        key={name}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs border ${
                                          isDriver
                                            ? "bg-blue-600/10 border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold"
                                            : "bg-[var(--bg-muted)] border-[var(--border-color)] text-slate-700 dark:text-slate-300"
                                        }`}
                                      >
                                        <span>{name}</span>
                                        {isDriver && (
                                          <span className="badge badge-blue text-[9px] py-0.2 px-1 font-bold">
                                            🚗 Supir
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStepError(null);
                    setCurrentStep(3);
                  }}
                  className="btn-secondary w-full sm:w-auto px-5 py-3 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Ubah Pengeluaran & Rekening</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full sm:w-auto px-8 py-3.5 text-base font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    "Menyimpan Seluruh Data..."
                  ) : (
                    <>
                      <span>Simpan Perjalanan</span>
                      <CheckCircle2 className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>

              {status && (
                <p
                  className="text-center text-sm font-medium pt-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {status}
                </p>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
