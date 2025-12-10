import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { TripPaymentAccountAttachment } from "@/types/expense";

const attachSchema = z.object({
  paymentAccountId: z.string().min(1, "Pilih metode pembayaran"),
  customLabel: z.string().max(80).optional().or(z.literal("")),
  customInstructions: z.string().max(280).optional().or(z.literal("")),
  customPriority: z.number().int().min(0).max(100).optional().nullable(),
});

function normalizeOptionalString(value?: string | null) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function mapAttachment(row: {
  id: string;
  trip_id: string;
  custom_label: string | null;
  custom_instructions: string | null;
  custom_priority: number | string | null;
  created_at: string;
  updated_at: string;
  payment_account:
    | {
        id: string;
        label: string;
        channel: "bank" | "ewallet" | "cash" | "other";
        provider: string | null;
        account_name: string;
        account_number: string;
        instructions: string | null;
        priority: number | string | null;
        created_at: string;
        updated_at: string;
      }
    | Array<{
        id: string;
        label: string;
        channel: "bank" | "ewallet" | "cash" | "other";
        provider: string | null;
        account_name: string;
        account_number: string;
        instructions: string | null;
        priority: number | string | null;
        created_at: string;
        updated_at: string;
      }>
    | null;
}): TripPaymentAccountAttachment | null {
  const relation = row.payment_account;
  const base = Array.isArray(relation) ? relation[0] ?? null : relation;
  if (!base) {
    return null;
  }

  const basePriority =
    typeof base.priority === "number"
      ? base.priority
      : Number(base.priority ?? 0);
  const customPriority =
    row.custom_priority != null
      ? typeof row.custom_priority === "number"
        ? row.custom_priority
        : Number(row.custom_priority || 0)
      : null;

  const finalPriority = customPriority ?? basePriority;
  const finalInstructions =
    row.custom_instructions ?? base.instructions ?? undefined;

  return {
    id: row.id,
    paymentAccountId: base.id,
    label: row.custom_label ?? base.label,
    channel: base.channel,
    provider: base.provider,
    accountName: base.account_name,
    accountNumber: base.account_number,
    instructions: finalInstructions,
    priority: finalPriority,
    customLabel: row.custom_label ?? undefined,
    customInstructions: row.custom_instructions ?? undefined,
    customPriority: customPriority ?? undefined,
    attachedAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
  const parsed = attachSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data belum valid", issues: parsed.error.flatten() },
      { status: 400 },
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

  const { data: tripRow, error: tripError } = await supabase
    .from("trips")
    .select("id, owner_id")
    .eq("id", tripId)
    .maybeSingle();

  if (tripError) {
    console.error(tripError);
    return NextResponse.json(
      { message: "Gagal memeriksa perjalanan" },
      { status: 500 },
    );
  }

  if (!tripRow || tripRow.owner_id !== user.id) {
    return NextResponse.json(
      { message: "Tidak diizinkan mengubah metode pembayaran" },
      { status: 403 },
    );
  }

  const { data: accountRow, error: accountError } = await supabase
    .from("user_payment_accounts")
    .select("id")
    .eq("id", parsed.data.paymentAccountId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (accountError) {
    console.error(accountError);
    return NextResponse.json(
      { message: "Gagal memeriksa metode pembayaran" },
      { status: 500 },
    );
  }

  if (!accountRow) {
    return NextResponse.json(
      { message: "Metode pembayaran tidak ditemukan" },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("trip_payment_accounts")
    .insert({
      trip_id: tripId,
      payment_account_id: parsed.data.paymentAccountId,
      custom_label: normalizeOptionalString(parsed.data.customLabel),
      custom_instructions: normalizeOptionalString(
        parsed.data.customInstructions,
      ),
      custom_priority: parsed.data.customPriority ?? null,
    })
    .select(
      `
        id,
        trip_id,
        custom_label,
        custom_instructions,
        custom_priority,
        created_at,
        updated_at,
        payment_account:user_payment_accounts!inner (
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
        )
      `,
    )
    .maybeSingle();

  if (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      return NextResponse.json(
        { message: "Metode pembayaran sudah dilampirkan" },
        { status: 409 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { message: "Gagal melampirkan metode pembayaran" },
      { status: 500 },
    );
  }

  const attachment = data ? mapAttachment(data) : null;
  if (!attachment) {
    return NextResponse.json(
      { message: "Gagal memproses lampiran" },
      { status: 500 },
    );
  }

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json(
    { message: "Metode pembayaran dilampirkan", data: attachment },
    { status: 201 },
  );
}
