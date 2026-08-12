import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { userPaymentAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";

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

  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
    );
  }

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

  const db = getDb();
  const existing = await db
    .select()
    .from(userPaymentAccounts)
    .where(
      and(
        eq(userPaymentAccounts.id, accountId),
        eq(userPaymentAccounts.userId, currentUser.id),
      ),
    )
    .get();

  if (!existing) {
    return NextResponse.json(
      { message: "Metode tidak ditemukan" },
      { status: 404 },
    );
  }

  const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (parsed.data.label !== undefined) updates.label = parsed.data.label.trim();
  if (parsed.data.channel !== undefined) updates.channel = parsed.data.channel;
  if (parsed.data.accountName !== undefined)
    updates.accountName = parsed.data.accountName.trim();
  if (parsed.data.accountNumber !== undefined)
    updates.accountNumber = parsed.data.accountNumber.trim();
  if (parsed.data.priority !== undefined)
    updates.priority = parsed.data.priority;
  if (parsed.data.provider !== undefined)
    updates.provider = normalizeString(parsed.data.provider) ?? null;
  if (parsed.data.instructions !== undefined)
    updates.instructions = normalizeString(parsed.data.instructions) ?? null;

  await db
    .update(userPaymentAccounts)
    .set(updates)
    .where(eq(userPaymentAccounts.id, accountId));

  const updated = await db
    .select()
    .from(userPaymentAccounts)
    .where(eq(userPaymentAccounts.id, accountId))
    .get();

  return NextResponse.json({
    message: "Metode diperbarui",
    data: updated,
  });
}

export async function DELETE(
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

  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
    );
  }

  const db = getDb();
  await db
    .delete(userPaymentAccounts)
    .where(
      and(
        eq(userPaymentAccounts.id, accountId),
        eq(userPaymentAccounts.userId, currentUser.id),
      ),
    );

  return NextResponse.json({ message: "Metode pembayaran dihapus" });
}
