import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseClient";

const updateParticipantSchema = z
  .object({
    name: z.string().min(1, "Nama peserta wajib diisi").optional(),
    isDriver: z.boolean().optional()
  })
  .refine((values) => values.name != null || values.isDriver != null, {
    message: "Tidak ada perubahan yang dikirim"
  });

export async function PATCH(request: Request, { params }: { params: { tripId: string; participantId: string } }) {
  const payload = await request.json().catch(() => null);
  const parsed = updateParticipantSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message ?? "Data tidak valid" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServer();
  const { data: participant, error: lookupError } = await supabase
    .from("participants")
    .select("trip_id")
    .eq("id", params.participantId)
    .single();

  if (lookupError || !participant || participant.trip_id !== params.tripId) {
    return NextResponse.json({ message: "Peserta tidak ditemukan" }, { status: 404 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.name != null) {
    updatePayload.display_name = parsed.data.name.trim();
  }
  if (parsed.data.isDriver != null) {
    updatePayload.role = parsed.data.isDriver ? "driver" : "member";
  }

  if (!Object.keys(updatePayload).length) {
    return NextResponse.json({ message: "Tidak ada perubahan" }, { status: 400 });
  }

  const { error: updateError } = await supabase.from("participants").update(updatePayload).eq("id", params.participantId);

  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ message: "Gagal memperbarui peserta" }, { status: 500 });
  }

  revalidatePath(`/perjalanan/${params.tripId}`);
  return NextResponse.json({ message: "Peserta diperbarui" });
}

export async function DELETE(_request: Request, { params }: { params: { tripId: string; participantId: string } }) {
  const supabase = getSupabaseServer();
  const { data: participant, error: lookupError } = await supabase
    .from("participants")
    .select("trip_id")
    .eq("id", params.participantId)
    .single();

  if (lookupError || !participant || participant.trip_id !== params.tripId) {
    return NextResponse.json({ message: "Peserta tidak ditemukan" }, { status: 404 });
  }

  const { count: participantCount } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", params.tripId);

  if (participantCount != null && participantCount <= 1) {
    return NextResponse.json({ message: "Minimal harus ada satu peserta dalam perjalanan" }, { status: 400 });
  }

  const { count: expenseCount } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", params.tripId)
    .eq("paid_by", params.participantId);

  if (expenseCount && expenseCount > 0) {
    return NextResponse.json({ message: "Peserta tidak bisa dihapus karena sudah mencatat pengeluaran" }, { status: 400 });
  }

  const { count: adjustmentCount } = await supabase
    .from("balance_adjustments")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", params.tripId)
    .eq("participant_id", params.participantId);

  if (adjustmentCount && adjustmentCount > 0) {
    return NextResponse.json({ message: "Hapus penyesuaian saldo terkait sebelum menghapus peserta" }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("participants")
    .delete()
    .eq("id", params.participantId)
    .eq("trip_id", params.tripId);

  if (deleteError) {
    console.error(deleteError);
    return NextResponse.json({ message: "Gagal menghapus peserta" }, { status: 500 });
  }

  revalidatePath(`/perjalanan/${params.tripId}`);
  return NextResponse.json({ message: "Peserta dihapus" });
}
