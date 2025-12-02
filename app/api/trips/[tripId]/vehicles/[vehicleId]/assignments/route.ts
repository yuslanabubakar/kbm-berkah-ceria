import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseClient";

const assignmentEntrySchema = z.object({
  participantId: z.string().min(1, "Peserta wajib diisi"),
  role: z.enum(["driver", "passenger"]).optional(),
  allocationOverride: z.number().min(0).optional().nullable()
});

const assignmentPayloadSchema = z.object({
  legId: z.string().min(1, "Leg wajib diisi"),
  assignments: z.array(assignmentEntrySchema).min(1, "Minimal satu peserta")
});

const removeAssignmentSchema = z.object({
  legId: z.string().min(1, "Leg wajib diisi"),
  participantIds: z.array(z.string().min(1)).min(1, "Minimal satu peserta")
});

type VehicleLinkRow = { id: string } | null;

async function ensureVehicleLink(tripId: string, vehicleId: string, legId: string): Promise<VehicleLinkRow> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("leg_vehicle_links")
    .select("id")
    .eq("trip_id", tripId)
    .eq("vehicle_id", vehicleId)
    .eq("leg_id", legId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as VehicleLinkRow;
}

async function validateParticipants(tripId: string, participantIds: string[]) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("participants")
    .select("id")
    .eq("trip_id", tripId)
    .in("id", participantIds);

  if (error) {
    throw error;
  }

  const foundIds = new Set((data ?? []).map((row) => row.id));
  return participantIds.every((id) => foundIds.has(id));
}

export async function POST(request: Request, { params }: { params: { tripId: string; vehicleId: string } }) {
  const { tripId, vehicleId } = params;

  if (!tripId || !vehicleId) {
    return NextResponse.json({ message: "Parameter tidak lengkap" }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = assignmentPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Input belum lengkap", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const linkRow = await ensureVehicleLink(tripId, vehicleId, parsed.data.legId);
    if (!linkRow) {
      return NextResponse.json({ message: "Kendaraan tidak terhubung dengan leg tersebut" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal mengecek kendaraan" }, { status: 500 });
  }

  try {
    const isValidParticipants = await validateParticipants(
      tripId,
      parsed.data.assignments.map((item) => item.participantId)
    );
    if (!isValidParticipants) {
      return NextResponse.json({ message: "Ada peserta yang tidak terdaftar pada trip" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal mengecek peserta" }, { status: 500 });
  }

  const supabase = getSupabaseServer();
  const participantIds = parsed.data.assignments.map((item) => item.participantId);

  const { error: deleteError } = await supabase
    .from("vehicle_assignments")
    .delete()
    .eq("leg_id", parsed.data.legId)
    .in("participant_id", participantIds);

  if (deleteError) {
    console.error(deleteError);
    return NextResponse.json({ message: "Gagal memindahkan peserta" }, { status: 500 });
  }

  const insertRows = parsed.data.assignments.map((assignment) => ({
    leg_id: parsed.data.legId,
    vehicle_id: vehicleId,
    participant_id: assignment.participantId,
    role: assignment.role ?? "passenger",
    allocation_override: assignment.allocationOverride ?? null
  }));

  const { error: insertError } = await supabase.from("vehicle_assignments").insert(insertRows);

  if (insertError) {
    console.error(insertError);
    return NextResponse.json({ message: "Gagal menyimpan penugasan" }, { status: 500 });
  }

  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Penugasan diperbarui" });
}

export async function DELETE(request: Request, { params }: { params: { tripId: string; vehicleId: string } }) {
  const { tripId, vehicleId } = params;

  if (!tripId || !vehicleId) {
    return NextResponse.json({ message: "Parameter tidak lengkap" }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = removeAssignmentSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Data penghapusan tidak valid", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const linkRow = await ensureVehicleLink(tripId, vehicleId, parsed.data.legId);
    if (!linkRow) {
      return NextResponse.json({ message: "Kendaraan tidak terhubung dengan leg tersebut" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal mengecek kendaraan" }, { status: 500 });
  }

  const supabase = getSupabaseServer();

  const { error: deleteError } = await supabase
    .from("vehicle_assignments")
    .delete()
    .eq("leg_id", parsed.data.legId)
    .eq("vehicle_id", vehicleId)
    .in("participant_id", parsed.data.participantIds);

  if (deleteError) {
    console.error(deleteError);
    return NextResponse.json({ message: "Gagal menghapus penugasan" }, { status: 500 });
  }

  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Penugasan dihapus" });
}
