import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";

const timeRegex = /^\d{2}:\d{2}$/;

const updateLegSchema = z
  .object({
    origin: z.string().min(1, "Asal wajib diisi").optional(),
    destination: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    startTime: z
      .string()
      .regex(timeRegex, "Format waktu HH:MM")
      .optional()
      .nullable(),
    notes: z.string().max(500).optional().nullable()
  })
  .refine((values) => Object.values(values).some((value) => value !== undefined), {
    message: "Tidak ada perubahan yang dikirim"
  })
  .refine((values) => values.startDate === undefined || values.startTime !== undefined, {
    message: "Tanggal & jam leg harus dikirim berpasangan"
  })
  .refine((values) => values.startTime === undefined || values.startDate !== undefined, {
    message: "Tanggal & jam leg harus dikirim berpasangan"
  });

function combineDateTime(date?: string | null, time?: string | null) {
  if (!date) {
    return null;
  }
  const safeTime = time && timeRegex.test(time) ? time : "00:00";
  const [hour, minute] = safeTime.split(":");
  return new Date(`${date}T${hour}:${minute}:00`).toISOString();
}

export async function PATCH(request: Request, { params }: { params: { tripId: string; legId: string } }) {
  const payload = await request.json().catch(() => null);
  const parsed = updateLegSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message ?? "Data leg tidak valid" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServer();
  const { tripId, legId } = params;

  const { data: legRow, error: legError } = await supabase
    .from("trip_legs")
    .select("trip_id")
    .eq("id", legId)
    .single();

  if (legError || !legRow || legRow.trip_id !== tripId) {
    return NextResponse.json({ message: "Leg tidak ditemukan" }, { status: 404 });
  }

  const updatePayload: Record<string, unknown> = {};

  if (parsed.data.origin !== undefined) {
    updatePayload.origin = parsed.data.origin.trim();
  }
  if (parsed.data.destination !== undefined) {
    updatePayload.destination = parsed.data.destination?.trim() || null;
  }
  if (parsed.data.notes !== undefined) {
    updatePayload.notes = parsed.data.notes?.trim() || null;
  }
  if (parsed.data.startDate !== undefined) {
    updatePayload.start_datetime = combineDateTime(parsed.data.startDate, parsed.data.startTime);
  }
  if (parsed.data.startDate !== undefined) {
    updatePayload.start_datetime = combineDateTime(parsed.data.startDate, parsed.data.startTime);
  }

  const { error: updateError } = await supabase
    .from("trip_legs")
    .update(updatePayload)
    .eq("id", legId)
    .eq("trip_id", tripId);

  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ message: "Gagal memperbarui leg" }, { status: 500 });
  }

  revalidatePath(`/perjalanan/${tripId}`);
  return NextResponse.json({ message: "Leg diperbarui" });
}
