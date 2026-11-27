import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  TRIP_RULE_VERSION_LEGACY,
  TRIP_RULE_VERSION_TOWNHALL_2026,
  computeDriverBaseWeight,
  computeDriverDiscountPerDriver,
  computeExpenseAutoWeights,
  computeSettlementTransfers,
  computeSingleTripParticipantIds,
} from "@/lib/tripPricingRules";

const EPSILON = 1e-9;

function assertClose(
  actual: number | undefined,
  expected: number,
  msg?: string,
) {
  assert.ok(actual !== undefined, msg ?? `Expected ${expected}, got undefined`);
  assert.ok(
    Math.abs(actual - expected) < EPSILON,
    msg ?? `Expected ${expected}, got ${actual}`,
  );
}

describe("tripPricingRules (Townhall PK Regulation)", () => {
  describe("driver discount pool (max 50% per vehicle per leg)", () => {
    test("1 driver gets 50% discount (weight 0.5)", () => {
      assertClose(computeDriverDiscountPerDriver(1), 0.5);
      assertClose(computeDriverBaseWeight(1), 0.5);
    });

    test("2 drivers get 25% discount each (weight 0.75 each)", () => {
      assertClose(computeDriverDiscountPerDriver(2), 0.25);
      assertClose(computeDriverBaseWeight(2), 0.75);
    });

    test("3 drivers get 0.5/3 discount each (weight 5/6 each)", () => {
      assertClose(computeDriverDiscountPerDriver(3), 0.5 / 3);
      assertClose(computeDriverBaseWeight(3), 1 - 0.5 / 3);
      // Total discount across all 3 drivers equals 50%
      assertClose(3 * computeDriverDiscountPerDriver(3), 0.5);
    });

    test("4 drivers get 12.5% discount each (weight 0.875 each)", () => {
      assertClose(computeDriverDiscountPerDriver(4), 0.125);
      assertClose(computeDriverBaseWeight(4), 0.875);
    });
  });

  describe("computeSingleTripParticipantIds", () => {
    test("identifies departure-only and return-only participants in 2-leg trip", () => {
      const result = computeSingleTripParticipantIds(2, [
        { legId: "leg-1", participantId: "p-pp" },
        { legId: "leg-2", participantId: "p-pp" },
        { legId: "leg-1", participantId: "p-pergi-only" },
        { legId: "leg-2", participantId: "p-pulang-only" },
      ]);

      assert.equal(result.has("p-pp"), false);
      assert.equal(result.has("p-pergi-only"), true);
      assert.equal(result.has("p-pulang-only"), true);
    });

    test("treats cross-vehicle round-trip (depart car A, return car B) as NOT single trip", () => {
      const result = computeSingleTripParticipantIds(2, [
        { legId: "leg-1", vehicleId: "veh-a", participantId: "p-switch-car" },
        { legId: "leg-2", vehicleId: "veh-b", participantId: "p-switch-car" },
        { legId: "leg-1", vehicleId: "veh-a", participantId: "p-single" },
      ] as any);

      assert.equal(result.has("p-switch-car"), false);
      assert.equal(result.has("p-single"), true);
    });

    test("does not flag anyone in a 1-leg trip", () => {
      const result = computeSingleTripParticipantIds(1, [
        { legId: "leg-1", participantId: "p1" },
        { legId: "leg-1", participantId: "p2" },
      ]);

      assert.equal(result.size, 0);
    });

    test("does not prematurely flag participants when return leg has no assignments yet", () => {
      const result = computeSingleTripParticipantIds(2, [
        { legId: "leg-1", participantId: "p1" },
        { legId: "leg-1", participantId: "p2" },
      ]);

      assert.equal(result.size, 0);
    });
  });

  describe("computeExpenseAutoWeights", () => {
    test("v2 caps driver discount per vehicle independently on multi-vehicle leg", () => {
      const weights = computeExpenseAutoWeights({
        ruleVersion: TRIP_RULE_VERSION_TOWNHALL_2026,
        matchingAssignments: [
          // Car A: 1 driver + 1 passenger
          {
            legId: "leg-1",
            vehicleId: "veh-a",
            participantId: "dA1",
            role: "driver",
          },
          {
            legId: "leg-1",
            vehicleId: "veh-a",
            participantId: "pA1",
            role: "passenger",
          },
          // Car B: 2 drivers + 1 passenger
          {
            legId: "leg-1",
            vehicleId: "veh-b",
            participantId: "dB1",
            role: "driver",
          },
          {
            legId: "leg-1",
            vehicleId: "veh-b",
            participantId: "dB2",
            role: "driver",
          },
          {
            legId: "leg-1",
            vehicleId: "veh-b",
            participantId: "pB1",
            role: "passenger",
          },
        ],
        participants: [],
        singleTripParticipantIds: new Set(),
      });

      assertClose(weights.get("dA1"), 0.5);
      assertClose(weights.get("pA1"), 1.0);
      assertClose(weights.get("dB1"), 0.75);
      assertClose(weights.get("dB2"), 0.75);
      assertClose(weights.get("pB1"), 1.0);
    });

    test("v2 applies +0.1 single-trip fee additively to both passengers and drivers", () => {
      const weights = computeExpenseAutoWeights({
        ruleVersion: TRIP_RULE_VERSION_TOWNHALL_2026,
        matchingAssignments: [
          {
            legId: "leg-1",
            vehicleId: "veh-a",
            participantId: "d1-single",
            role: "driver",
          },
          {
            legId: "leg-1",
            vehicleId: "veh-a",
            participantId: "d2-pp",
            role: "driver",
          },
          {
            legId: "leg-1",
            vehicleId: "veh-a",
            participantId: "p1-single",
            role: "passenger",
          },
          {
            legId: "leg-1",
            vehicleId: "veh-a",
            participantId: "p2-pp",
            role: "passenger",
          },
        ],
        participants: [],
        singleTripParticipantIds: new Set(["d1-single", "p1-single"]),
      });

      // 2 drivers in veh-a -> base driver weight 0.75
      assertClose(weights.get("d1-single"), 0.85); // 0.75 + 0.1
      assertClose(weights.get("d2-pp"), 0.75);
      assertClose(weights.get("p1-single"), 1.1); // 1.0 + 0.1
      assertClose(weights.get("p2-pp"), 1.0);
    });

    test("v2 respects manual allocationOverride over computed rules", () => {
      const weights = computeExpenseAutoWeights({
        ruleVersion: TRIP_RULE_VERSION_TOWNHALL_2026,
        matchingAssignments: [
          {
            legId: "leg-1",
            vehicleId: "veh-a",
            participantId: "custom-p",
            role: "passenger",
            allocationOverride: 0.4,
          },
          {
            legId: "leg-1",
            vehicleId: "veh-a",
            participantId: "normal-p",
            role: "passenger",
          },
        ],
        participants: [],
        singleTripParticipantIds: new Set(["custom-p"]),
      });

      assertClose(weights.get("custom-p"), 0.4);
      assertClose(weights.get("normal-p"), 1.0);
    });

    test("v1 legacy preserves old behavior (every driver 0.5, no single-trip bonus)", () => {
      const weights = computeExpenseAutoWeights({
        ruleVersion: TRIP_RULE_VERSION_LEGACY,
        matchingAssignments: [
          {
            legId: "leg-1",
            vehicleId: "veh-a",
            participantId: "d1",
            role: "driver",
          },
          {
            legId: "leg-1",
            vehicleId: "veh-a",
            participantId: "d2",
            role: "driver",
          },
          {
            legId: "leg-1",
            vehicleId: "veh-a",
            participantId: "p1-single",
            role: "passenger",
          },
        ],
        participants: [],
        singleTripParticipantIds: new Set(["p1-single"]),
      });

      assertClose(weights.get("d1"), 0.5);
      assertClose(weights.get("d2"), 0.5);
      assertClose(weights.get("p1-single"), 1.0);
    });
  });

  describe("computeSettlementTransfers", () => {
    test("computes minimal greedy transfer plan from balances", () => {
      const transfers = computeSettlementTransfers([
        { participantId: "a", nama: "Andi", balance: 150000 },
        { participantId: "b", nama: "Budi", balance: -100000 },
        { participantId: "c", nama: "Caca", balance: -50000 },
      ]);

      assert.equal(transfers.length, 2);
      assert.deepEqual(transfers[0], {
        fromParticipantId: "b",
        fromName: "Budi",
        toParticipantId: "a",
        toName: "Andi",
        amountIdr: 100000,
      });
      assert.deepEqual(transfers[1], {
        fromParticipantId: "c",
        fromName: "Caca",
        toParticipantId: "a",
        toName: "Andi",
        amountIdr: 50000,
      });
    });

    test("returns empty list when all balances are settled", () => {
      const transfers = computeSettlementTransfers([
        { participantId: "a", nama: "Andi", balance: 0 },
        { participantId: "b", nama: "Budi", balance: 0 },
      ]);
      assert.equal(transfers.length, 0);
    });
  });
});
