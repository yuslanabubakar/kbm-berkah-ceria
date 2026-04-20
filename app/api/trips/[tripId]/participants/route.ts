import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "edge";

const createParticipantSchema = z.object({
  name: z.string().min(1, "Nama peserta wajib diisi"),
  isDriver: z.boolean().optional().default(false),
});

export async function POST(
  request: Request,
  { params }: { params: { tripId: string } },
) {
  const payload = await request.json().catch(() => null);
  const parsed = createParticipantSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data peserta belum lengkap", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServer();
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id")
    .eq("id", params.tripId)
    .single();

  if (tripError || !trip) {
    return NextResponse.json(
      { message: "Perjalanan tidak ditemukan" },
      { status: 404 },
    );
  }

  const { name, isDriver } = parsed.data;
  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .insert({
      trip_id: params.tripId,
      display_name: name.trim(),
      role: isDriver ? "driver" : "member",
    })
    .select("id, display_name, role")
    .single();

  if (participantError || !participant) {
    console.error(participantError);
    return NextResponse.json(
      { message: "Gagal menambahkan peserta" },
      { status: 500 },
    );
  }

  revalidatePath(`/perjalanan/${params.tripId}`);

  return NextResponse.json(
    {
      data: {
        id: participant.id,
        name: participant.display_name,
        role: participant.role,
      },
    },
    { status: 201 },
  );
}
