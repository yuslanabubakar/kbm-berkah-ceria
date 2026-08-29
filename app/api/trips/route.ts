import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  trips,
  tripLegs,
  fleetVehicles,
  legVehicleLinks,
  participants,
  vehicleAssignments,
  expenses,
  expenseSplits,
  tripPaymentAccounts,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

const participantSchema = z.object({
  name: z.string().min(1, "Nama peserta wajib diisi"),
  isDriver: z.boolean().optional().default(false),
  vehicleIndex: z.number().int().nonnegative().optional().nullable(),
});

const timeSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

const legInputSchema = z.object({
  origin: z.string().nullable().optional(),
  destination: z.string().nullable().optional(),
  startDatetime: z.string().nullable().optional(),
  endDatetime: z.string().nullable().optional(),
});

const vehicleInputSchema = z.object({
  label: z.string().min(1, "Nama kendaraan wajib diisi"),
  plateNumber: z.string().nullable().optional(),
  seatCapacity: z.number().int().positive().optional().default(7),
});

const legAssignmentSchema = z.object({
  legIndex: z.number().int().nonnegative(),
  participantName: z.string().min(1),
  vehicleIndex: z.number().int().nonnegative(),
  isDriver: z.boolean().optional().default(false),
});

const initialExpenseSplitSchema = z.object({
  participantName: z.string().min(1),
  amountIdr: z.number().positive(),
});

const initialExpenseSchema = z.object({
  title: z.string().min(1, "Judul pengeluaran wajib diisi"),
  amountIdr: z.number().positive("Nominal harus lebih dari 0"),
  payerName: z.string().min(1, "Pembayar wajib dipilih"),
  expenseType: z.string().optional().default("lainnya"),
  notes: z.string().nullable().optional(),
  vehicleIndex: z.number().int().nonnegative().optional().nullable(),
  legIndex: z.number().int().nonnegative().optional().nullable(),
  isFoodStop: z.boolean().optional().default(false),
  splits: z.array(initialExpenseSplitSchema).optional(),
});

const createTripSchema = z.object({
  name: z.string().min(3, "Nama perjalanan terlalu pendek"),
  originCity: z.string().nullable().optional(),
  destinationCity: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  vehicleLabel: z.string().nullable().optional(),
  vehiclePlate: z.string().nullable().optional(),
  participants: z.array(participantSchema).min(1, "Minimal satu peserta"),
  defaultTimes: timeSchema.optional(),
  legs: z.array(legInputSchema).optional(),
  vehicles: z.array(vehicleInputSchema).optional(),
  assignments: z.array(legAssignmentSchema).optional(),
  expenses: z.array(initialExpenseSchema).optional(),
  paymentAccountIds: z.array(z.string()).optional(),
});

