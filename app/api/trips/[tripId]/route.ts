import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { trips, tripPaymentAccounts, userPaymentAccounts } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export const runtime = "edge";

export async function GET(
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

  try {
    const db = getDb();
    const trip = await db
      .select()
      .from(trips)
      .where(eq(trips.id, tripId))
      .get();

    if (!trip) {
      return NextResponse.json(
        { message: "Perjalanan tidak ditemukan" },
        { status: 404 },
      );
    }

    const tAccounts = await db
      .select()
      .from(tripPaymentAccounts)
      .where(eq(tripPaymentAccounts.tripId, tripId))
      .all();

    let hostAccounts: any[] = [];
    if (tAccounts.length) {
      const uAccs = await db
        .select()
        .from(userPaymentAccounts)
        .where(
          inArray(
            userPaymentAccounts.id,
            tAccounts.map((t) => t.paymentAccountId),
          ),
        )
        .all();
      const uAccMap = new Map(uAccs.map((a) => [a.id, a]));

      hostAccounts = tAccounts
        .map((tAcc) => {
          const base = uAccMap.get(tAcc.paymentAccountId);
          if (!base) return null;
          const priority = tAcc.customPriority ?? base.priority;
          return {
            id: tAcc.id,
            paymentAccountId: base.id,
            label: tAcc.customLabel ?? base.label,
            channel: base.channel,
            provider: base.provider,
            accountName: base.accountName,
            accountNumber: base.accountNumber,
            instructions:
              tAcc.customInstructions ?? base.instructions ?? undefined,
            priority,
            customLabel: tAcc.customLabel ?? undefined,
            customInstructions: tAcc.customInstructions ?? undefined,
            customPriority: tAcc.customPriority ?? undefined,
            attachedAt: tAcc.createdAt,
            updatedAt: tAcc.updatedAt,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .sort((a, b) => b.priority - a.priority);
    }

    return NextResponse.json({
      trip: {
        id: trip.id,
        name: trip.name,
        origin_city: trip.originCity,
        destination_city: trip.destinationCity,
        start_date: trip.startDate,
        end_date: trip.endDate,
      },
      hostAccounts,
    });
  } catch (error) {
    console.error("GET trip error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

const updateTripSchema = z.object({
  name: z.string().min(3, "Nama perjalanan terlalu pendek").optional(),
  originCity: z
    .string()
    .min(1, "Nama kota asal tidak valid")
    .nullable()
    .optional(),
  destinationCity: z
    .string()
    .min(1, "Nama kota tujuan tidak valid")
    .nullable()
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

function normalizeString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function PATCH(
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

  const rawPayload = await request.json().catch(() => null);
  if (
    !rawPayload ||
    typeof rawPayload !== "object" ||
    Array.isArray(rawPayload)
  ) {
    return NextResponse.json({ message: "Data belum valid" }, { status: 400 });
  }

  const payload = rawPayload as Record<string, unknown>;
  const sanitizedPayload: Record<string, unknown> = {
    ...payload,
    name: typeof payload.name === "string" ? payload.name.trim() : payload.name,
    originCity: normalizeString(payload.originCity),
    destinationCity: normalizeString(payload.destinationCity),
    startDate: normalizeDate(payload.startDate),
    endDate: normalizeDate(payload.endDate),
  };

  const parsed = updateTripSchema.safeParse(sanitizedPayload);
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

  const updateFields: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };
  if (parsed.data.name !== undefined) updateFields.name = parsed.data.name;
  if (parsed.data.originCity !== undefined)
    updateFields.originCity = parsed.data.originCity;
  if (parsed.data.destinationCity !== undefined)
    updateFields.destinationCity = parsed.data.destinationCity;
  if (parsed.data.startDate !== undefined)
    updateFields.startDate = parsed.data.startDate;
  if (parsed.data.endDate !== undefined)
    updateFields.endDate = parsed.data.endDate;

  await db.update(trips).set(updateFields).where(eq(trips.id, tripId));

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Perjalanan diperbarui" });
}

export async function DELETE(
  request: Request,
  { params }: { params: { tripId: string } },
) {
  const { tripId } = params;
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

  const db = getDb();
  const trip = await db.select().from(trips).where(eq(trips.id, tripId)).get();
  if (!trip) {
    return NextResponse.json(
      { message: "Perjalanan sudah hilang" },
      { status: 404 },
    );
  }

  await db.delete(trips).where(eq(trips.id, tripId));

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: `Perjalanan ${trip.name} dihapus` });
}
