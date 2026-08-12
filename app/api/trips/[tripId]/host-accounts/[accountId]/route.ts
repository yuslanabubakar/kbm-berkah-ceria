import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { tripPaymentAccounts, userPaymentAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";

const channelEnum = z.enum(["bank", "ewallet", "cash", "other"]);

const updateSchema = z.object({
  label: z.string().min(3).optional(),
  channel: channelEnum.optional(),
  provider: z.string().min(2).max(80).optional().or(z.literal("")),
  accountName: z.string().min(3).optional(),
  accountNumber: z.string().min(3).optional(),
  instructions: z.string().max(280).optional().or(z.literal("")),
  priority: z.number().int().min(0).max(100).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { tripId: string; accountId: string } },
) {
  const { tripId, accountId } = params;
  if (!tripId || !accountId) {
    return NextResponse.json(
      { message: "Akun host tidak ditemukan" },
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
  const parsed = updateSchema.safeParse(payload ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data belum valid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const db = getDb();
  const attachment = await db
    .select()
    .from(tripPaymentAccounts)
    .where(
      and(
        eq(tripPaymentAccounts.id, accountId),
        eq(tripPaymentAccounts.tripId, tripId),
      ),
    )
    .get();

  if (!attachment) {
    return NextResponse.json(
      { message: "Akun host tidak ditemukan" },
      { status: 404 },
    );
  }

  // Update custom fields on attachment or underlying user account
  const now = new Date().toISOString();
  await db
    .update(tripPaymentAccounts)
    .set({
      customLabel: parsed.data.label?.trim(),
      customInstructions: parsed.data.instructions?.trim() || null,
      customPriority: parsed.data.priority,
      updatedAt: now,
    })
    .where(eq(tripPaymentAccounts.id, accountId));

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Akun host diperbarui" });
}

export async function DELETE(
  request: Request,
  { params }: { params: { tripId: string; accountId: string } },
) {
  const { tripId, accountId } = params;
  if (!tripId || !accountId) {
    return NextResponse.json(
      { message: "Akun host tidak ditemukan" },
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

  const db = getDb();
  await db
    .delete(tripPaymentAccounts)
    .where(
      and(
        eq(tripPaymentAccounts.id, accountId),
        eq(tripPaymentAccounts.tripId, tripId),
      ),
    );

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Akun host dihapus" });
}
