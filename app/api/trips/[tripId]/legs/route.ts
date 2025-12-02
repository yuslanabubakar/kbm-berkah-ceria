import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseClient";

const timeRegex = /^\d{2}:\d{2}$/;

type LegOrderRow = {
  leg_order: number;
};

const createLegSchema = z.object({
  origin: z.string().min(1, "Asal leg wajib diisi"),
  destination: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  startTime: z
    .string()
    .regex(timeRegex, "Format waktu harus HH:MM")
    .optional()
    .nullable(),
  notes: z.string().max(500).optional().nullable()
});

function combineDateTime(date?: string | null, time?: string | null) {
  if (!date) {
    return null;
  }
  const safeTime = time && timeRegex.test(time) ? time : "00:00";
  const [hour, minute] = safeTime.split(":");
  return new Date(`${date}T${hour}:${minute}:00`).toISOString();
}

export async function POST(request: Request, { params }: { params: { tripId: string } }) {
  const { tripId } = params;

  if (!tripId) {
    return NextResponse.json({ message: "Trip tidak ditemukan" }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createLegSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Data leg belum valid", issues: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const { data: tripRow, error: tripError } = await supabase.from("trips").select("id").eq("id", tripId).maybeSingle();

  if (tripError) {
    console.error(tripError);
    return NextResponse.json({ message: "Gagal mengecek perjalanan" }, { status: 500 });
  }

  if (!tripRow) {
    return NextResponse.json({ message: "Trip tidak ditemukan" }, { status: 404 });
  }

  const { data: lastLegData, error: lastLegError } = await supabase
    .from("trip_legs")
    .select("leg_order")
    .eq("trip_id", tripId)
    .order("leg_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastLegError) {
    console.error(lastLegError);
    return NextResponse.json({ message: "Gagal membaca urutan leg" }, { status: 500 });
  }

  const lastLegRow = (lastLegData as LegOrderRow | null) || null;

  const nextOrder = (lastLegRow?.leg_order ?? 0) + 1;

  const startDateTime = combineDateTime(parsed.data.startDate, parsed.data.startTime) ?? new Date().toISOString();

  const insertData = {
    trip_id: tripId,
    leg_order: nextOrder,
    leg_type: "custom" as const,
    origin: parsed.data.origin.trim(),
    destination: parsed.data.destination?.trim() || null,
    start_datetime: startDateTime,
    end_datetime: null,
    notes: parsed.data.notes?.trim() || null
  };

  const { data: legRow, error: insertError } = await supabase
    .from("trip_legs")
    .insert(insertData)
    .select("id, leg_order")
    .single();

  if (insertError || !legRow) {
    console.error(insertError);
    return NextResponse.json({ message: "Gagal membuat leg" }, { status: 500 });
  }

  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Leg ditambahkan", data: { legId: legRow.id, order: legRow.leg_order } }, { status: 201 });
}
