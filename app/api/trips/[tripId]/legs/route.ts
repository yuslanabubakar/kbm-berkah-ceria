import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { trips, tripLegs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "edge";

const timeRegex = /^\d{2}:\d{2}$/;

const createLegSchema = z.object({
  origin: z.string().min(1, "Asal leg wajib diisi"),
  destination: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  startTime: z
    .string()
    .regex(timeRegex, "Format waktu harus HH:MM")
    .optional()
    .nullable(),
  notes: z.string().max(500).optional().nullable(),
});

function combineDateTime(date?: string | null, time?: string | null) {
  if (!date) return null;
  const safeTime = time && timeRegex.test(time) ? time : "00:00";
  const [hour, minute] = safeTime.split(":");
  return new Date(`${date}T${hour}:${minute}:00`).toISOString();
}

export async function POST(
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

  const payload = await request.json().catch(() => null);
  const parsed = createLegSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data leg belum valid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const db = getDb();
  const trip = await db.select().from(trips).where(eq(trips.id, tripId)).get();
  if (!trip) {
    return NextResponse.json(
      { message: "Trip tidak ditemukan" },
      { status: 404 },
    );
  }

  const lastLeg = await db
    .select()
    .from(tripLegs)
    .where(eq(tripLegs.tripId, tripId))
    .orderBy(desc(tripLegs.legOrder))
    .get();

  const nextOrder = (lastLeg?.legOrder ?? 0) + 1;
  const startDateTime =
    combineDateTime(parsed.data.startDate, parsed.data.startTime) ??
    new Date().toISOString();
  const legId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(tripLegs).values({
    id: legId,
    tripId,
    legOrder: nextOrder,
    legType: "custom",
    origin: parsed.data.origin.trim(),
    destination: parsed.data.destination?.trim() || null,
    startDatetime: startDateTime,
    endDatetime: null,
    notes: parsed.data.notes?.trim() || null,
    createdAt: now,
  });

  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json(
    { message: "Leg ditambahkan", data: { legId, order: nextOrder } },
    { status: 201 },
  );
}
