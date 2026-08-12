import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fleetVehicles } from "@/db/schema";

export const runtime = "edge";

const createVehicleSchema = z.object({
  label: z.string().min(2, "Nama kendaraan terlalu pendek"),
  plateNumber: z.string().max(32).optional().nullable(),
  seatCapacity: z.number().int().min(1).max(50).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: { tripId: string } },
) {
  const { tripId } = params;
  if (!tripId) {
    return NextResponse.json(
      { message: "Trip tidak ditemukan" },
      { status: 404 },
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
  const parsed = createVehicleSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data kendaraan belum valid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const db = getDb();
  const vehicleId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(fleetVehicles).values({
    id: vehicleId,
    tripId,
    label: parsed.data.label,
    plateNumber: parsed.data.plateNumber ?? null,
    seatCapacity: parsed.data.seatCapacity ?? 7,
    notes: parsed.data.notes ?? null,
    createdAt: now,
  });

  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json(
    { message: "Kendaraan ditambahkan", data: { vehicleId } },
    { status: 201 },
  );
}
