import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { legVehicleLinks, tripLegs, fleetVehicles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";

const timeRegex = /^\d{2}:\d{2}$/;

const baseVehicleSchema = z.object({
  vehicleId: z.string().min(1, "Kendaraan wajib dipilih"),
});

const scheduleFieldsSchema = z.object({
  departureDate: z.string().optional().nullable(),
  departureTime: z
    .string()
    .regex(timeRegex, "Format waktu harus HH:MM")
    .optional()
    .nullable(),
});

const scheduleSchema = baseVehicleSchema.merge(scheduleFieldsSchema);
const linkSchema = scheduleSchema;
const unlinkSchema = baseVehicleSchema;

function combineDateTime(date?: string | null, time?: string | null) {
  if (!date) return null;
  const safeTime = time && timeRegex.test(time) ? time : "00:00";
  const [hour, minute] = safeTime.split(":");
  return new Date(`${date}T${hour}:${minute}:00`).toISOString();
}

export async function POST(
  request: Request,
  { params }: { params: { tripId: string; legId: string } },
) {
  const { tripId, legId } = params;
  if (!tripId || !legId) {
    return NextResponse.json(
      { message: "Parameter tidak lengkap" },
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

  const payload = await request.json().catch(() => null);
  const parsed = linkSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data belum valid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const db = getDb();
  const existingLink = await db
    .select()
    .from(legVehicleLinks)
    .where(
      and(
        eq(legVehicleLinks.legId, legId),
        eq(legVehicleLinks.vehicleId, parsed.data.vehicleId),
      ),
    )
    .get();

  if (existingLink) {
    return NextResponse.json(
      { message: "Kendaraan sudah terhubung dengan leg" },
      { status: 400 },
    );
  }

  const departureAt = combineDateTime(
    parsed.data.departureDate,
    parsed.data.departureTime,
  );
  const now = new Date().toISOString();

  await db.insert(legVehicleLinks).values({
    id: crypto.randomUUID(),
    tripId,
    legId,
    vehicleId: parsed.data.vehicleId,
    departureTime: departureAt,
    createdAt: now,
  });

  revalidatePath(`/perjalanan/${tripId}`);
  return NextResponse.json(
    { message: "Kendaraan ditambahkan ke leg" },
    { status: 201 },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: { tripId: string; legId: string } },
) {
  const { tripId, legId } = params;
  if (!tripId || !legId) {
    return NextResponse.json(
      { message: "Parameter tidak lengkap" },
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

  const payload = await request.json().catch(() => null);
  const parsed = unlinkSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Data penghapusan tidak valid",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const db = getDb();
  await db
    .delete(legVehicleLinks)
    .where(
      and(
        eq(legVehicleLinks.tripId, tripId),
        eq(legVehicleLinks.legId, legId),
        eq(legVehicleLinks.vehicleId, parsed.data.vehicleId),
      ),
    );

  revalidatePath(`/perjalanan/${tripId}`);
  return NextResponse.json({ message: "Kendaraan dilepas dari leg" });
}

export async function PATCH(
  request: Request,
  { params }: { params: { tripId: string; legId: string } },
) {
  const { tripId, legId } = params;
  if (!tripId || !legId) {
    return NextResponse.json(
      { message: "Parameter tidak lengkap" },
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

  const payload = await request.json().catch(() => null);
  const parsed = scheduleSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message ?? "Data jadwal tidak valid" },
      { status: 400 },
    );
  }

  const departureAt = combineDateTime(
    parsed.data.departureDate,
    parsed.data.departureTime,
  );
  const db = getDb();

  await db
    .update(legVehicleLinks)
    .set({ departureTime: departureAt })
    .where(
      and(
        eq(legVehicleLinks.tripId, tripId),
        eq(legVehicleLinks.legId, legId),
        eq(legVehicleLinks.vehicleId, parsed.data.vehicleId),
      ),
    );

  revalidatePath(`/perjalanan/${tripId}`);
  return NextResponse.json({ message: "Jadwal kendaraan diperbarui" });
}
