import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseClient";

const channelEnum = z.enum(["bank", "ewallet", "cash", "other"]);

const updateSchema = z
  .object({
    label: z.string().min(3).optional(),
    channel: channelEnum.optional(),
    provider: z.string().min(2).max(80).optional().or(z.literal("")),
    accountName: z.string().min(3).optional(),
    accountNumber: z.string().min(3).optional(),
    instructions: z.string().max(280).optional().or(z.literal("")),
    priority: z.number().int().min(0).max(100).optional()
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Tidak ada perubahan",
    path: ["label"]
  });

export async function PATCH(request: Request, { params }: { params: { tripId: string; accountId: string } }) {
  const { tripId, accountId } = params;

  if (!tripId || !accountId) {
    return NextResponse.json({ message: "Akun host tidak ditemukan" }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return NextResponse.json({ message: "Data belum valid", issues: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, string | number | null> = {};

  if (parsed.data.label !== undefined) {
    updates.label = parsed.data.label.trim();
  }
  if (parsed.data.channel !== undefined) {
    updates.channel = parsed.data.channel;
  }
  if (parsed.data.provider !== undefined) {
    updates.provider = parsed.data.provider.trim() || null;
  }
  if (parsed.data.accountName !== undefined) {
    updates.account_name = parsed.data.accountName.trim();
  }
  if (parsed.data.accountNumber !== undefined) {
    updates.account_number = parsed.data.accountNumber.trim();
  }
  if (parsed.data.instructions !== undefined) {
    updates.instructions = parsed.data.instructions.trim() || null;
  }
  if (parsed.data.priority !== undefined) {
    updates.priority = parsed.data.priority;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ message: "Tidak ada perubahan" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("host_payment_accounts")
    .update(updates)
    .eq("trip_id", tripId)
    .eq("id", accountId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal memperbarui akun host" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ message: "Akun host tidak ditemukan" }, { status: 404 });
  }

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Akun host diperbarui" });
}

export async function DELETE(_request: Request, { params }: { params: { tripId: string; accountId: string } }) {
  const { tripId, accountId } = params;

  if (!tripId || !accountId) {
    return NextResponse.json({ message: "Akun host tidak ditemukan" }, { status: 404 });
  }

  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("host_payment_accounts")
    .delete()
    .eq("trip_id", tripId)
    .eq("id", accountId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal menghapus akun host" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ message: "Akun host tidak ditemukan" }, { status: 404 });
  }

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Akun host dihapus" });
}
