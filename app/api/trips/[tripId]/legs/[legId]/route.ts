import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { tripLegs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";

const timeRegex = /^\d{2}:\d{2}$/;

const updateLegSchema = z
  .object({
    origin: z.string().min(1, "Asal wajib diisi").optional(),
    destination: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    startTime: z
      .string()
      .regex(timeRegex, "Format waktu HH:MM")
      .optional()
      .nullable(),
    notes: z.string().max(500).optional().nullable(),
  })
  .refine(
    (values) => Object.values(values).some((value) => value !== undefined),
    { message: "Tidak ada perubahan yang dikirim" },
  );

function combineDateTime(date?: string | null, time?: string | null) {
  if (!date) return null;
  const safeTime = time && timeRegex.test(time) ? time : "00:00";
  const [hour, minute] = safeTime.split(":");
  return new Date(`${date}T${hour}:${minute}:00`).toISOString();
}

export async function PATCH(
  request: Request,
  { params }: { params: { tripId: string; legId: string } },
) {
  const { tripId, legId } = params;
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateLegSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message ?? "Data leg tidak valid" },
      { status: 400 },
    );
  }

  const db = getDb();
  const leg = await db
    .select()
    .from(tripLegs)
    .where(and(eq(tripLegs.id, legId), eq(tripLegs.tripId, tripId)))
    .get();

  if (!leg) {
    return NextResponse.json(
      { message: "Leg tidak ditemukan" },
      { status: 404 },
    );
  }

  const updatePayload: Record<string, any> = {};
  if (parsed.data.origin !== undefined)
    updatePayload.origin = parsed.data.origin.trim();
  if (parsed.data.destination !== undefined)
    updatePayload.destination = parsed.data.destination?.trim() || null;
  if (parsed.data.notes !== undefined)
    updatePayload.notes = parsed.data.notes?.trim() || null;
  if (parsed.data.startDate !== undefined) {
    updatePayload.startDatetime = combineDateTime(
      parsed.data.startDate,
      parsed.data.startTime,
    );
  }

  await db.update(tripLegs).set(updatePayload).where(eq(tripLegs.id, legId));

  revalidatePath(`/perjalanan/${tripId}`);
  return NextResponse.json({ message: "Leg diperbarui" });
}
