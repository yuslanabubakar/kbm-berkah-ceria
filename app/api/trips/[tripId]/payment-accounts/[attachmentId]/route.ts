import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { TripPaymentAccountAttachment } from "@/types/expense";

const updateSchema = z
  .object({
    customLabel: z.string().max(80).optional().or(z.literal("")),
    customInstructions: z.string().max(280).optional().or(z.literal("")),
    customPriority: z.number().int().min(0).max(100).optional().nullable(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    {
      message: "Tidak ada perubahan",
      path: ["customLabel"],
    },
  );

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

async function verifyOwner(
  supabase: ReturnType<typeof getSupabaseServer>,
  tripId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("trips")
    .select("id, owner_id")
    .eq("id", tripId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.owner_id !== userId) {
    return false;
  }

  return true;
}

export async function PATCH(
  request: Request,
  { params }: { params: { tripId: string; attachmentId: string } },
) {
  const { tripId, attachmentId } = params;

  if (!tripId || !attachmentId) {
    return NextResponse.json(
      { message: "Lampiran tidak ditemukan" },
      { status: 404 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload ?? {});

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

  try {
    const isOwner = await verifyOwner(supabase, tripId, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { message: "Tidak diizinkan mengubah metode pembayaran" },
        { status: 403 },
      );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Gagal memeriksa perjalanan" },
      { status: 500 },
    );
  }

  const updates: Record<string, string | number | null> = {};

  if (parsed.data.customLabel !== undefined) {
    updates.custom_label = normalizeOptionalString(parsed.data.customLabel);
  }
  if (parsed.data.customInstructions !== undefined) {
    updates.custom_instructions = normalizeOptionalString(
      parsed.data.customInstructions,
    );
  }
  if (parsed.data.customPriority !== undefined) {
    updates.custom_priority = parsed.data.customPriority ?? null;
  }

  const { data, error } = await supabase
    .from("trip_payment_accounts")
    .update(updates)
    .eq("id", attachmentId)
    .eq("trip_id", tripId)
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
    console.error(error);
    return NextResponse.json(
      { message: "Gagal memperbarui lampiran" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { message: "Lampiran tidak ditemukan" },
      { status: 404 },
    );
  }

  const attachment = mapAttachment(data);
  if (!attachment) {
    return NextResponse.json(
      { message: "Gagal memproses lampiran" },
      { status: 500 },
    );
  }

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({
    message: "Lampiran diperbarui",
    data: attachment,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { tripId: string; attachmentId: string } },
) {
  const { tripId, attachmentId } = params;

  if (!tripId || !attachmentId) {
    return NextResponse.json(
      { message: "Lampiran tidak ditemukan" },
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

  try {
    const isOwner = await verifyOwner(supabase, tripId, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { message: "Tidak diizinkan mengubah metode pembayaran" },
        { status: 403 },
      );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Gagal memeriksa perjalanan" },
      { status: 500 },
    );
  }

  const { error } = await supabase
    .from("trip_payment_accounts")
    .delete()
    .eq("id", attachmentId)
    .eq("trip_id", tripId);

  if (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Gagal melepas metode pembayaran" },
      { status: 500 },
    );
  }

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({ message: "Metode pembayaran dilepas" });
}
