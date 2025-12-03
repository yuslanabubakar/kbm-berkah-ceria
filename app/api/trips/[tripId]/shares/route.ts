import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";

const shareSchema = z.object({
  email: z.string().email("Email tidak valid")
});

export async function POST(
  request: Request,
  { params }: { params: { tripId: string } }
) {
  const { tripId } = params;

  if (!tripId) {
    return NextResponse.json({ message: "Trip tidak ditemukan" }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = shareSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data belum valid", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServer();

  // Get current user
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });
  }

  // Check if trip exists and user is owner
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, owner_id")
    .eq("id", tripId)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ message: "Trip tidak ditemukan" }, { status: 404 });
  }

  if (trip.owner_id !== user.id) {
    return NextResponse.json(
      { message: "Hanya pemilik trip yang bisa membagikan" },
      { status: 403 }
    );
  }

  // Check if user exists with this email
  const { data: targetUser } = await supabase.auth.admin.listUsers();
  const sharedUser = targetUser?.users?.find((u) => u.email === parsed.data.email);

  // Create share record
  const { data: share, error: shareError } = await supabase
    .from("trip_shares")
    .insert({
      trip_id: tripId,
      shared_with_email: parsed.data.email,
      shared_with_user_id: sharedUser?.id || null,
      shared_by: user.id,
      can_edit: false
    })
    .select("id, shared_with_email, created_at")
    .single();

  if (shareError) {
    if (shareError.code === "23505") {
      return NextResponse.json(
        { message: "Trip sudah dibagikan ke email ini" },
        { status: 400 }
      );
    }
    console.error(shareError);
    return NextResponse.json({ message: "Gagal membagikan trip" }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Trip berhasil dibagikan", data: share },
    { status: 201 }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: { tripId: string } }
) {
  const { tripId } = params;

  if (!tripId) {
    return NextResponse.json({ message: "Trip tidak ditemukan" }, { status: 404 });
  }

  const supabase = getSupabaseServer();

  const { data: shares, error } = await supabase
    .from("trip_shares")
    .select("id, shared_with_email, can_edit, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal mengambil data sharing" }, { status: 500 });
  }

  return NextResponse.json({ shares: shares || [] });
}
