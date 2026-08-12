import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { userPaymentAccounts, tripPaymentAccounts } from "@/db/schema";

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

  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
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

  const db = getDb();
  const paymentAccountId = crypto.randomUUID();
  const tripAccountId = crypto.randomUUID();
  const now = new Date().toISOString();

  const cleanProvider = parsed.data.provider?.trim() || null;
  const cleanInstructions = parsed.data.instructions?.trim() || null;

  // Create User Payment Account
  await db.insert(userPaymentAccounts).values({
    id: paymentAccountId,
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

  // Attach to Trip Payment Accounts
  await db.insert(tripPaymentAccounts).values({
    id: tripAccountId,
    tripId,
    paymentAccountId,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/");
  revalidatePath(`/perjalanan/${tripId}`);

  return NextResponse.json({
    message: "Akun host ditambahkan",
    data: { id: tripAccountId },
  });
}
