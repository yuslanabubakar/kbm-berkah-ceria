import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fleetVehicles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";

const updateVehicleSchema = z
  .object({
    label: z.string().min(2).max(100).optional(),
    plateNumber: z.string().max(32).optional().nullable(),
    seatCapacity: z.number().int().min(1).max(50).optional(),
    notes: z.string().max(500).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Tidak ada perubahan",
  });

export async function PATCH(
  request: Request,
  { params }: { params: { tripId: string; vehicleId: string } },
) {
  const { tripId, vehicleId } = params;
  if (!tripId || !vehicleId) {
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
  const parsed = updateVehicleSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Tidak ada data yang perlu diubah",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const db = getDb();
  const vehicle = await db
    .select()
    .from(fleetVehicles)
    .where(
      and(eq(fleetVehicles.id, vehicleId), eq(fleetVehicles.tripId, tripId)),
    )
    .get();

  if (!vehicle) {
    return NextResponse.json(
      { message: "Kendaraan tidak ditemukan" },
      { status: 404 },
    );
  }

  const updateData: Record<string, any> = {};
  if (parsed.data.label !== undefined) updateData.label = parsed.data.label;
  if (parsed.data.plateNumber !== undefined)
    updateData.plateNumber = parsed.data.plateNumber ?? null;
  if (parsed.data.seatCapacity !== undefined)
    updateData.seatCapacity = parsed.data.seatCapacity;
  if (parsed.data.notes !== undefined)
    updateData.notes = parsed.data.notes ?? null;

  await db
    .update(fleetVehicles)
    .set(updateData)
    .where(eq(fleetVehicles.id, vehicleId));

  revalidatePath(`/perjalanan/${tripId}`);
  return NextResponse.json({ message: "Kendaraan diperbarui" });
}

export async function DELETE(
  request: Request,
  { params }: { params: { tripId: string; vehicleId: string } },
) {
  const { tripId, vehicleId } = params;
  if (!tripId || !vehicleId) {
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

  const db = getDb();
  const vehicle = await db
    .select()
    .from(fleetVehicles)
    .where(
      and(eq(fleetVehicles.id, vehicleId), eq(fleetVehicles.tripId, tripId)),
    )
    .get();

  if (!vehicle) {
    return NextResponse.json(
      { message: "Kendaraan tidak ditemukan" },
      { status: 404 },
    );
  }

  await db.delete(fleetVehicles).where(eq(fleetVehicles.id, vehicleId));

  revalidatePath(`/perjalanan/${tripId}`);
  return NextResponse.json({ message: "Kendaraan dihapus" });
}
