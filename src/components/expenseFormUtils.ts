import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { z } from "zod";
import type { TripLeg } from "@/lib/tripQueries";

export type LegVehicleOption = {
  key: string;
  legId: string;
  vehicleId: string | null;
  label: string;
};

export type ExpenseCategory = {
  id: string;
  label: string;
  emoji: string;
  keywords: string[];
  color: string;
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: "bbm",
    label: "BBM / Bensin",
    emoji: "⛽",
    keywords: [
      "bensin",
      "bbm",
      "solar",
      "premium",
      "pertamax",
      "pertalite",
      "spbu",
      "fuel",
    ],
    color: "#f59e0b",
  },
  {
    id: "tol",
    label: "Tol",
    emoji: "🛣️",
    keywords: [
      "tol",
      "toll",
      "e-toll",
      "tol cipularang",
      "tol cikampek",
      "tol jagorawi",
      "jalan tol",
    ],
    color: "#6366f1",
  },
  {
    id: "makan",
    label: "Makan & Minum",
    emoji: "🍽️",
    keywords: [
      "makan",
      "minum",
      "nasi",
      "restoran",
      "warung",
      "kafe",
      "cafe",
      "lunch",
      "dinner",
      "breakfast",
      "sarapan",
      "siang",
      "malam",
      "snack",
      "jajanan",
      "kopi",
    ],
    color: "#10b981",
  },
  {
    id: "parkir",
    label: "Parkir",
    emoji: "🅿️",
    keywords: ["parkir", "parking", "valet", "inap"],
    color: "#8b5cf6",
  },
  {
    id: "hotel",
    label: "Hotel / Penginapan",
    emoji: "🏨",
    keywords: [
      "hotel",
      "penginapan",
      "homestay",
      "villa",
      "kos",
      "resort",
      "motel",
      "hostel",
      "kamar",
    ],
    color: "#2E5AAC",
  },
  {
    id: "tiket",
    label: "Tiket & Wisata",
    emoji: "🎫",
    keywords: [
      "tiket",
      "ticket",
      "masuk",
      "wisata",
      "atraksi",
      "wahana",
      "museum",
      "taman",
      "pantai",
      "resort",
    ],
    color: "#ec4899",
  },
  {
    id: "belanja",
    label: "Belanja & Oleh-oleh",
    emoji: "🛍️",
    keywords: [
      "belanja",
      "oleh",
      "souvenir",
      "cinderamata",
      "toko",
      "pasar",
      "mall",
    ],
    color: "#FF7B6A",
  },
  {
    id: "transport",
    label: "Transportasi",
    emoji: "🚗",
    keywords: [
      "sewa",
      "rental",
      "mobil",
      "bus",
      "kereta",
      "pesawat",
      "kapal",
      "feri",
      "ojek",
      "taxi",
      "grab",
      "gojek",
      "angkot",
    ],
    color: "#0ea5e9",
  },
  {
    id: "lainnya",
    label: "Lainnya",
    emoji: "📌",
    keywords: [],
    color: "#94a3b8",
  },
];

/**
 * Auto-detect expense category from the expense title.
 * Returns the matched category id, or "lainnya" as fallback.
 */
export function detectCategory(title: string): string {
  if (!title || title.trim().length < 2) return "lainnya";
  const lower = title.toLowerCase();

  for (const cat of EXPENSE_CATEGORIES) {
    if (cat.id === "lainnya") continue;
    if (cat.keywords.some((kw) => lower.includes(kw))) {
      return cat.id;
    }
  }
  return "lainnya";
}

export function getCategoryById(id: string): ExpenseCategory {
  return (
    EXPENSE_CATEGORIES.find((c) => c.id === id) ??
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  );
}

export function formatLegDateRange(leg?: TripLeg): string {
  if (!leg) return "Tanggal leg belum ditentukan";
  const dayText = leg.start
    ? format(new Date(leg.start), "EEEE, d MMM yyyy", { locale: localeId })
    : leg.end
      ? format(new Date(leg.end), "EEEE, d MMM yyyy", { locale: localeId })
      : null;

  return dayText ?? "Tanggal leg belum ditentukan";
}

export function buildLegVehicleOptions(legs: TripLeg[]): LegVehicleOption[] {
  const options: LegVehicleOption[] = [];

  legs.forEach((leg) => {
    if (leg.vehicles.length > 1) {
      options.push({
        key: `${leg.id}::none`,
        legId: leg.id,
        vehicleId: null,
        label: `${leg.order}. ${leg.label} · Semua kendaraan`,
      });
    }

    if (leg.vehicles.length) {
      leg.vehicles.forEach((vehicle, index) => {
        const suffix =
          leg.vehicles.length > 1 ? String.fromCharCode(65 + index) : "";
        const numberLabel = `${leg.order}${suffix}`;
        const vehicleLabel = vehicle.plateNumber
          ? `${vehicle.label} (${vehicle.plateNumber})`
          : vehicle.label;
        options.push({
          key: `${leg.id}::${vehicle.id}`,
          legId: leg.id,
          vehicleId: vehicle.id,
          label: `${numberLabel}. ${leg.label} · ${vehicleLabel}`,
        });
      });
    } else {
      options.push({
        key: `${leg.id}::none`,
        legId: leg.id,
        vehicleId: null,
        label: `${leg.order}. ${leg.label} · Semua kendaraan`,
      });
    }
  });

  return options;
}

