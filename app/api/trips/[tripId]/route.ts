import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(request: Request, { params }: { params: { tripId: string } }) {
  const { tripId } = params;
  if (!tripId) {
    return NextResponse.json({ message: "Perjalanan tidak ditemukan" }, { status: 404 });
  }

  try {
    const supabase = getSupabaseServer();
    
    const [tripResult, accountsResult] = await Promise.all([
      supabase
        .from("trips")
        .select("id, name, origin_city, destination_city, start_date, end_date")
        .eq("id", tripId)
        .single(),
      supabase
        .from("host_payment_accounts")
        .select("id, label, channel, provider, account_name, account_number, instructions, priority")
        .eq("trip_id", tripId)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
    ]);

    if (tripResult.error || !tripResult.data) {
      return NextResponse.json({ message: "Perjalanan tidak ditemukan" }, { status: 404 });
    }

    const hostAccounts = (accountsResult.data || []).map((row: any) => ({
      id: row.id,
      label: row.label,
      channel: row.channel,
      provider: row.provider,
      accountName: row.account_name,
      accountNumber: row.account_number,
      instructions: row.instructions ?? undefined,
      priority: row.priority ?? 0
    }));

    return NextResponse.json({
      trip: tripResult.data,
      hostAccounts
    });
  } catch (error) {
    console.error("GET trip error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

const updateTripSchema = z.object({
  name: z
    .string()
    .min(3, "Nama perjalanan terlalu pendek")
    .optional(),
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
    .optional()
});

function normalizeString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

export async function PATCH(request: Request, { params }: { params: { tripId: string } }) {
  const { tripId } = params;
  if (!tripId) {
    return NextResponse.json({ message: "Perjalanan tidak ditemukan" }, { status: 404 });
  }

  const rawPayload = await request.json().catch(() => null);

  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return NextResponse.json({ message: "Data belum valid" }, { status: 400 });
  }

  const payload = rawPayload as Record<string, unknown>;

  const sanitizedPayload: Record<string, unknown> = {
    ...payload,
    name: typeof payload.name === "string" ? payload.name.trim() : payload.name,
    originCity: normalizeString(payload.originCity),
    destinationCity: normalizeString(payload.destinationCity),
    startDate: normalizeDate(payload.startDate),
    endDate: normalizeDate(payload.endDate)
  };

  const parsed = updateTripSchema.safeParse(sanitizedPayload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Data belum valid", issues: parsed.error.flatten() }, { status: 400 });
  }

  const hasMutation = Object.values(parsed.data).some((value) => value !== undefined);

  if (!hasMutation) {
    return NextResponse.json({ message: "Tidak ada perubahan" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};

  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name;
  }
  if (parsed.data.originCity !== undefined) {
    updates.origin_city = parsed.data.originCity;
  }
  if (parsed.data.destinationCity !== undefined) {
    updates.destination_city = parsed.data.destinationCity;
  }
  if (parsed.data.startDate !== undefined) {
    updates.start_date = parsed.data.startDate;
  }
  if (parsed.data.endDate !== undefined) {
    updates.end_date = parsed.data.endDate;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ message: "Tidak ada perubahan" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("trips")
    .update(updates)
    .eq("id", tripId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal memperbarui perjalanan" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ message: "Perjalanan tidak ditemukan" }, { status: 404 });
  }

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Perjalanan diperbarui" });
}

export async function DELETE(_request: Request, { params }: { params: { tripId: string } }) {
  const { tripId } = params;

  if (!tripId) {
    return NextResponse.json({ message: "Trip tidak ditemukan" }, { status: 404 });
  }

  const supabase = getSupabaseServer();

  const { data: tripRow, error: tripFetchError } = await supabase
    .from("trips")
    .select("id, name")
    .eq("id", tripId)
    .maybeSingle();

  if (tripFetchError) {
    console.error(tripFetchError);
    return NextResponse.json({ message: "Gagal mengecek perjalanan" }, { status: 500 });
  }

  if (!tripRow) {
    return NextResponse.json({ message: "Perjalanan sudah hilang" }, { status: 404 });
  }

  const { error: deleteError } = await supabase.from("trips").delete().eq("id", tripId);

  if (deleteError) {
    console.error(deleteError);
    return NextResponse.json({ message: "Gagal menghapus perjalanan" }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: `Perjalanan ${tripRow.name} dihapus` });
}