function combineDateTime(dateString?: string | null, timeString?: string) {
  if (!dateString) return null;
  if (!timeString) return new Date(dateString).toISOString();
  const [hour, minute] = timeString.split(":");
  return new Date(
    `${dateString}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00`,
  ).toISOString();
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = createTripSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data belum valid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
    );
  }

  const {
    name,
    originCity,
    destinationCity,
    startDate,
    endDate,
    vehicleLabel,
    vehiclePlate,
    participants: participantList,
    defaultTimes,
    legs: inputLegs,
    vehicles: inputVehicles,
    assignments: inputAssignments,
    expenses: inputExpenses,
    paymentAccountIds,
  } = parsed.data;

  const db = getDb();
  const tripId = crypto.randomUUID();
  const now = new Date().toISOString();

  const startDateTime =
    combineDateTime(startDate, defaultTimes?.start ?? "08:00") ?? now;
  const endDateTime = combineDateTime(endDate, defaultTimes?.end ?? "17:00");

  try {
    // 1. Create Trip
    await db.insert(trips).values({
      id: tripId,
      ownerId: currentUser.id,
      name,
      originCity: originCity ?? null,
      destinationCity: destinationCity ?? null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      status: "ongoing",
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create Legs
    const createdLegIds: string[] = [];
    const legsToCreate =
      inputLegs && inputLegs.length > 0
        ? inputLegs
        : [
            {
              origin: originCity ?? destinationCity ?? "Start",
              destination: destinationCity ?? originCity ?? "Finish",
              startDatetime: startDateTime,
              endDatetime: endDateTime ?? null,
            },
          ];

    for (let i = 0; i < legsToCreate.length; i++) {
      const leg = legsToCreate[i];
      const legId = crypto.randomUUID();
      createdLegIds.push(legId);

      await db.insert(tripLegs).values({
        id: legId,
        tripId,
        legOrder: i + 1,
        legType: "custom",
        startDatetime: leg.startDatetime || startDateTime,
        endDatetime: leg.endDatetime || endDateTime || null,
        origin: leg.origin || originCity || destinationCity || "Start",
        destination:
          leg.destination || destinationCity || originCity || "Finish",
        createdAt: now,
      });
    }

    // 3. Create Vehicles
    const createdVehicleIds: string[] = [];
    const vehiclesToCreate =
      inputVehicles && inputVehicles.length > 0
        ? inputVehicles
        : [
            {
              label: vehicleLabel?.trim() || "Kendaraan utama",
              plateNumber: vehiclePlate?.trim() || null,
              seatCapacity: 7,
            },
          ];

    for (const v of vehiclesToCreate) {
      const vehicleId = crypto.randomUUID();
      createdVehicleIds.push(vehicleId);

      await db.insert(fleetVehicles).values({
        id: vehicleId,
        tripId,
        label: v.label.trim(),
        plateNumber: v.plateNumber?.trim() || null,
        seatCapacity: v.seatCapacity || 7,
        createdAt: now,
      });
    }

    // 4. Create Leg Vehicle Links
    for (const legId of createdLegIds) {
      for (const vehicleId of createdVehicleIds) {
        await db.insert(legVehicleLinks).values({
          id: crypto.randomUUID(),
          tripId,
          legId,
          vehicleId,
          departureTime: startDateTime,
          createdAt: now,
        });
      }
    }

    // 5. Create Participants
    const participantNameMap = new Map<string, string>();
    const participantRows = participantList.map((p) => {
      const pid = crypto.randomUUID();
      participantNameMap.set(p.name.trim().toLowerCase(), pid);
      return {
        id: pid,
        tripId,
        displayName: p.name.trim(),
        role: p.isDriver ? "driver" : "member",
        isDriver: Boolean(p.isDriver),
        joinedAt: now,
      };
    });

    for (const pRow of participantRows) {
      await db.insert(participants).values(pRow);
    }

    // 6. Create Vehicle Assignments per Leg
    if (inputAssignments && inputAssignments.length > 0) {
      for (const a of inputAssignments) {
        const legId = createdLegIds[a.legIndex] || createdLegIds[0];
        const vehicleId =
          createdVehicleIds[a.vehicleIndex] || createdVehicleIds[0];
        const participantId = participantNameMap.get(
          a.participantName.trim().toLowerCase(),
        );

        if (legId && vehicleId && participantId) {
          await db.insert(vehicleAssignments).values({
            id: crypto.randomUUID(),
            legId,
            vehicleId,
            participantId,
            role: a.isDriver ? "driver" : "passenger",
            joinedAt: now,
          });
        }
      }
    } else {
      // Default / fallback: Assign participants across all legs
      for (const legId of createdLegIds) {
        for (let i = 0; i < participantRows.length; i++) {
          const pRow = participantRows[i];
          const pInput = participantList[i];
          const isDriver = pInput?.isDriver;
          const vIndex = pInput?.vehicleIndex;
          const assignedVehicleId =
            vIndex != null && createdVehicleIds[vIndex]
              ? createdVehicleIds[vIndex]
              : createdVehicleIds[0];

          await db.insert(vehicleAssignments).values({
            id: crypto.randomUUID(),
            legId,
            vehicleId: assignedVehicleId,
            participantId: pRow.id,
            role: isDriver ? "driver" : "passenger",
            joinedAt: now,
          });
        }
      }
    }

    // 7. Create Initial Expenses (with Food-Stop splits support)
    if (inputExpenses && inputExpenses.length > 0) {
      for (const exp of inputExpenses) {
        const payerId =
          participantNameMap.get(exp.payerName.trim().toLowerCase()) ||
          participantRows[0].id;

        const legId =
          exp.legIndex != null && createdLegIds[exp.legIndex]
            ? createdLegIds[exp.legIndex]
            : createdLegIds[0];

        const vehicleId =
          exp.vehicleIndex != null && createdVehicleIds[exp.vehicleIndex]
            ? createdVehicleIds[exp.vehicleIndex]
            : null;

        const expenseId = crypto.randomUUID();
        const hasSplits = exp.splits && exp.splits.length > 0;
        const totalAmount = hasSplits
          ? exp.splits!.reduce((sum, s) => sum + s.amountIdr, 0)
          : exp.amountIdr;

        await db.insert(expenses).values({
          id: expenseId,
          tripId,
          legId,
          vehicleId,
          paidBy: payerId,
          title: exp.title.trim(),
          amountIdr: totalAmount,
          notes: exp.notes?.trim() || null,
          expenseType: exp.isFoodStop ? "makan" : exp.expenseType || "lainnya",
          shareScope: hasSplits ? "vehicle" : vehicleId ? "vehicle" : "leg",
          issuedAt: now,
          createdBy: currentUser.id,
          isExcluded: false,
          createdAt: now,
        });

        if (hasSplits) {
          for (const s of exp.splits!) {
            const pId = participantNameMap.get(
              s.participantName.trim().toLowerCase(),
            );
            if (pId) {
              await db.insert(expenseSplits).values({
                id: crypto.randomUUID(),
                expenseId,
                participantId: pId,
                shareAmountOverride: s.amountIdr,
                shareWeight: 1,
                createdAt: now,
              });
            }
          }
        }
      }
    }

    // 8. Attach Trip Payment Accounts (if any)
    if (paymentAccountIds && paymentAccountIds.length > 0) {
      for (let i = 0; i < paymentAccountIds.length; i++) {
        const accId = paymentAccountIds[i];
        await db.insert(tripPaymentAccounts).values({
          id: crypto.randomUUID(),
          tripId,
          paymentAccountId: accId,
          customPriority: i + 1,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    revalidatePath("/");

    return NextResponse.json(
      { message: "Perjalanan dibuat", data: { tripId } },
      { status: 201 },
    );
  } catch (err) {
    console.error("Error creating trip:", err);
    // Cleanup if trip creation failed partially
    try {
      await db.delete(trips).where(eq(trips.id, tripId));
    } catch {
      // ignore cleanup errors
    }
    return NextResponse.json(
      { message: "Gagal membuat perjalanan" },
      { status: 500 },
    );
  }
}
