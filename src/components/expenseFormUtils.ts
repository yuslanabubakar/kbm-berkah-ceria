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
    if (leg.vehicles.length) {
      leg.vehicles.forEach((vehicle, index) => {
        const suffix = leg.vehicles.length > 1 ? String.fromCharCode(65 + index) : "";
        const numberLabel = `${leg.order}${suffix}`;
        const vehicleLabel = vehicle.plateNumber
          ? `${vehicle.label} (${vehicle.plateNumber})`
          : vehicle.label;
        options.push({
          key: `${leg.id}::${vehicle.id}`,
          legId: leg.id,
          vehicleId: vehicle.id,
          label: `${numberLabel}. ${leg.label} · ${vehicleLabel}`
        });
      });
    } else {
      options.push({
        key: `${leg.id}::none`,
        legId: leg.id,
        vehicleId: null,
        label: `${leg.order}. ${leg.label} · Semua kendaraan`
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
      required_error: "Pilih cara pembagian biaya"
    })
  })
  .superRefine((data, ctx) => {
    if (data.shareScope === "vehicle" && !data.vehicleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shareScope"],
        message: "Pilih kendaraan dulu untuk pakai opsi ini"
      });
    }
  });

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
