import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "edge";

const adjustmentSchema = z.object({
  participantId: z.string().min(1, "Peserta wajib diisi"),
  amountIdr: z
    .number()
    .refine((val) => val !== 0, { message: "Nominal tidak boleh nol" }),
  reason: z.string().max(500).optional().nullable(),
  applyNow: z.boolean().optional().default(false),
});

export async function POST(
  request: Request,
  { params }: { params: { tripId: string } },
) {
  const tripId = params.tripId;

  if (!tripId) {
    return NextResponse.json(
      { message: "Trip tidak ditemukan" },
      { status: 404 },
    );
  }

  const payload = await request.json().catch(() => null);

  const parsed = adjustmentSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data kurang lengkap", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServer();
  const now = new Date().toISOString();
  const shouldApplyNow = parsed.data.applyNow ?? false;

  const insertPayload: Record<string, unknown> = {
    trip_id: tripId,
    participant_id: parsed.data.participantId,
    amount_idr: parsed.data.amountIdr,
    reason: parsed.data.reason ?? null,
  };

  if (shouldApplyNow) {
    insertPayload.status = "applied";
    insertPayload.applied_at = now;
  }

  const { data, error } = await supabase
    .from("balance_adjustments")
    .insert(insertPayload)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Gagal menyimpan penyesuaian" },
      { status: 500 },
    );
  }

  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json(
    { message: "Penyesuaian tersimpan", data },
    { status: 201 },
  );
}
