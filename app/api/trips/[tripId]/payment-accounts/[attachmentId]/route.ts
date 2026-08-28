import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { trips, tripPaymentAccounts, userPaymentAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { TripPaymentAccountAttachment } from "@/types/expense";

export const runtime = "edge";

const updateSchema = z
  .object({
    customLabel: z.string().max(80).optional().or(z.literal("")),
    customInstructions: z.string().max(280).optional().or(z.literal("")),
    customPriority: z.number().int().min(0).max(100).optional().nullable(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    {
      message: "Tidak ada perubahan",
      path: ["customLabel"],
    },
  );

function normalizeOptionalString(value?: string | null) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: { tripId: string; attachmentId: string } },
) {
  const { tripId, attachmentId } = params;

  if (!tripId || !attachmentId) {
    return NextResponse.json(
      { message: "Lampiran tidak ditemukan" },
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

  const trip = await db.select().from(trips).where(eq(trips.id, tripId)).get();
  if (!trip) {
    return NextResponse.json(
      { message: "Perjalanan tidak ditemukan" },
      { status: 404 },
    );
  }

  const existingAttachment = await db
    .select()
    .from(tripPaymentAccounts)
    .where(
      and(
        eq(tripPaymentAccounts.id, attachmentId),
        eq(tripPaymentAccounts.tripId, tripId),
      ),
    )
    .get();

  if (!existingAttachment) {
    return NextResponse.json(
      { message: "Lampiran tidak ditemukan" },
      { status: 404 },
    );
  }

  const now = new Date().toISOString();
  const updates: {
    customLabel?: string | null;
    customInstructions?: string | null;
    customPriority?: number | null;
    updatedAt: string;
  } = {
    updatedAt: now,
  };

  if (parsed.data.customLabel !== undefined) {
    updates.customLabel = normalizeOptionalString(parsed.data.customLabel);
  }
  if (parsed.data.customInstructions !== undefined) {
    updates.customInstructions = normalizeOptionalString(
      parsed.data.customInstructions,
    );
  }
  if (parsed.data.customPriority !== undefined) {
    updates.customPriority = parsed.data.customPriority ?? null;
  }

  await db
    .update(tripPaymentAccounts)
    .set(updates)
    .where(
      and(
        eq(tripPaymentAccounts.id, attachmentId),
        eq(tripPaymentAccounts.tripId, tripId),
      ),
    );

  const updatedRow = await db
    .select()
    .from(tripPaymentAccounts)
    .where(eq(tripPaymentAccounts.id, attachmentId))
    .get();

  const baseAccount = await db
    .select()
    .from(userPaymentAccounts)
    .where(eq(userPaymentAccounts.id, updatedRow!.paymentAccountId))
    .get();

  if (!baseAccount) {
    return NextResponse.json(
      { message: "Metode pembayaran tidak ditemukan" },
      { status: 404 },
    );
  }

  const finalPriority = updatedRow!.customPriority ?? baseAccount.priority ?? 0;
  const finalInstructions =
    updatedRow!.customInstructions ?? baseAccount.instructions ?? undefined;

  const attachment: TripPaymentAccountAttachment = {
    id: updatedRow!.id,
    paymentAccountId: baseAccount.id,
    label: updatedRow!.customLabel ?? baseAccount.label,
    channel: baseAccount.channel as "bank" | "ewallet" | "cash" | "other",
    provider: baseAccount.provider ?? null,
    accountName: baseAccount.accountName,
    accountNumber: baseAccount.accountNumber,
    instructions: finalInstructions,
    priority: finalPriority,
    customLabel: updatedRow!.customLabel ?? undefined,
    customInstructions: updatedRow!.customInstructions ?? undefined,
    customPriority: updatedRow!.customPriority ?? undefined,
    attachedAt: updatedRow!.createdAt,
    updatedAt: updatedRow!.updatedAt,
  };

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({
    message: "Lampiran diperbarui",
    data: attachment,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { tripId: string; attachmentId: string } },
) {
  const { tripId, attachmentId } = params;

  if (!tripId || !attachmentId) {
    return NextResponse.json(
      { message: "Lampiran tidak ditemukan" },
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

  const trip = await db.select().from(trips).where(eq(trips.id, tripId)).get();
  if (!trip) {
    return NextResponse.json(
      { message: "Perjalanan tidak ditemukan" },
      { status: 404 },
    );
  }

  await db
    .delete(tripPaymentAccounts)
    .where(
      and(
        eq(tripPaymentAccounts.id, attachmentId),
        eq(tripPaymentAccounts.tripId, tripId),
      ),
    );

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Metode pembayaran dilepas" });
}
