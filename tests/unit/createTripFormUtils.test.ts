import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseParticipantsList,
  validateStep1,
  validateStep2,
  validateExpenseItem,
  detectExpenseCategory,
  buildFullCreateTripPayload,
  buildCreateTripPayload,
  getTodayDateString,
  DEFAULT_PARTICIPANTS,
  DEFAULT_VEHICLE_LABEL,
} from "@/components/createTripFormUtils";

describe("createTripFormUtils", () => {
  describe("DEFAULT_PARTICIPANTS", () => {
    test("contains the 9 new default participants", () => {
      assert.deepEqual(DEFAULT_PARTICIPANTS, [
        "Yuslan",
        "Gani",
        "Rasyid",
        "Resya",
        "Adit",
        "Adi",
        "Revi",
        "Sandro",
        "Irfan",
      ]);
    });
  });

  describe("getTodayDateString", () => {
    test("returns date in YYYY-MM-DD format", () => {
      const today = getTodayDateString();
      assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("detectExpenseCategory", () => {
    test("detects BBM keywords", () => {
      assert.equal(detectExpenseCategory("Beli bensin Pertamax"), "bbm");
      assert.equal(detectExpenseCategory("Isi Solar SPBU 57"), "bbm");
    });

    test("detects Tol keywords", () => {
      assert.equal(detectExpenseCategory("Bayar Tol Cipali"), "tol");
      assert.equal(detectExpenseCategory("Top up e-toll"), "tol");
    });

    test("detects Makan keywords", () => {
      assert.equal(detectExpenseCategory("Makan Siang Resto Gurame"), "makan");
      assert.equal(detectExpenseCategory("Ngopi di Kafe Bromo"), "makan");
    });

    test("detects Parkir keywords", () => {
      assert.equal(detectExpenseCategory("Parkir mobil bandara"), "parkir");
    });

    test("detects Hotel keywords", () => {
      assert.equal(detectExpenseCategory("Sewa Villa Resort Bromo"), "hotel");
    });

    test("returns lainnya fallback for other things", () => {
      assert.equal(detectExpenseCategory("Biaya tak terduga"), "lainnya");
    });
  });

  describe("parseParticipantsList", () => {
    test("parses newline-separated names and removes empty lines and extra spaces", () => {
      const input = "  Yuslan \n\n Gani \n  Rasyid  \n";
      const result = parseParticipantsList(input);
      assert.deepEqual(result, ["Yuslan", "Gani", "Rasyid"]);
    });

    test("deduplicates case-insensitively while preserving first occurrence casing", () => {
      const input = "Yuslan\nGani\nyuslan\nGANI\nResya";
      const result = parseParticipantsList(input);
      assert.deepEqual(result, ["Yuslan", "Gani", "Resya"]);
    });

    test("handles empty string gracefully", () => {
      assert.deepEqual(parseParticipantsList(""), []);
      assert.deepEqual(parseParticipantsList("   \n \n   "), []);
    });
  });

  describe("validateStep1", () => {
    test("fails if tripName is empty or whitespace", () => {
      const res1 = validateStep1({ tripName: "", startDate: "2026-09-01" });
      assert.equal(res1.isValid, false);
      assert.match(res1.error || "", /Nama perjalanan wajib/);

      const res2 = validateStep1({ tripName: "   ", startDate: "2026-09-01" });
      assert.equal(res2.isValid, false);
    });

    test("fails if startDate is empty", () => {
      const res = validateStep1({ tripName: "Malang Trip", startDate: "" });
      assert.equal(res.isValid, false);
      assert.match(res.error || "", /Tanggal mulai wajib/);
    });

    test("fails if endDate is before startDate", () => {
      const res = validateStep1({
        tripName: "Malang Trip",
        startDate: "2026-09-10",
        endDate: "2026-09-05",
      });
      assert.equal(res.isValid, false);
      assert.match(res.error || "", /Tanggal selesai tidak boleh sebelum/);
    });

    test("passes when valid data provided", () => {
      const res = validateStep1({
        tripName: "Malang Trip",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
      });
      assert.equal(res.isValid, true);
    });
  });

  describe("validateStep2", () => {
    test("fails when participants array is empty", () => {
      const res = validateStep2(
        [],
        [{ id: "v-1", label: "Avanza", plateNumber: "" }],
      );
      assert.equal(res.isValid, false);
      assert.match(res.error || "", /Minimal harus ada 1 peserta/);
    });

    test("fails when vehicles array is empty", () => {
      const res = validateStep2(["Yuslan"], []);
      assert.equal(res.isValid, false);
      assert.match(res.error || "", /Minimal harus ada 1 armada/);
    });

    test("fails when a vehicle label is blank", () => {
      const res = validateStep2(
        ["Yuslan"],
        [{ id: "v-1", label: "   ", plateNumber: "" }],
      );
      assert.equal(res.isValid, false);
      assert.match(res.error || "", /Nama kendaraan tidak boleh kosong/);
    });

    test("passes when participants and vehicles are valid", () => {
      const res = validateStep2(
        ["Yuslan"],
        [{ id: "v-1", label: "Avanza", plateNumber: "B 1234 CD" }],
      );
      assert.equal(res.isValid, true);
    });
  });

  describe("validateExpenseItem", () => {
    test("fails if title is empty", () => {
      const res = validateExpenseItem({
        title: "",
        amountIdr: 50000,
        payerName: "Yuslan",
      });
      assert.equal(res.isValid, false);
    });

    test("fails if amount is 0 or negative", () => {
      const res = validateExpenseItem({
        title: "Bensin",
        amountIdr: 0,
        payerName: "Yuslan",
      });
      assert.equal(res.isValid, false);
    });

    test("fails if payerName is empty", () => {
      const res = validateExpenseItem({
        title: "Bensin",
        amountIdr: 50000,
        payerName: "",
      });
      assert.equal(res.isValid, false);
    });

    test("passes with valid expense item", () => {
      const res = validateExpenseItem({
        title: "Bensin",
        amountIdr: 50000,
        payerName: "Yuslan",
      });
      assert.equal(res.isValid, true);
    });

    test("fails food-stop if splits are empty or total is 0", () => {
      const res = validateExpenseItem({
        title: "Makan Siang",
        amountIdr: 0,
        payerName: "Yuslan",
        isFoodStop: true,
        splits: [],
      });
      assert.equal(res.isValid, false);
      assert.match(res.error || "", /nominal tagihan makan/);
    });

    test("passes food-stop with valid splits", () => {
      const res = validateExpenseItem({
        title: "Makan Siang",
        amountIdr: 75000,
        payerName: "Yuslan",
        isFoodStop: true,
        splits: [
          { participantName: "Yuslan", amountIdr: 35000 },
          { participantName: "Gani", amountIdr: 40000 },
        ],
      });
      assert.equal(res.isValid, true);
    });
  });

  describe("buildFullCreateTripPayload", () => {
    test("builds complete payload with legs, vehicles, and expenses", () => {
      const data = {
        tripName: "KBM Tour De Java",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
        legs: [
          { id: "l-1", origin: "Jakarta", destination: "Semarang" },
          { id: "l-2", origin: "Semarang", destination: "Malang" },
        ],
        vehicles: [
          { id: "v-1", label: "Avanza Hitam", plateNumber: "B 1234 CD" },
          { id: "v-2", label: "Innova Putih", plateNumber: "N 5678 EF" },
        ],
        participants: ["Yuslan", "Gani", "Rasyid"],
        driverMap: {
          Yuslan: true,
          Gani: false,
          Rasyid: false,
        },
        expenses: [
          {
            id: "e-1",
            title: "Bensin Pertamax",
            amountIdr: 300000,
            payerName: "Yuslan",
            category: "bbm",
            notes: "Rest Area KM 57",
            vehicleId: "v-1",
            legId: "l-1",
          },
        ],
      };

      const payload = buildFullCreateTripPayload(data);
      assert.equal(payload.name, "KBM Tour De Java");
      assert.equal(payload.originCity, "Jakarta");
      assert.equal(payload.destinationCity, "Malang");
      assert.equal(payload.legs.length, 2);
      assert.equal(payload.vehicles.length, 2);
      assert.equal(payload.participants.length, 3);
      assert.equal(payload.expenses.length, 1);
      assert.equal(payload.expenses[0].vehicleIndex, 0);
      assert.equal(payload.expenses[0].legIndex, 0);
    });
  });
});
