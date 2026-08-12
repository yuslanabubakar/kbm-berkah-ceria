import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { vehicleAssignments, legVehicleLinks } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export const runtime = "edge";

const assignmentEntrySchema = z.object({
  participantId: z.string().min(1, "Peserta wajib diisi"),
  role: z.enum(["driver", "passenger"]).optional(),
  allocationOverride: z.number().min(0).optional().nullable(),
});

const assignmentPayloadSchema = z.object({
  legId: z.string().min(1, "Leg wajib diisi"),
  assignments: z.array(assignmentEntrySchema).min(1, "Minimal satu peserta"),
});

const removeAssignmentSchema = z.object({
  legId: z.string().min(1, "Leg wajib diisi"),
  participantIds: z.array(z.string().min(1)).min(1, "Minimal satu peserta"),
});

export async function POST(
  request: Request,
  { params }: { params: { tripId: string; vehicleId: string } },
) {
  const { tripId, vehicleId } = params;
  if (!tripId || !vehicleId) {
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
  const parsed = assignmentPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Input belum lengkap", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const db = getDb();
  const linkRow = await db
    .select()
    .from(legVehicleLinks)
    .where(
      and(
        eq(legVehicleLinks.tripId, tripId),
        eq(legVehicleLinks.vehicleId, vehicleId),
        eq(legVehicleLinks.legId, parsed.data.legId),
      ),
    )
    .get();

  if (!linkRow) {
    return NextResponse.json(
      { message: "Kendaraan tidak terhubung dengan leg tersebut" },
      { status: 400 },
    );
  }

  const participantIds = parsed.data.assignments.map((a) => a.participantId);
  const now = new Date().toISOString();

  // Delete existing assignments for these participants on this leg
  for (const pid of participantIds) {
    await db
      .delete(vehicleAssignments)
      .where(
        and(
          eq(vehicleAssignments.legId, parsed.data.legId),
          eq(vehicleAssignments.participantId, pid),
        ),
      );
  }

  // Insert new assignments
  for (const assignment of parsed.data.assignments) {
    await db.insert(vehicleAssignments).values({
      id: crypto.randomUUID(),
      legId: parsed.data.legId,
      vehicleId,
      participantId: assignment.participantId,
      role: assignment.role ?? "passenger",
      allocationOverride: assignment.allocationOverride ?? null,
      joinedAt: now,
    });
  }

  revalidatePath(`/perjalanan/${tripId}`);
  return NextResponse.json({ message: "Penugasan diperbarui" });
}

export async function DELETE(
  request: Request,
  { params }: { params: { tripId: string; vehicleId: string } },
) {
  const { tripId, vehicleId } = params;
  if (!tripId || !vehicleId) {
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
  const parsed = removeAssignmentSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Data penghapusan tidak valid",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const db = getDb();
  for (const pid of parsed.data.participantIds) {
    await db
      .delete(vehicleAssignments)
      .where(
        and(
          eq(vehicleAssignments.legId, parsed.data.legId),
          eq(vehicleAssignments.vehicleId, vehicleId),
          eq(vehicleAssignments.participantId, pid),
        ),
      );
  }

  revalidatePath(`/perjalanan/${tripId}`);
  return NextResponse.json({ message: "Penugasan dihapus" });
}
