import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { participants, expenses, balanceAdjustments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";

const updateParticipantSchema = z
  .object({
    name: z.string().min(1, "Nama peserta wajib diisi").optional(),
    isDriver: z.boolean().optional(),
  })
  .refine((values) => values.name != null || values.isDriver != null, {
    message: "Tidak ada perubahan yang dikirim",
  });

export async function PATCH(
  request: Request,
  { params }: { params: { tripId: string; participantId: string } },
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateParticipantSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.id, params.participantId),
        eq(participants.tripId, params.tripId),
      ),
    )
    .get();

  if (!existing) {
    return NextResponse.json(
      { message: "Peserta tidak ditemukan" },
      { status: 404 },
    );
  }

  const updatePayload: Record<string, any> = {};
  if (parsed.data.name != null)
    updatePayload.displayName = parsed.data.name.trim();
  if (parsed.data.isDriver != null) {
    updatePayload.role = parsed.data.isDriver ? "driver" : "member";
    updatePayload.isDriver = parsed.data.isDriver;
  }

  await db
    .update(participants)
    .set(updatePayload)
    .where(eq(participants.id, params.participantId));

  revalidatePath(`/perjalanan/${params.tripId}`);
  return NextResponse.json({ message: "Peserta diperbarui" });
}

export async function DELETE(
  request: Request,
  { params }: { params: { tripId: string; participantId: string } },
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
    );
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.id, params.participantId),
        eq(participants.tripId, params.tripId),
      ),
    )
    .get();

  if (!existing) {
    return NextResponse.json(
      { message: "Peserta tidak ditemukan" },
      { status: 404 },
    );
  }

  const allTripParticipants = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.tripId, params.tripId))
    .all();

  if (allTripParticipants.length <= 1) {
    return NextResponse.json(
      { message: "Minimal harus ada satu peserta dalam perjalanan" },
      { status: 400 },
    );
  }

  const paidExpenses = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(
      and(
        eq(expenses.tripId, params.tripId),
        eq(expenses.paidBy, params.participantId),
      ),
    )
    .all();

  if (paidExpenses.length > 0) {
    return NextResponse.json(
      {
        message: "Peserta tidak bisa dihapus karena sudah mencatat pengeluaran",
      },
      { status: 400 },
    );
  }

  const userAdjustments = await db
    .select({ id: balanceAdjustments.id })
    .from(balanceAdjustments)
    .where(
      and(
        eq(balanceAdjustments.tripId, params.tripId),
        eq(balanceAdjustments.participantId, params.participantId),
      ),
    )
    .all();

  if (userAdjustments.length > 0) {
    return NextResponse.json(
      { message: "Hapus penyesuaian saldo terkait sebelum menghapus peserta" },
      { status: 400 },
    );
  }

  await db
    .delete(participants)
    .where(eq(participants.id, params.participantId));

  revalidatePath(`/perjalanan/${params.tripId}`);
  return NextResponse.json({ message: "Peserta dihapus" });
}
