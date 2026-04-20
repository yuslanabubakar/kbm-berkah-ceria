import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "edge";

const actionSchema = z.object({
  action: z.enum(["apply", "void"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: { tripId: string; adjustmentId: string } },
) {
  const { tripId, adjustmentId } = params;

  if (!tripId || !adjustmentId) {
    return NextResponse.json(
      { message: "Parameter tidak lengkap" },
      { status: 400 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Aksi tidak valid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServer();
  const updateData: Record<string, unknown> = {};

  if (parsed.data.action === "apply") {
    updateData.status = "applied";
    updateData.applied_at = new Date().toISOString();
  } else {
    updateData.status = "void";
    updateData.applied_at = null;
  }

  const { data, error } = await supabase
    .from("balance_adjustments")
    .update(updateData)
    .eq("id", adjustmentId)
    .eq("trip_id", tripId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Gagal memperbarui penyesuaian" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { message: "Penyesuaian tidak ditemukan" },
      { status: 404 },
    );
  }

  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Penyesuaian diperbarui" });
}
