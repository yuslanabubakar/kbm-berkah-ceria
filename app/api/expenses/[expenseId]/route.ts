import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { expenses } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";

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

const deleteSchema = z.object({
  tripId: z.string().min(1),
});

type Params = {
  params: { expenseId: string };
};

export async function PATCH(request: Request, { params }: Params) {
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

  try {
    const db = getDb();
    const existing = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.id, params.expenseId),
          eq(expenses.tripId, parsed.data.tripId),
        ),
      )
      .get();

    if (!existing) {
      return NextResponse.json(
        { message: "Pengeluaran tidak ditemukan" },
        { status: 404 },
      );
    }

    await db
      .update(expenses)
      .set({
        title: parsed.data.judul,
        amountIdr: parsed.data.amountIdr,
        paidBy: parsed.data.paidBy,
        legId: parsed.data.legId,
        vehicleId: parsed.data.vehicleId ?? null,
        shareScope: parsed.data.shareScope,
        notes: parsed.data.catatan ?? null,
      })
      .where(eq(expenses.id, params.expenseId));

    revalidatePath(`/perjalanan/${parsed.data.tripId}`);
    revalidatePath(`/`);

    return NextResponse.json(
      { message: "Berhasil diperbarui" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Butuh informasi perjalanan" },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const existing = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.id, params.expenseId),
          eq(expenses.tripId, parsed.data.tripId),
        ),
      )
      .get();

    if (!existing) {
      return NextResponse.json(
        { message: "Pengeluaran tidak ditemukan" },
        { status: 404 },
      );
    }

    await db.delete(expenses).where(eq(expenses.id, params.expenseId));

    revalidatePath(`/perjalanan/${parsed.data.tripId}`);
    revalidatePath(`/`);

    return NextResponse.json({ message: "Berhasil dihapus" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
