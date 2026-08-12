import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { balanceAdjustments } from "@/db/schema";

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

  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
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

  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const shouldApplyNow = parsed.data.applyNow ?? false;

  await db.insert(balanceAdjustments).values({
    id,
    tripId,
    participantId: parsed.data.participantId,
    amountIdr: parsed.data.amountIdr,
    reason: parsed.data.reason ?? null,
    status: shouldApplyNow ? "applied" : "draft",
    createdBy: currentUser.id,
    createdAt: now,
    appliedBy: shouldApplyNow ? currentUser.id : null,
    appliedAt: shouldApplyNow ? now : null,
  });

  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json(
    { message: "Penyesuaian tersimpan", data: { id } },
    { status: 201 },
  );
}
