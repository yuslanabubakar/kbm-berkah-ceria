import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { trips, participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

const createParticipantSchema = z.object({
  name: z.string().min(1, "Nama peserta wajib diisi"),
  isDriver: z.boolean().optional().default(false),
});

export async function POST(
  request: Request,
  { params }: { params: { tripId: string } },
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = createParticipantSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data peserta belum lengkap", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const db = getDb();
  const trip = await db
    .select()
    .from(trips)
    .where(eq(trips.id, params.tripId))
    .get();
  if (!trip) {
    return NextResponse.json(
      { message: "Perjalanan tidak ditemukan" },
      { status: 404 },
    );
  }

  const { name, isDriver } = parsed.data;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(participants).values({
    id,
    tripId: params.tripId,
    displayName: name.trim(),
    role: isDriver ? "driver" : "member",
    isDriver: Boolean(isDriver),
    joinedAt: now,
  });

  revalidatePath(`/perjalanan/${params.tripId}`);

  return NextResponse.json(
    {
      data: {
        id,
        name: name.trim(),
        role: isDriver ? "driver" : "member",
      },
    },
    { status: 201 },
  );
}
