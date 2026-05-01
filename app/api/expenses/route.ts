import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";

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
  const payload = await request.json();
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

  // When food-stop splits are provided, derive the total from them (ignore client amountIdr).
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

  try {
    const supabase = getSupabaseServer();

    const { data: expenseRow, error } = await supabase
      .from("expenses")
      .insert({
        trip_id: parsed.data.tripId,
        leg_id: parsed.data.legId,
        vehicle_id: parsed.data.vehicleId ?? null,
        title: parsed.data.judul,
        amount_idr: amountIdr,
        paid_by: parsed.data.paidBy,
        notes: parsed.data.catatan,
        share_scope: parsed.data.shareScope,
        expense_type: hasSplits ? "makan" : "lainnya",
      })
      .select("id")
      .single();

    if (error || !expenseRow) {
      console.error(error);
      return NextResponse.json({ message: "Gagal simpan" }, { status: 500 });
    }

    if (hasSplits) {
      const splitRows = parsed.data.splits!.map((s) => ({
        expense_id: expenseRow.id,
        participant_id: s.participantId,
        share_weight: 1,
        share_amount_override: s.amountIdr,
      }));

      const { error: splitError } = await supabase
        .from("expense_splits")
        .insert(splitRows);

      if (splitError) {
        console.error(splitError);
        // Best-effort rollback — delete the orphaned expense.
        await supabase.from("expenses").delete().eq("id", expenseRow.id);
        return NextResponse.json(
          { message: "Gagal menyimpan pembagian tagihan makan" },
          { status: 500 },
        );
      }
    }

    revalidatePath(`/perjalanan/${parsed.data.tripId}`);
    revalidatePath(`/`);

    return NextResponse.json(
      { message: "Berhasil", id: expenseRow.id },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
