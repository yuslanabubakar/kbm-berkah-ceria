import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  detectCategory,
  getCategoryById,
  formatLegDateRange,
  buildLegVehicleOptions,
  expenseFormSchema,
  EXPENSE_CATEGORIES,
  getLegShortName,
  buildAutoExpenseTitle,
  buildQuickBatchRows,
} from "@/components/expenseFormUtils";
import type { TripLeg } from "@/lib/tripQueries";

describe("expenseFormUtils", () => {
  describe("detectCategory", () => {
    test("detects BBM keywords", () => {
      assert.equal(detectCategory("Beli bensin pertamax di SPBU"), "bbm");
      assert.equal(detectCategory("Isi Solar bus"), "bbm");
      assert.equal(detectCategory("Fuel rest area"), "bbm");
    });

    test("detects Tol keywords", () => {
      assert.equal(detectCategory("Bayar Tol Cipularang"), "tol");
      assert.equal(detectCategory("Topup e-toll"), "tol");
      assert.equal(detectCategory("Jalan tol layang"), "tol");
    });

    test("detects Makan keywords", () => {
      assert.equal(detectCategory("Makan siang nasi padang"), "makan");
      assert.equal(detectCategory("Ngopi di cafe rest area"), "makan");
      assert.equal(detectCategory("Beli snack dan sarapan"), "makan");
    });

    test("detects Parkir keywords", () => {
      assert.equal(detectCategory("Tiket parkir mobil"), "parkir");
      assert.equal(detectCategory("Valet parking hotel"), "parkir");
    });

    test("detects Hotel keywords", () => {
      assert.equal(detectCategory("Booking hotel resort di puncak"), "hotel");
      assert.equal(detectCategory("Sewa homestay dekat pantai"), "hotel");
    });

    test("detects Tiket keywords", () => {
      assert.equal(detectCategory("Tiket masuk candi"), "tiket");
      assert.equal(detectCategory("Wahana bermain anak"), "tiket");
    });

    test("detects Belanja keywords", () => {
      assert.equal(detectCategory("Oleh-oleh khas Bandung"), "belanja");
      assert.equal(detectCategory("Beli cinderamata di pasar"), "belanja");
    });

    test("detects Transport keywords", () => {
      assert.equal(detectCategory("Sewa mobil elf"), "transport");
      assert.equal(detectCategory("Naik grab car"), "transport");
    });

    test("returns lainnya for unrecognized titles or empty strings", () => {
      assert.equal(detectCategory("Biaya tak terduga"), "lainnya");
      assert.equal(detectCategory(""), "lainnya");
      assert.equal(detectCategory("a"), "lainnya");
    });
  });

  describe("getCategoryById", () => {
    test("returns matching category object", () => {
      const cat = getCategoryById("bbm");
      assert.equal(cat.id, "bbm");
      assert.equal(cat.emoji, "⛽");
    });

    test("returns lainnya fallback for unknown category id", () => {
      const cat = getCategoryById("non_existent");
      assert.equal(cat.id, "lainnya");
    });
  });

  describe("formatLegDateRange", () => {
    test("returns formatted date when start is provided", () => {
      const leg: TripLeg = {
        id: "leg-1",
        order: 1,
        label: "Jakarta - Bandung",
        start: "2026-08-20T08:00:00.000Z",
        vehicles: [],
      };
      const formatted = formatLegDateRange(leg);
      assert.match(formatted, /2026/);
    });

    test("returns fallback text when leg is undefined", () => {
      assert.equal(
        formatLegDateRange(undefined),
        "Tanggal leg belum ditentukan",
      );
    });
  });

  describe("buildLegVehicleOptions", () => {
    test("builds options for legs without vehicles", () => {
      const legs: TripLeg[] = [
        {
          id: "leg-1",
          order: 1,
          label: "Jakarta ⇄ Bandung",
          vehicles: [],
        },
      ];
      const options = buildLegVehicleOptions(legs);
      assert.equal(options.length, 1);
      assert.equal(options[0].key, "leg-1::none");
      assert.equal(options[0].vehicleId, null);
    });

    test("builds options for legs with multiple vehicles", () => {
      const legs: TripLeg[] = [
        {
          id: "leg-1",
          order: 1,
          label: "Bandung ⇄ Pangandaran",
          vehicles: [
            {
              id: "v-1",
              label: "Avanza Hitam",
              plateNumber: "D 1234 ABC",
              assignments: [],
            },
            {
              id: "v-2",
              label: "Innova Putih",
              plateNumber: "B 5678 XYZ",
              assignments: [],
            },
          ],
        },
      ];
      const options = buildLegVehicleOptions(legs);
      assert.equal(options.length, 3); // 1 "Semua kendaraan" + 2 vehicles
      assert.equal(options[0].vehicleId, null);
      assert.equal(options[1].vehicleId, "v-1");
      assert.equal(options[2].vehicleId, "v-2");
    });
  });

  describe("expenseFormSchema", () => {
    test("validates valid expense data", () => {
      const result = expenseFormSchema.safeParse({
        judul: "Bensin Rest Area",
        amountIdr: 250000,
        catatan: "Pertalite",
        legId: "leg-1",
        paidById: "part-1",
        shareScope: "leg",
      });
      assert.equal(result.success, true);
    });

    test("fails on amount under minimum 1000", () => {
      const result = expenseFormSchema.safeParse({
        judul: "Permen",
        amountIdr: 500,
        legId: "leg-1",
        paidById: "part-1",
        shareScope: "leg",
      });
      assert.equal(result.success, false);
    });

    test("fails when shareScope is vehicle but vehicleId is missing", () => {
      const result = expenseFormSchema.safeParse({
        judul: "Bensin Avanza",
        amountIdr: 150000,
        legId: "leg-1",
        paidById: "part-1",
        shareScope: "vehicle",
        vehicleId: null,
      });
      assert.equal(result.success, false);
    });
  });

  describe("quick expense auto-title & batch rows", () => {
    test("labels 2-leg trips as Pergi / Pulang and other counts as Leg N", () => {
      assert.equal(getLegShortName(0, 2), "Pergi");
      assert.equal(getLegShortName(1, 2), "Pulang");
      assert.equal(getLegShortName(0, 1), "Leg 1");
      assert.equal(getLegShortName(2, 3), "Leg 3");
    });

    test("generates clean auto titles for bbm, tol, makan, and optional vehicle", () => {
      assert.equal(buildAutoExpenseTitle("bbm", 0, 2), "Bensin Pergi");
      assert.equal(buildAutoExpenseTitle("tol", 1, 2), "Tol Pulang");
      assert.equal(buildAutoExpenseTitle("makan", 0, 2), "Makan Pergi");
      assert.equal(
        buildAutoExpenseTitle("bbm", 0, 2, "Avanza"),
        "Bensin Avanza Pergi",
      );
      assert.equal(buildAutoExpenseTitle("lainnya", 0, 2), "");
    });

    test("builds pre-filled Tol & Bensin batch rows for all legs", () => {
      const legs: TripLeg[] = [
        { id: "l1", order: 1, label: "Bandung ⇄ Jakarta", vehicles: [] },
        { id: "l2", order: 2, label: "Jakarta ⇄ Bandung", vehicles: [] },
      ];
      const rows = buildQuickBatchRows(legs, "p-1");
      assert.equal(rows.length, 4);
      assert.deepEqual(
        rows.map((r) => r.title),
        ["Tol Pergi", "Bensin Pergi", "Tol Pulang", "Bensin Pulang"],
      );
      assert.ok(rows.every((r) => r.paidById === "p-1" && r.amountIdr === 0));
    });

    test("builds per-vehicle Tol & Bensin rows automatically when trip has >1 vehicle", () => {
      const legs: TripLeg[] = [
        {
          id: "l1",
          order: 1,
          label: "Bandung ⇄ Jakarta",
          vehicles: [
            {
              id: "v1",
              label: "Mobil 1",
              assignments: [
                {
                  participantId: "driver-1",
                  participantName: "Andi",
                  role: "driver",
                },
              ],
            },
            {
              id: "v2",
              label: "Mobil 2",
              assignments: [
                {
                  participantId: "driver-2",
                  participantName: "Budi",
                  role: "driver",
                },
              ],
            },
          ],
        },
        {
          id: "l2",
          order: 2,
          label: "Jakarta ⇄ Bandung",
          vehicles: [
            {
              id: "v1",
              label: "Mobil 1",
              assignments: [
                {
                  participantId: "driver-1",
                  participantName: "Andi",
                  role: "driver",
                },
              ],
            },
            {
              id: "v2",
              label: "Mobil 2",
              assignments: [
                {
                  participantId: "driver-2",
                  participantName: "Budi",
                  role: "driver",
                },
              ],
            },
          ],
        },
      ];

      const rows = buildQuickBatchRows(legs, "fallback-p");
      assert.equal(rows.length, 8);
      assert.deepEqual(
        rows.map((r) => r.title),
        [
          "Tol Mobil 1 Pergi",
          "Bensin Mobil 1 Pergi",
          "Tol Mobil 1 Pulang",
          "Bensin Mobil 1 Pulang",
          "Tol Mobil 2 Pergi",
          "Bensin Mobil 2 Pergi",
          "Tol Mobil 2 Pulang",
          "Bensin Mobil 2 Pulang",
        ],
      );
      assert.equal(rows[0].paidById, "driver-1");
      assert.equal(rows[4].paidById, "driver-2");
    });
  });
});