export const expenseFormSchema = z
  .object({
    judul: z.string().min(2, "Judulnya apa nih?"),
    amountIdr: z.number().min(1000, "Minimal seribu ya"),
    catatan: z.string().max(200).optional(),
    legId: z.string().min(1, "Pilih leg perjalanan"),
    vehicleId: z.string().optional().nullable(),
    paidById: z.string().min(1, "Siapa yang bayar?"),
    shareScope: z.enum(["leg", "vehicle"], {
      required_error: "Pilih cara pembagian biaya",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.shareScope === "vehicle" && !data.vehicleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shareScope"],
        message: "Pilih kendaraan dulu untuk pakai opsi ini",
      });
    }
  });

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export type QuickExpenseKind = "bbm" | "tol" | "makan" | "lainnya";

export type QuickBatchRow = {
  id: string;
  kind: "tol" | "bbm" | "lainnya";
  legId: string;
  legShortName: string;
  vehicleId: string | null;
  vehicleLabel: string | null;
  title: string;
  amountIdr: number;
  paidById: string;
};

export function getLegShortName(legIndex: number, totalLegs: number): string {
  if (totalLegs === 2) {
    return legIndex === 0 ? "Pergi" : "Pulang";
  }
  return `Leg ${legIndex + 1}`;
}

export function buildAutoExpenseTitle(
  kind: QuickExpenseKind,
  legIndex: number,
  totalLegs: number,
  vehicleLabel?: string | null,
): string {
  if (kind === "lainnya") return "";
  const baseLabel =
    kind === "bbm" ? "Bensin" : kind === "tol" ? "Tol" : "Makan";
  const direction = getLegShortName(legIndex, totalLegs);
  if (vehicleLabel) {
    return `${baseLabel} ${vehicleLabel} ${direction}`;
  }
  return `${baseLabel} ${direction}`;
}

export function buildQuickBatchRows(
  sortedLegs: TripLeg[],
  defaultPaidById: string,
): QuickBatchRow[] {
  const rows: QuickBatchRow[] = [];
  const totalLegs = sortedLegs.length;
  const hasMultiVehicle = sortedLegs.some((leg) => leg.vehicles.length > 1);

  if (!hasMultiVehicle) {
    sortedLegs.forEach((leg, idx) => {
      const legShortName = getLegShortName(idx, totalLegs);
      const singleVehicle = leg.vehicles[0] ?? null;
      rows.push({
        id: `${leg.id}:tol`,
        kind: "tol",
        legId: leg.id,
        legShortName,
        vehicleId: singleVehicle?.id ?? null,
        vehicleLabel: null,
        title: buildAutoExpenseTitle("tol", idx, totalLegs),
        amountIdr: 0,
        paidById: defaultPaidById,
      });
      rows.push({
        id: `${leg.id}:bbm`,
        kind: "bbm",
        legId: leg.id,
        legShortName,
        vehicleId: singleVehicle?.id ?? null,
        vehicleLabel: null,
        title: buildAutoExpenseTitle("bbm", idx, totalLegs),
        amountIdr: 0,
        paidById: defaultPaidById,
      });
    });

    return rows;
  }

  // Multi-vehicle trip: group Tol & Bensin rows by vehicle so every car is ready to fill in 1 go
  const vehicleOrder: Array<{ id: string; label: string }> = [];
  const seenVehicles = new Set<string>();
  for (const leg of sortedLegs) {
    for (const v of leg.vehicles) {
      if (!seenVehicles.has(v.id)) {
        seenVehicles.add(v.id);
        vehicleOrder.push({ id: v.id, label: v.label });
      }
    }
  }

  for (const vehicle of vehicleOrder) {
    sortedLegs.forEach((leg, idx) => {
      const legVehicle = leg.vehicles.find((v) => v.id === vehicle.id);
      if (!legVehicle) return;
      const legShortName = getLegShortName(idx, totalLegs);
      const preferredPayer =
        legVehicle.assignments.find((a) => a.role === "driver")
          ?.participantId ??
        legVehicle.assignments[0]?.participantId ??
        defaultPaidById;

      rows.push({
        id: `${vehicle.id}:${leg.id}:tol`,
        kind: "tol",
        legId: leg.id,
        legShortName,
        vehicleId: vehicle.id,
        vehicleLabel: vehicle.label,
        title: buildAutoExpenseTitle("tol", idx, totalLegs, vehicle.label),
        amountIdr: 0,
        paidById: preferredPayer,
      });
      rows.push({
        id: `${vehicle.id}:${leg.id}:bbm`,
        kind: "bbm",
        legId: leg.id,
        legShortName,
        vehicleId: vehicle.id,
        vehicleLabel: vehicle.label,
        title: buildAutoExpenseTitle("bbm", idx, totalLegs, vehicle.label),
        amountIdr: 0,
        paidById: preferredPayer,
      });
    });
  }

  return rows;
}
