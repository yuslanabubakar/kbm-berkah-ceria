import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabaseServer";

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

  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.from("expenses").insert({
      trip_id: parsed.data.tripId,
      leg_id: parsed.data.legId,
      vehicle_id: parsed.data.vehicleId ?? null,
      title: parsed.data.judul,
      amount_idr: parsed.data.amountIdr,
      paid_by: parsed.data.paidBy,
      notes: parsed.data.catatan,
      share_scope: parsed.data.shareScope,
    });

    if (error) {
      console.error(error);
      return NextResponse.json({ message: "Gagal simpan" }, { status: 500 });
    }

    revalidatePath(`/perjalanan/${parsed.data.tripId}`);
    revalidatePath(`/`);

    return NextResponse.json({ message: "Berhasil", data }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
