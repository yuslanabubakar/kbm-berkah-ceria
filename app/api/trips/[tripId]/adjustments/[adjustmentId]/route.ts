import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { balanceAdjustments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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

  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
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

  const db = getDb();
  const existing = await db
    .select()
    .from(balanceAdjustments)
    .where(
      and(
        eq(balanceAdjustments.id, adjustmentId),
        eq(balanceAdjustments.tripId, tripId),
      ),
    )
    .get();

  if (!existing) {
    return NextResponse.json(
      { message: "Penyesuaian tidak ditemukan" },
      { status: 404 },
    );
  }

  const now = new Date().toISOString();
  const isApply = parsed.data.action === "apply";

  await db
    .update(balanceAdjustments)
    .set({
      status: isApply ? "applied" : "void",
      appliedBy: isApply ? currentUser.id : null,
      appliedAt: isApply ? now : null,
    })
    .where(eq(balanceAdjustments.id, adjustmentId));

  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Penyesuaian diperbarui" });
}
