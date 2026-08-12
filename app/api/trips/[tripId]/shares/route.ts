import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { trips, tripShares } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "edge";

const shareSchema = z.object({
  email: z.string().email("Email tidak valid"),
});

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
  const parsed = shareSchema.safeParse(payload);
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
      { message: "Trip tidak ditemukan" },
      { status: 404 },
    );
  }

  if (trip.ownerId !== currentUser.id) {
    return NextResponse.json(
      { message: "Hanya pemilik trip yang bisa membagikan" },
      { status: 403 },
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(tripShares).values({
    id,
    tripId,
    sharedWithEmail: parsed.data.email.toLowerCase(),
    canEdit: false,
    createdAt: now,
  });

  return NextResponse.json(
    {
      message: "Trip berhasil dibagikan",
      data: { id, shared_with_email: parsed.data.email, created_at: now },
    },
    { status: 201 },
  );
}

export async function GET(
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

  const db = getDb();
  const sharesRows = await db
    .select()
    .from(tripShares)
    .where(eq(tripShares.tripId, tripId))
    .orderBy(desc(tripShares.createdAt))
    .all();

  const shares = sharesRows.map((s) => ({
    id: s.id,
    shared_with_email: s.sharedWithEmail,
    can_edit: s.canEdit,
    created_at: s.createdAt,
  }));

  return NextResponse.json({ shares });
}
