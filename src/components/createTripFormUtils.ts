export const DEFAULT_VEHICLE_LABEL = "Kendaraan utama";
export const DEFAULT_START_TIME = "08:00";
export const DEFAULT_END_TIME = "17:00";

export const DEFAULT_PARTICIPANTS = [
  "Yuslan",
  "Gani",
  "Rasyid",
  "Resya",
  "Adit",
  "Adi",
  "Revi",
  "Sandro",
  "Irfan",
];

export type DriverMap = Record<string, boolean>;

export interface LegItem {
  id: string;
  origin: string;
  destination: string;
}

export interface VehicleItem {
  id: string;
  label: string;
  plateNumber: string;
}

export interface ParticipantLegConfig {
  vehicleId: string;
  isDriver: boolean;
  isParticipating: boolean;
}

// legId -> participantName -> ParticipantLegConfig
export type LegAssignmentMap = Record<
  string,
  Record<string, ParticipantLegConfig>
>;

export interface InitialExpenseItem {
  id: string;
  title: string;
  amountIdr: number;
  payerName: string;
  category: string;
  notes: string;
  vehicleId?: string | null;
  legId?: string | null;
  isFoodStop?: boolean;
  splits?: Array<{ participantName: string; amountIdr: number }>;
}

export interface FullTripFormData {
  tripName: string;
  startDate: string;
  endDate: string;
  legs: LegItem[];
  vehicles: VehicleItem[];
  participants: string[];
  driverMap: DriverMap;
  participantVehicleMap?: Record<string, string>;
  legAssignmentMap?: LegAssignmentMap;
  expenses: InitialExpenseItem[];
  paymentAccountIds?: string[];
}

export interface ExpenseCategoryDef {
  id: string;
  label: string;
  emoji: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategoryDef[] = [
  { id: "bbm", label: "BBM / Bahan Bakar", emoji: "⛽" },
  { id: "tol", label: "Tol & Tarif Jalan", emoji: "🛣️" },
  { id: "makan", label: "Makan & Konsumsi", emoji: "🍽️" },
  { id: "parkir", label: "Parkir", emoji: "🅿️" },
  { id: "hotel", label: "Penginapan / Hotel", emoji: "🏨" },
  { id: "tiket", label: "Tiket Wisata", emoji: "🎟️" },
  { id: "belanja", label: "Belanja & Oleh-oleh", emoji: "🛍️" },
  { id: "transport", label: "Transportasi / Sewa", emoji: "🚕" },
  { id: "lainnya", label: "Lainnya", emoji: "📦" },
];

export function detectExpenseCategory(title: string): string {
  const lower = title.toLowerCase().trim();
  if (!lower) return "lainnya";

  if (
    lower.includes("bbm") ||
    lower.includes("bensin") ||
    lower.includes("solar") ||
    lower.includes("pertalite") ||
    lower.includes("pertamax") ||
    lower.includes("dexlite") ||
    lower.includes("spbu") ||
    lower.includes("fuel") ||
    lower.includes("gas")
  ) {
    return "bbm";
  }

  if (
    lower.includes("tol") ||
    lower.includes("e-toll") ||
    lower.includes("etoll") ||
    lower.includes("tarif")
  ) {
    return "tol";
  }

  if (
    lower.includes("makan") ||
    lower.includes("resto") ||
    lower.includes("kafe") ||
    lower.includes("cafe") ||
    lower.includes("kopi") ||
    lower.includes("snack") ||
    lower.includes("sarapan") ||
    lower.includes("lunch") ||
    lower.includes("dinner") ||
    lower.includes("minum") ||
    lower.includes("padang") ||
    lower.includes("bakso") ||
    lower.includes("warung")
  ) {
    return "makan";
  }

  if (
    lower.includes("parkir") ||
    lower.includes("parking") ||
    lower.includes("valet")
  ) {
    return "parkir";
  }

  if (
    lower.includes("hotel") ||
    lower.includes("villa") ||
    lower.includes("penginapan") ||
    lower.includes("homestay") ||
    lower.includes("resort") ||
    lower.includes("kost")
  ) {
    return "hotel";
  }

  if (
    lower.includes("tiket") ||
    lower.includes("karcis") ||
    lower.includes("masuk") ||
    lower.includes("wisata") ||
    lower.includes("entrance") ||
    lower.includes("wahana")
  ) {
    return "tiket";
  }

  if (
    lower.includes("oleh") ||
    lower.includes("belanja") ||
    lower.includes("souvenir") ||
    lower.includes("pasar") ||
    lower.includes("minimarket") ||
    lower.includes("indomaret") ||
    lower.includes("alfamart")
  ) {
    return "belanja";
  }

  if (
    lower.includes("grab") ||
    lower.includes("gojek") ||
    lower.includes("taksi") ||
    lower.includes("taxi") ||
    lower.includes("sewa") ||
    lower.includes("rental")
  ) {
    return "transport";
  }

  return "lainnya";
}

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseParticipantsList(input: string): string[] {
  const seen = new Set<string>();
  const list: string[] = [];

  for (const line of input.split(/\r?\n+/)) {
    const trimmed = line.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      list.push(trimmed);
    }
  }

  return list;
}

export function validateStep1(data: {
  tripName: string;
  startDate: string;
  endDate?: string;
}): { isValid: boolean; error?: string } {
  if (!data.tripName || !data.tripName.trim()) {
    return { isValid: false, error: "Nama perjalanan wajib diisi." };
  }

  if (!data.startDate || !data.startDate.trim()) {
    return { isValid: false, error: "Tanggal mulai wajib diisi." };
  }

  if (data.endDate && data.endDate.trim()) {
    if (data.endDate < data.startDate) {
      return {
        isValid: false,
        error: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      };
    }
  }

  return { isValid: true };
}

