import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { tripShares } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";

export async function DELETE(
  request: Request,
  { params }: { params: { tripId: string; shareId: string } },
) {
  const { tripId, shareId } = params;
  if (!tripId || !shareId) {
    return NextResponse.json({ message: "Data tidak valid" }, { status: 404 });
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
    .delete(tripShares)
    .where(and(eq(tripShares.id, shareId), eq(tripShares.tripId, tripId)));

  return NextResponse.json({ message: "Sharing dihapus" });
}
