import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseClient";

const createVehicleSchema = z.object({
  label: z.string().min(2, "Nama kendaraan terlalu pendek"),
  plateNumber: z.string().max(32).optional().nullable(),
  seatCapacity: z.number().int().min(1).max(50).optional(),
  notes: z.string().max(500).optional().nullable()
});

export async function POST(request: Request, { params }: { params: { tripId: string } }) {
  const { tripId } = params;

  if (!tripId) {
    return NextResponse.json({ message: "Trip tidak ditemukan" }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createVehicleSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Data kendaraan belum valid", issues: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const insertData = {
    trip_id: tripId,
    label: parsed.data.label,
    plate_number: parsed.data.plateNumber ?? null,
    seat_capacity: parsed.data.seatCapacity ?? 7,
    notes: parsed.data.notes ?? null
  };

  const { data: vehicleRow, error: vehicleError } = await supabase
    .from("trip_vehicles")
    .insert(insertData)
    .select("id")
    .single();

  if (vehicleError || !vehicleRow) {
    console.error(vehicleError);
    return NextResponse.json({ message: "Gagal menambahkan kendaraan" }, { status: 500 });
  }

  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Kendaraan ditambahkan", data: { vehicleId: vehicleRow.id } }, { status: 201 });
}
