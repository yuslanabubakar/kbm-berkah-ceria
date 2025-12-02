import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseClient";

const timeRegex = /^\d{2}:\d{2}$/;

const baseVehicleSchema = z.object({
  vehicleId: z.string().min(1, "Kendaraan wajib dipilih")
});

const scheduleFieldsSchema = z.object({
  departureDate: z.string().optional().nullable(),
  departureTime: z
    .string()
    .regex(timeRegex, "Format waktu harus HH:MM")
    .optional()
    .nullable()
});

const scheduleSchema = baseVehicleSchema.merge(scheduleFieldsSchema).refine((values) => {
  const hasDate = Boolean(values.departureDate);
  const hasTime = Boolean(values.departureTime);
  return hasDate === hasTime;
}, { message: "Tanggal & jam keberangkatan harus diisi bersamaan" });

const linkSchema = scheduleSchema;
const unlinkSchema = baseVehicleSchema;

function combineDateTime(date?: string | null, time?: string | null) {
  if (!date) {
    return null;
  }
  const safeTime = time && timeRegex.test(time) ? time : "00:00";
  const [hour, minute] = safeTime.split(":");
  return new Date(`${date}T${hour}:${minute}:00`).toISOString();
}

async function ensureLeg(tripId: string, legId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("trip_legs")
    .select("id")
    .eq("id", legId)
    .eq("trip_id", tripId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function ensureVehicle(tripId: string, vehicleId: string) {
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

async function ensureLink(tripId: string, legId: string, vehicleId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("leg_vehicle_links")
    .select("id")
    .eq("trip_id", tripId)
    .eq("leg_id", legId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function POST(request: Request, { params }: { params: { tripId: string; legId: string } }) {
  const { tripId, legId } = params;

  if (!tripId || !legId) {
    return NextResponse.json({ message: "Parameter tidak lengkap" }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = linkSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Data belum valid", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const [legRow, vehicleRow, existingLink] = await Promise.all([
      ensureLeg(tripId, legId),
      ensureVehicle(tripId, parsed.data.vehicleId),
      ensureLink(tripId, legId, parsed.data.vehicleId)
    ]);

    if (!legRow) {
      return NextResponse.json({ message: "Leg tidak ditemukan" }, { status: 404 });
    }

    if (!vehicleRow) {
      return NextResponse.json({ message: "Kendaraan tidak ditemukan" }, { status: 404 });
    }

    if (existingLink) {
      return NextResponse.json({ message: "Kendaraan sudah terhubung dengan leg" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal memverifikasi data" }, { status: 500 });
  }

  const supabase = getSupabaseServer();
  const departureAt = combineDateTime(parsed.data.departureDate, parsed.data.departureTime);
  const { error: insertError } = await supabase.from("leg_vehicle_links").insert({
    trip_id: tripId,
    leg_id: legId,
    vehicle_id: parsed.data.vehicleId,
    departure_at: departureAt
  });

  if (insertError) {
    console.error(insertError);
    return NextResponse.json({ message: "Gagal menghubungkan kendaraan" }, { status: 500 });
  }

  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Kendaraan ditambahkan ke leg" }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: { tripId: string; legId: string } }) {
  const { tripId, legId } = params;

  if (!tripId || !legId) {
    return NextResponse.json({ message: "Parameter tidak lengkap" }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = unlinkSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Data penghapusan tidak valid", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const linkRow = await ensureLink(tripId, legId, parsed.data.vehicleId);
    if (!linkRow) {
      return NextResponse.json({ message: "Relasi kendaraan tidak ditemukan" }, { status: 404 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal mengecek relasi" }, { status: 500 });
  }

  const supabase = getSupabaseServer();
  const { error: deleteError } = await supabase
    .from("leg_vehicle_links")
    .delete()
    .eq("trip_id", tripId)
    .eq("leg_id", legId)
    .eq("vehicle_id", parsed.data.vehicleId);

  if (deleteError) {
    console.error(deleteError);
    return NextResponse.json({ message: "Gagal melepas kendaraan" }, { status: 500 });
  }

  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Kendaraan dilepas dari leg" });
}

export async function PATCH(request: Request, { params }: { params: { tripId: string; legId: string } }) {
  const { tripId, legId } = params;

  if (!tripId || !legId) {
    return NextResponse.json({ message: "Parameter tidak lengkap" }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = scheduleSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message ?? "Data jadwal tidak valid" }, { status: 400 });
  }

  try {
    const linkRow = await ensureLink(tripId, legId, parsed.data.vehicleId);
    if (!linkRow) {
      return NextResponse.json({ message: "Relasi kendaraan tidak ditemukan" }, { status: 404 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal mengecek relasi" }, { status: 500 });
  }

  const departureAt = combineDateTime(parsed.data.departureDate, parsed.data.departureTime);

  const supabase = getSupabaseServer();
  const { error: updateError } = await supabase
    .from("leg_vehicle_links")
    .update({ departure_at: departureAt })
    .eq("trip_id", tripId)
    .eq("leg_id", legId)
    .eq("vehicle_id", parsed.data.vehicleId);

  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ message: "Gagal menyimpan jadwal kendaraan" }, { status: 500 });
  }

  revalidatePath(`/perjalanan/${tripId}`);
  return NextResponse.json({ message: "Jadwal kendaraan diperbarui" });
}
