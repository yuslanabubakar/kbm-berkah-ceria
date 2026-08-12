import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { userPaymentAccounts } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

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

export async function GET(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
    );
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(userPaymentAccounts)
    .where(eq(userPaymentAccounts.userId, currentUser.id))
    .orderBy(
      asc(userPaymentAccounts.priority),
      asc(userPaymentAccounts.createdAt),
    )
    .all();

  const accounts = rows.map((row) => ({
    id: row.id,
    label: row.label,
    channel: row.channel,
    provider: row.provider,
    accountName: row.accountName,
    accountNumber: row.accountNumber,
    instructions: row.instructions ?? undefined,
    priority: row.priority ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  return NextResponse.json({ data: accounts });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = paymentAccountSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data belum valid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const cleanProvider = normalizeWhitespace(parsed.data.provider);
  const cleanInstructions = normalizeWhitespace(parsed.data.instructions);
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(userPaymentAccounts).values({
    id,
    userId: currentUser.id,
    label: parsed.data.label.trim(),
    channel: parsed.data.channel,
    provider: cleanProvider,
    accountName: parsed.data.accountName.trim(),
    accountNumber: parsed.data.accountNumber.trim(),
    instructions: cleanInstructions,
    priority: parsed.data.priority ?? 0,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json(
    {
      message: "Metode pembayaran disimpan",
      data: {
        id,
        label: parsed.data.label.trim(),
        channel: parsed.data.channel,
        provider: cleanProvider,
        accountName: parsed.data.accountName.trim(),
        accountNumber: parsed.data.accountNumber.trim(),
        instructions: cleanInstructions ?? undefined,
        priority: parsed.data.priority ?? 0,
        createdAt: now,
        updatedAt: now,
      },
    },
    { status: 201 },
  );
}
