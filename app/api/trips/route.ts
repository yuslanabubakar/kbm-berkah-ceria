import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";

const participantSchema = z.object({
  name: z.string().min(1, "Nama peserta wajib diisi"),
  isDriver: z.boolean().optional().default(false)
});

const timeSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/)
});

const createTripSchema = z.object({
  name: z.string().min(3, "Nama perjalanan terlalu pendek"),
  originCity: z.string().nullable().optional(),
  destinationCity: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  vehicleLabel: z.string().nullable().optional(),
  vehiclePlate: z.string().nullable().optional(),
  participants: z.array(participantSchema).min(1, "Minimal satu peserta"),
  defaultTimes: timeSchema.optional()
});

function combineDateTime(dateString?: string | null, timeString?: string) {
  if (!dateString) {
    return null;
  }
  if (!timeString) {
    return new Date(dateString).toISOString();
  }
  const [hour, minute] = timeString.split(":");
  const iso = new Date(`${dateString}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00`).toISOString();
  return iso;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = createTripSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Data belum valid", issues: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  
  // Get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });
  }

  const {
    name,
    originCity,
    destinationCity,
    startDate,
    endDate,
    vehicleLabel,
    vehiclePlate,
    participants,
    defaultTimes
  } = parsed.data;

  const startDateTime = combineDateTime(startDate, defaultTimes?.start ?? "08:00");
  const endDateTime = combineDateTime(endDate, defaultTimes?.end ?? "17:00");

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({
      owner_id: user.id,
      name,
      origin_city: originCity ?? null,
      destination_city: destinationCity ?? null,
      start_date: startDate ?? null,
      end_date: endDate ?? null,
      status: "ongoing"
    })
    .select("id")
    .single();

  if (tripError || !trip) {
    console.error(tripError);
    return NextResponse.json({ message: "Gagal membuat perjalanan" }, { status: 500 });
  }

  const tripId = trip.id as string;

  const { data: leg, error: legError } = await supabase
    .from("trip_legs")
    .insert({
      trip_id: tripId,
      leg_order: 1,
      leg_type: "custom",
      start_datetime: startDateTime ?? new Date().toISOString(),
      end_datetime: endDateTime,
      origin: originCity ?? destinationCity ?? "Start",
      destination: destinationCity ?? originCity ?? "Finish"
    })
    .select("id")
    .single();

  if (legError || !leg) {
    console.error(legError);
    await supabase.from("trips").delete().eq("id", tripId);
    return NextResponse.json({ message: "Gagal membuat leg perjalanan" }, { status: 500 });
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("trip_vehicles")
    .insert({
      trip_id: tripId,
      label: vehicleLabel?.trim() || "Kendaraan utama",
      plate_number: vehiclePlate?.trim() || null
    })
    .select("id")
    .single();

  if (vehicleError || !vehicle) {
    console.error(vehicleError);
    await supabase.from("trips").delete().eq("id", tripId);
    return NextResponse.json({ message: "Gagal membuat kendaraan" }, { status: 500 });
  }

  const { error: linkError } = await supabase
    .from("leg_vehicle_links")
    .insert({
      trip_id: tripId,
      leg_id: leg.id,
      vehicle_id: vehicle.id,
      departure_at: startDateTime ?? new Date().toISOString()
    });

  if (linkError) {
    console.error(linkError);
    await supabase.from("trips").delete().eq("id", tripId);
    return NextResponse.json({ message: "Gagal menghubungkan kendaraan" }, { status: 500 });
  }

  const participantPayload = participants.map((participant) => ({
    trip_id: tripId,
    display_name: participant.name,
    role: participant.isDriver ? "driver" : "member"
  }));

  const { data: participantRows, error: participantError } = await supabase
    .from("participants")
    .insert(participantPayload)
    .select("id, display_name");

  if (participantError || !participantRows) {
    console.error(participantError);
    await supabase.from("trips").delete().eq("id", tripId);
    return NextResponse.json({ message: "Gagal membuat peserta" }, { status: 500 });
  }

  const assignmentPayload = participantRows.map((row, index) => {
    const isDriver = participants[index]?.isDriver;
    return {
      leg_id: leg.id,
      vehicle_id: vehicle.id,
      participant_id: row.id,
      role: isDriver ? "driver" : "passenger"
    };
  });

  const { error: assignmentError } = await supabase.from("vehicle_assignments").insert(assignmentPayload);

  if (assignmentError) {
    console.error(assignmentError);
    await supabase.from("trips").delete().eq("id", tripId);
    return NextResponse.json({ message: "Gagal mengatur supir" }, { status: 500 });
  }

  revalidatePath("/");

  return NextResponse.json({ message: "Perjalanan dibuat", data: { tripId } }, { status: 201 });
}
