import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";

const updateSchema = z.object({
  label: z.string().min(3, "Nama akun minimal 3 karakter").optional(),
  channel: z.enum(["bank", "ewallet", "cash", "other"]).optional(),
  provider: z.string().max(80).optional().or(z.literal("")),
  accountName: z.string().min(3, "Nama pemilik minimal 3 karakter").optional(),
  accountNumber: z.string().min(3, "Nomor rekening minimal 3 digit").optional(),
  instructions: z.string().max(280).optional().or(z.literal("")),
  priority: z.number().int().min(0).max(100).optional(),
});

function normalizeString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: { accountId: string } },
) {
  const { accountId } = params;
  if (!accountId) {
    return NextResponse.json(
      { message: "Metode pembayaran tidak ditemukan" },
      { status: 404 },
    );
  }

  const supabase = getSupabaseServer();
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ message: "Data belum valid" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data belum valid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!Object.keys(parsed.data).length) {
    return NextResponse.json(
      { message: "Tidak ada perubahan" },
      { status: 400 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
    );
  }

  const updates: Record<string, string | number | null> = {};
  if (parsed.data.label !== undefined) updates.label = parsed.data.label.trim();
  if (parsed.data.channel !== undefined) updates.channel = parsed.data.channel;
  if (parsed.data.accountName !== undefined)
    updates.account_name = parsed.data.accountName.trim();
  if (parsed.data.accountNumber !== undefined)
    updates.account_number = parsed.data.accountNumber.trim();
  if (parsed.data.priority !== undefined)
    updates.priority = parsed.data.priority;
  if (parsed.data.provider !== undefined)
    updates.provider = normalizeString(parsed.data.provider) ?? null;
  if (parsed.data.instructions !== undefined)
    updates.instructions = normalizeString(parsed.data.instructions) ?? null;

  if (!Object.keys(updates).length) {
    return NextResponse.json(
      { message: "Tidak ada perubahan" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("user_payment_accounts")
    .update(updates)
    .eq("id", accountId)
    .eq("owner_id", user.id)
    .select(
      `
        id,
        label,
        channel,
        provider,
        account_name,
        account_number,
        instructions,
        priority,
        created_at,
        updated_at
      `,
    )
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Gagal memperbarui metode" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { message: "Metode tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    message: "Metode diperbarui",
    data: {
      id: data.id,
      label: data.label,
      channel: data.channel,
      provider: data.provider,
      accountName: data.account_name,
      accountNumber: data.account_number,
      instructions: data.instructions ?? null,
      priority: data.priority ?? 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { accountId: string } },
) {
  const { accountId } = params;
  if (!accountId) {
    return NextResponse.json(
      { message: "Metode pembayaran tidak ditemukan" },
      { status: 404 },
    );
  }

  const supabase = getSupabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
    );
  }

  const { error } = await supabase
    .from("user_payment_accounts")
    .delete()
    .eq("id", accountId)
    .eq("owner_id", user.id);

  if (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Gagal menghapus metode pembayaran" },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "Metode pembayaran dihapus" });
}
