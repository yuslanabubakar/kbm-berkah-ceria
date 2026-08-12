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
} from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

const participantSchema = z.object({
  name: z.string().min(1, "Nama peserta wajib diisi"),
  isDriver: z.boolean().optional().default(false),
});

const timeSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
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
  } = parsed.data;

  const db = getDb();
  const tripId = crypto.randomUUID();
  const legId = crypto.randomUUID();
  const vehicleId = crypto.randomUUID();
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

    // 2. Create Leg
    await db.insert(tripLegs).values({
      id: legId,
      tripId,
      legOrder: 1,
      legType: "custom",
      startDatetime: startDateTime,
      endDatetime: endDateTime ?? null,
      origin: originCity ?? destinationCity ?? "Start",
      destination: destinationCity ?? originCity ?? "Finish",
      createdAt: now,
    });

    // 3. Create Vehicle
    await db.insert(fleetVehicles).values({
      id: vehicleId,
      tripId,
      label: vehicleLabel?.trim() || "Kendaraan utama",
      plateNumber: vehiclePlate?.trim() || null,
      seatCapacity: 7,
      createdAt: now,
    });

    // 4. Create Leg Vehicle Link
    await db.insert(legVehicleLinks).values({
      id: crypto.randomUUID(),
      tripId,
      legId,
      vehicleId,
      departureTime: startDateTime,
      createdAt: now,
    });

    // 5. Create Participants & Assignments
    const participantRows = participantList.map((p) => ({
      id: crypto.randomUUID(),
      tripId,
      displayName: p.name,
      role: p.isDriver ? "driver" : "member",
      isDriver: Boolean(p.isDriver),
      joinedAt: now,
    }));

    for (const pRow of participantRows) {
      await db.insert(participants).values(pRow);
    }

    for (let i = 0; i < participantRows.length; i++) {
      const pRow = participantRows[i];
      const isDriver = participantList[i]?.isDriver;
      await db.insert(vehicleAssignments).values({
        id: crypto.randomUUID(),
        legId,
        vehicleId,
        participantId: pRow.id,
        role: isDriver ? "driver" : "passenger",
        joinedAt: now,
      });
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
