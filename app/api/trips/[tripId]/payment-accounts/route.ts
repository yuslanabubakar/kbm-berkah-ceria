import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { trips, tripPaymentAccounts, userPaymentAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { TripPaymentAccountAttachment } from "@/types/expense";

export const runtime = "edge";

const attachSchema = z.object({
  paymentAccountId: z.string().min(1, "Pilih metode pembayaran"),
  customLabel: z.string().max(80).optional().or(z.literal("")),
  customInstructions: z.string().max(280).optional().or(z.literal("")),
  customPriority: z.number().int().min(0).max(100).optional().nullable(),
});

function normalizeOptionalString(value?: string | null) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function POST(
  request: Request,
  { params }: { params: { tripId: string } },
) {
  const { tripId } = params;
  if (!tripId) {
    return NextResponse.json(
      { message: "Perjalanan tidak ditemukan" },
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
  const parsed = attachSchema.safeParse(payload ?? {});

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

  const accountRow = await db
    .select()
    .from(userPaymentAccounts)
    .where(
      and(
        eq(userPaymentAccounts.id, parsed.data.paymentAccountId),
        eq(userPaymentAccounts.userId, currentUser.id),
      ),
    )
    .get();

  if (!accountRow) {
    return NextResponse.json(
      { message: "Metode pembayaran tidak ditemukan" },
      { status: 404 },
    );
  }

  const existing = await db
    .select()
    .from(tripPaymentAccounts)
    .where(
      and(
        eq(tripPaymentAccounts.tripId, tripId),
        eq(tripPaymentAccounts.paymentAccountId, parsed.data.paymentAccountId),
      ),
    )
    .get();

  if (existing) {
    return NextResponse.json(
      { message: "Metode pembayaran sudah dilampirkan" },
      { status: 409 },
    );
  }

  const attachmentId = crypto.randomUUID();
  const now = new Date().toISOString();
  const customLabel = normalizeOptionalString(parsed.data.customLabel);
  const customInstructions = normalizeOptionalString(
    parsed.data.customInstructions,
  );
  const customPriority = parsed.data.customPriority ?? null;

  await db.insert(tripPaymentAccounts).values({
    id: attachmentId,
    tripId,
    paymentAccountId: parsed.data.paymentAccountId,
    customLabel,
    customInstructions,
    customPriority,
    createdAt: now,
    updatedAt: now,
  });

  const finalPriority = customPriority ?? accountRow.priority ?? 0;
  const finalInstructions =
    customInstructions ?? accountRow.instructions ?? undefined;

  const attachment: TripPaymentAccountAttachment = {
    id: attachmentId,
    paymentAccountId: accountRow.id,
    label: customLabel ?? accountRow.label,
    channel: accountRow.channel as "bank" | "ewallet" | "cash" | "other",
    provider: accountRow.provider ?? null,
    accountName: accountRow.accountName,
    accountNumber: accountRow.accountNumber,
    instructions: finalInstructions,
    priority: finalPriority,
    customLabel: customLabel ?? undefined,
    customInstructions: customInstructions ?? undefined,
    customPriority: customPriority ?? undefined,
    attachedAt: now,
    updatedAt: now,
  };

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json(
    { message: "Metode pembayaran dilampirkan", data: attachment },
    { status: 201 },
  );
}
