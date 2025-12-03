import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";

const updateVehicleSchema = z
  .object({
    label: z.string().min(2).max(100).optional(),
    plateNumber: z.string().max(32).optional().nullable(),
    seatCapacity: z.number().int().min(1).max(50).optional(),
    notes: z.string().max(500).optional().nullable()
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Tidak ada perubahan" });

async function ensureVehicleOwnership(tripId: string, vehicleId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("trip_vehicles")
    .select("id")
    .eq("id", vehicleId)
    .eq("trip_id", tripId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function PATCH(request: Request, { params }: { params: { tripId: string; vehicleId: string } }) {
  const { tripId, vehicleId } = params;

  if (!tripId || !vehicleId) {
    return NextResponse.json({ message: "Parameter tidak lengkap" }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateVehicleSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Tidak ada data yang perlu diubah", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const vehicleRow = await ensureVehicleOwnership(tripId, vehicleId);
    if (!vehicleRow) {
      return NextResponse.json({ message: "Kendaraan tidak ditemukan" }, { status: 404 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal mengecek kendaraan" }, { status: 500 });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.label !== undefined) updateData.label = parsed.data.label;
  if (parsed.data.plateNumber !== undefined) updateData.plate_number = parsed.data.plateNumber ?? null;
  if (parsed.data.seatCapacity !== undefined) updateData.seat_capacity = parsed.data.seatCapacity;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes ?? null;

  const supabase = getSupabaseServer();
  const { error: updateError } = await supabase.from("trip_vehicles").update(updateData).eq("id", vehicleId);

  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ message: "Gagal memperbarui kendaraan" }, { status: 500 });
  }

  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Kendaraan diperbarui" });
}

export async function DELETE(_request: Request, { params }: { params: { tripId: string; vehicleId: string } }) {
  const { tripId, vehicleId } = params;

  if (!tripId || !vehicleId) {
    return NextResponse.json({ message: "Parameter tidak lengkap" }, { status: 400 });
  }

  try {
    const vehicleRow = await ensureVehicleOwnership(tripId, vehicleId);
    if (!vehicleRow) {
      return NextResponse.json({ message: "Kendaraan tidak ditemukan" }, { status: 404 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal mengecek kendaraan" }, { status: 500 });
  }

  const supabase = getSupabaseServer();
  const { error: deleteError } = await supabase.from("trip_vehicles").delete().eq("id", vehicleId);

  if (deleteError) {
    console.error(deleteError);
    return NextResponse.json({ message: "Gagal menghapus kendaraan" }, { status: 500 });
  }

  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Kendaraan dihapus" });
}
