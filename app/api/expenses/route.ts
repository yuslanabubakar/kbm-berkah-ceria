import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { expenses, expenseSplits } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

const splitItemSchema = z.object({
  participantId: z.string().min(1),
  amountIdr: z.number().positive(),
});

const expenseSchema = z
  .object({
    tripId: z.string().min(1),
    judul: z.string().min(2),
    amountIdr: z.number().positive(),
    paidBy: z.string().min(1),
    legId: z.string().min(1),
    vehicleId: z.string().optional().nullable(),
    shareScope: z.enum(["leg", "vehicle"]),
    catatan: z.string().optional(),
    splits: z.array(splitItemSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.shareScope === "vehicle" && !data.vehicleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vehicleId"],
        message: "Pilih kendaraan untuk membagi biaya khusus kendaraan",
      });
    }
  });

export async function POST(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = expenseSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Data belum lengkap",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const hasSplits = parsed.data.splits && parsed.data.splits.length > 0;
  const amountIdr = hasSplits
    ? parsed.data.splits!.reduce((sum, s) => sum + s.amountIdr, 0)
    : parsed.data.amountIdr;

  if (amountIdr <= 0) {
    return NextResponse.json(
      { message: "Total tagihan harus lebih dari 0" },
      { status: 400 },
    );
  }

  const db = getDb();
  const expenseId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await db.insert(expenses).values({
      id: expenseId,
      tripId: parsed.data.tripId,
      legId: parsed.data.legId,
      vehicleId: parsed.data.vehicleId ?? null,
      paidBy: parsed.data.paidBy,
      title: parsed.data.judul,
      amountIdr,
      notes: parsed.data.catatan ?? null,
      expenseType: hasSplits ? "makan" : "lainnya",
      issuedAt: now,
      createdBy: currentUser.id,
      isExcluded: false,
      createdAt: now,
    });

    if (hasSplits) {
      for (const s of parsed.data.splits!) {
        await db.insert(expenseSplits).values({
          id: crypto.randomUUID(),
          expenseId,
          participantId: s.participantId,
          shareWeight: 1,
          shareAmountOverride: s.amountIdr,
          createdAt: now,
        });
      }
    }

    revalidatePath(`/perjalanan/${parsed.data.tripId}`);
    revalidatePath(`/`);

    return NextResponse.json(
      { message: "Berhasil", id: expenseId },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    try {
      await db.delete(expenses).where(eq(expenses.id, expenseId));
    } catch {
      // ignore
    }
    return NextResponse.json(
      { message: "Gagal menyimpan pengeluaran" },
      { status: 500 },
    );
  }
}