export function validateStep2(
  participants: string[],
  vehicles: VehicleItem[],
): {
  isValid: boolean;
  error?: string;
} {
  if (!participants || participants.length === 0) {
    return { isValid: false, error: "Minimal harus ada 1 peserta perjalanan." };
  }

  if (!vehicles || vehicles.length === 0) {
    return { isValid: false, error: "Minimal harus ada 1 armada kendaraan." };
  }

  for (const v of vehicles) {
    if (!v.label.trim()) {
      return { isValid: false, error: "Nama kendaraan tidak boleh kosong." };
    }
  }

  return { isValid: true };
}

export function validateExpenseItem(item: {
  title: string;
  amountIdr: number;
  payerName: string;
  isFoodStop?: boolean;
  splits?: Array<{ participantName: string; amountIdr: number }>;
}): { isValid: boolean; error?: string } {
  if (!item.title.trim()) {
    return { isValid: false, error: "Judul pengeluaran wajib diisi." };
  }
  if (!item.payerName.trim()) {
    return { isValid: false, error: "Pilih siapa yang membayar pengeluaran." };
  }
  if (item.isFoodStop) {
    if (!item.splits || item.splits.length === 0 || item.amountIdr <= 0) {
      return {
        isValid: false,
        error: "Masukkan nominal tagihan makan minimal untuk 1 orang.",
      };
    }
  } else {
    if (!item.amountIdr || item.amountIdr <= 0) {
      return {
        isValid: false,
        error: "Nominal pengeluaran harus lebih dari 0.",
      };
    }
  }
  return { isValid: true };
}

export function buildFullCreateTripPayload(data: FullTripFormData) {
  const originCity = data.legs[0]?.origin?.trim() || null;
  const destinationCity =
    data.legs[data.legs.length - 1]?.destination?.trim() || null;

  const assignmentsList: Array<{
    legIndex: number;
    participantName: string;
    vehicleIndex: number;
    isDriver: boolean;
  }> = [];

  if (data.legAssignmentMap) {
    data.legs.forEach((leg, legIdx) => {
      const legConfig = data.legAssignmentMap?.[leg.id];
      if (!legConfig) return;

      data.participants.forEach((name) => {
        const pConfig = legConfig[name];
        if (!pConfig || pConfig.isParticipating === false) return;

        const vIdx = data.vehicles.findIndex((v) => v.id === pConfig.vehicleId);

        assignmentsList.push({
          legIndex: legIdx,
          participantName: name,
          vehicleIndex: vIdx >= 0 ? vIdx : 0,
          isDriver: Boolean(pConfig.isDriver),
        });
      });
    });
  }

  return {
    name: data.tripName.trim(),
    originCity,
    destinationCity,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    vehicleLabel: data.vehicles[0]?.label.trim() || DEFAULT_VEHICLE_LABEL,
    vehiclePlate: data.vehicles[0]?.plateNumber.trim() || null,
    legs: data.legs.map((leg) => ({
      origin: leg.origin.trim() || null,
      destination: leg.destination.trim() || null,
      startDatetime: data.startDate ? `${data.startDate}T08:00:00` : null,
      endDatetime: data.endDate ? `${data.endDate}T17:00:00` : null,
    })),
    vehicles: data.vehicles.map((v) => ({
      label: v.label.trim() || DEFAULT_VEHICLE_LABEL,
      plateNumber: v.plateNumber.trim() || null,
      seatCapacity: 7,
    })),
    participants: data.participants.map((name) => {
      const vId = data.participantVehicleMap?.[name];
      const vIdx = vId ? data.vehicles.findIndex((v) => v.id === vId) : 0;
      return {
        name,
        isDriver: Boolean(data.driverMap[name]),
        vehicleIndex: vIdx >= 0 ? vIdx : 0,
      };
    }),
    assignments: assignmentsList.length > 0 ? assignmentsList : undefined,
    expenses: data.expenses.map((exp) => {
      const vehicleIdx = data.vehicles.findIndex((v) => v.id === exp.vehicleId);
      const legIdx = data.legs.findIndex((l) => l.id === exp.legId);

      return {
        title: exp.title.trim(),
        amountIdr: exp.amountIdr,
        payerName: exp.payerName,
        category: exp.category || "lainnya",
        expenseType: exp.isFoodStop ? "makan" : exp.category || "lainnya",
        notes: exp.notes.trim() || null,
        vehicleIndex: vehicleIdx >= 0 ? vehicleIdx : null,
        legIndex: legIdx >= 0 ? legIdx : null,
        isFoodStop: Boolean(exp.isFoodStop),
        splits: exp.splits && exp.splits.length > 0 ? exp.splits : undefined,
      };
    }),
    paymentAccountIds:
      data.paymentAccountIds && data.paymentAccountIds.length > 0
        ? data.paymentAccountIds
        : undefined,
    defaultTimes: {
      start: DEFAULT_START_TIME,
      end: DEFAULT_END_TIME,
    },
  };
}

// Backward compatible buildCreateTripPayload
export function buildCreateTripPayload(data: {
  tripName: string;
  originCity: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  vehicleLabel: string;
  vehiclePlate: string;
  participants: string[];
  driverMap: DriverMap;
}) {
  return {
    name: data.tripName.trim(),
    originCity: data.originCity.trim() || null,
    destinationCity: data.destinationCity.trim() || null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    vehicleLabel: data.vehicleLabel.trim() || DEFAULT_VEHICLE_LABEL,
    vehiclePlate: data.vehiclePlate.trim() || null,
    participants: data.participants.map((name) => ({
      name,
      isDriver: Boolean(data.driverMap[name]),
    })),
    defaultTimes: {
      start: DEFAULT_START_TIME,
      end: DEFAULT_END_TIME,
    },
  };
}
