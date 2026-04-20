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

const deleteSchema = z.object({
  tripId: z.string().min(1),
});

type Params = {
  params: { expenseId: string };
};

export async function PATCH(request: Request, { params }: Params) {
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
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("expenses")
      .update({
        title: parsed.data.judul,
        amount_idr: parsed.data.amountIdr,
        paid_by: parsed.data.paidBy,
        leg_id: parsed.data.legId,
        vehicle_id: parsed.data.vehicleId ?? null,
        share_scope: parsed.data.shareScope,
        notes: parsed.data.catatan,
      })
      .eq("id", params.expenseId)
      .eq("trip_id", parsed.data.tripId)
      .select("id")
      .single();

    if (error) {
      if ("code" in error && error.code === "PGRST116") {
        return NextResponse.json(
          { message: "Pengeluaran tidak ditemukan" },
          { status: 404 },
        );
      }
      console.error(error);
      return NextResponse.json(
        { message: "Gagal memperbarui" },
        { status: 500 },
      );
    }

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
  const payload = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Butuh informasi perjalanan" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", params.expenseId)
      .eq("trip_id", parsed.data.tripId)
      .select("id")
      .single();

    if (error) {
      if ("code" in error && error.code === "PGRST116") {
        return NextResponse.json(
          { message: "Pengeluaran tidak ditemukan" },
          { status: 404 },
        );
      }
      console.error(error);
      return NextResponse.json({ message: "Gagal menghapus" }, { status: 500 });
    }

    revalidatePath(`/perjalanan/${parsed.data.tripId}`);
    revalidatePath(`/`);

    return NextResponse.json({ message: "Berhasil dihapus" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
