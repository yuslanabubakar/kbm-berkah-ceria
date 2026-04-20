import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "edge";

const channelEnum = z.enum(["bank", "ewallet", "cash", "other"]);

const paymentAccountSchema = z.object({
  label: z.string().min(3, "Nama akun minimal 3 karakter"),
  channel: channelEnum.default("bank"),
  provider: z.string().max(80).optional().or(z.literal("")),
  accountName: z.string().min(3, "Nama pemilik minimal 3 karakter"),
  accountNumber: z.string().min(3, "Nomor rekening minimal 3 digit"),
  instructions: z.string().max(280).optional().or(z.literal("")),
  priority: z.number().int().min(0).max(100).optional(),
});

function normalizeWhitespace(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET() {
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

  const { data, error } = await supabase
    .from("user_payment_accounts")
    .select(
      "id, label, channel, provider, account_name, account_number, instructions, priority, created_at, updated_at",
    )
    .eq("owner_id", user.id)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Gagal mengambil data" },
      { status: 500 },
    );
  }

  const accounts = (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    channel: row.channel,
    provider: row.provider,
    accountName: row.account_name,
    accountNumber: row.account_number,
    instructions: row.instructions ?? undefined,
    priority: row.priority ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return NextResponse.json({ data: accounts });
}

export async function POST(request: Request) {
  const supabase = getSupabaseServer();
  const payload = await request.json().catch(() => null);
  const parsed = paymentAccountSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data belum valid", issues: parsed.error.flatten() },
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

  const cleanProvider = normalizeWhitespace(parsed.data.provider);
  const cleanInstructions = normalizeWhitespace(parsed.data.instructions);

  const { data, error } = await supabase
    .from("user_payment_accounts")
    .insert({
      owner_id: user.id,
      label: parsed.data.label.trim(),
      channel: parsed.data.channel,
      provider: cleanProvider,
      account_name: parsed.data.accountName.trim(),
      account_number: parsed.data.accountNumber.trim(),
      instructions: cleanInstructions,
      priority: parsed.data.priority ?? 0,
    })
    .select(
      "id, label, channel, provider, account_name, account_number, instructions, priority, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    console.error(error);
    return NextResponse.json(
      { message: "Gagal menyimpan metode pembayaran" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      message: "Metode pembayaran disimpan",
      data: {
        id: data.id,
        label: data.label,
        channel: data.channel,
        provider: data.provider,
        accountName: data.account_name,
        accountNumber: data.account_number,
        instructions: data.instructions ?? undefined,
        priority: data.priority ?? 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    },
    { status: 201 },
  );
}
