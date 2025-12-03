import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function DELETE(
  _request: Request,
  { params }: { params: { tripId: string; shareId: string } }
) {
  const { tripId, shareId } = params;

  if (!tripId || !shareId) {
    return NextResponse.json({ message: "Data tidak valid" }, { status: 404 });
  }

  const supabase = getSupabaseServer();

  const { error } = await supabase
    .from("trip_shares")
    .delete()
    .eq("id", shareId)
    .eq("trip_id", tripId);

  if (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal menghapus sharing" }, { status: 500 });
  }

  return NextResponse.json({ message: "Sharing dihapus" });
}
