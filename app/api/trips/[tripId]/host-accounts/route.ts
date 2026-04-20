import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "edge";

const channelEnum = z.enum(["bank", "ewallet", "cash", "other"]);

const createSchema = z.object({
  label: z.string().min(3, "Nama akun minimal 3 karakter"),
  channel: channelEnum.default("bank"),
  provider: z.string().min(2).max(80).optional().or(z.literal("")),
  accountName: z.string().min(3, "Nama pemilik minimal 3 karakter"),
  accountNumber: z.string().min(3, "Nomor rekening minimal 3 digit"),
  instructions: z.string().max(280).optional().or(z.literal("")),
  priority: z.number().int().min(0).max(100).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { tripId: string } },
) {
  const { tripId } = params;

  if (!tripId) {
    return NextResponse.json(
      { message: "Perjalanan tidak ditemukan" },
      { status: 404 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data belum valid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServer();

  const cleanProvider = parsed.data.provider?.trim() || null;
  const cleanInstructions = parsed.data.instructions?.trim() || null;

  const { data: inserted, error } = await supabase
    .from("host_payment_accounts")
    .insert({
      trip_id: tripId,
      label: parsed.data.label.trim(),
      channel: parsed.data.channel,
      provider: cleanProvider,
      account_name: parsed.data.accountName.trim(),
      account_number: parsed.data.accountNumber.trim(),
      instructions: cleanInstructions,
      priority: parsed.data.priority ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Gagal menyimpan akun host" },
      { status: 500 },
    );
  }

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({
    message: "Akun host ditambahkan",
    data: inserted,
  });
}
