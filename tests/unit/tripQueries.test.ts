import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { fetchTripDetail, fetchTripsSummary } from "@/lib/tripQueries";
import { setupTestDb, clearTestDb } from "../helpers/testDb";
import {
  users,
  trips,
  participants,
  tripLegs,
  fleetVehicles,
  legVehicleLinks,
  vehicleAssignments,
  expenses,
  expenseSplits,
  balanceAdjustments,
} from "@/db/schema";
import { TEST_USER_1 } from "../helpers/authHelper";

describe("tripQueries & Settlement Engine", () => {
  let db: ReturnType<typeof setupTestDb>;

  beforeEach(() => {
    db = setupTestDb();
    clearTestDb();
  });

  test("calculates driver discount (0.5 weight) vs member (1.0 weight) correctly", async () => {
    // 1. Setup User & Trip
    await db.insert(users).values({
      id: TEST_USER_1.id,
      email: TEST_USER_1.email,
      name: TEST_USER_1.name,
      createdAt: new Date().toISOString(),
    });

    const tripId = "trip-test-1";
    await db.insert(trips).values({
      id: tripId,
      ownerId: TEST_USER_1.id,
      name: "Trip Jakarta - Bandung",
      startDate: "2026-08-20",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Setup Participants (1 driver, 1 passenger)
    const driverId = "p-driver";
    const passengerId = "p-passenger";
    await db.insert(participants).values([
      {
        id: driverId,
        tripId,
        displayName: "Supir Irfan",
        isDriver: true,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: passengerId,
        tripId,
        displayName: "Penumpang Yuslan",
        isDriver: false,
        role: "member",
        joinedAt: new Date().toISOString(),
      },
    ]);

    // 3. Setup Leg
    const legId = "leg-1";
    await db.insert(tripLegs).values({
      id: legId,
      tripId,
      legOrder: 1,
      startDatetime: "2026-08-20T08:00:00.000Z",
      origin: "Jakarta",
      destination: "Bandung",
      createdAt: new Date().toISOString(),
    });

    // 4. Setup Vehicle & Assignments
    const vehicleId = "veh-1";
    await db.insert(fleetVehicles).values({
      id: vehicleId,
      tripId,
      label: "Avanza",
      createdAt: new Date().toISOString(),
    });

    await db.insert(legVehicleLinks).values({
      id: "link-1",
      tripId,
      legId,
      vehicleId,
      createdAt: new Date().toISOString(),
    });

    await db.insert(vehicleAssignments).values([
      {
        id: "va-1",
        legId,
        vehicleId,
        participantId: driverId,
        role: "driver", // gets 0.5 weight
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-2",
        legId,
        vehicleId,
        participantId: passengerId,
        role: "passenger", // gets 1.0 weight
        joinedAt: new Date().toISOString(),
      },
    ]);

    // 5. Setup Expense: Tol Rp 150.000 paid by Driver
    // Total weight = 0.5 (driver) + 1.0 (passenger) = 1.5
    // Driver share = 150.000 * (0.5 / 1.5) = 50.000
    // Passenger share = 150.000 * (1.0 / 1.5) = 100.000
    await db.insert(expenses).values({
      id: "exp-1",
      tripId,
      legId,
      vehicleId,
      paidBy: driverId,
      title: "Tol Cipularang",
      amountIdr: 150000,
      issuedAt: "2026-08-20T09:00:00.000Z",
      shareScope: "leg",
      createdAt: new Date().toISOString(),
    });

    const detail = await fetchTripDetail(tripId);
    assert.ok(detail);

    const driverBal = detail.balances.find((b) => b.participantId === driverId);
    const passengerBal = detail.balances.find(
      (b) => b.participantId === passengerId,
    );

    assert.ok(driverBal);
    assert.ok(passengerBal);

    assert.equal(driverBal.totalPaid, 150000);
    assert.equal(driverBal.totalShare, 50000);
    assert.equal(driverBal.balance, 100000); // Driver should receive 100k

    assert.equal(passengerBal.totalPaid, 0);
    assert.equal(passengerBal.totalShare, 100000);
    assert.equal(passengerBal.balance, -100000); // Passenger should pay 100k
  });

  test("handles vehicle-scoped expenses properly", async () => {
    const tripId = "trip-test-2";
    await db.insert(trips).values({
      id: tripId,
      name: "Trip 2 Mobil",
      startDate: "2026-08-20",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const pCarA = "p-cara";
    const pCarB = "p-carb";
    await db.insert(participants).values([
      {
        id: pCarA,
        tripId,
        displayName: "Orang Mobil A",
        isDriver: false,
        joinedAt: new Date().toISOString(),
      },
      {
        id: pCarB,
        tripId,
        displayName: "Orang Mobil B",
        isDriver: false,
        joinedAt: new Date().toISOString(),
      },
    ]);

    const legId = "leg-1";
    await db.insert(tripLegs).values({
      id: legId,
      tripId,
      legOrder: 1,
      startDatetime: "2026-08-20T08:00:00.000Z",
      createdAt: new Date().toISOString(),
    });

    const vehA = "veh-a";
    const vehB = "veh-b";
    await db.insert(fleetVehicles).values([
      {
        id: vehA,
        tripId,
        label: "Mobil A",
        createdAt: new Date().toISOString(),
      },
      {
        id: vehB,
        tripId,
        label: "Mobil B",
        createdAt: new Date().toISOString(),
      },
    ]);

    await db.insert(vehicleAssignments).values([
      {
        id: "va-a",
        legId,
        vehicleId: vehA,
        participantId: pCarA,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-b",
        legId,
        vehicleId: vehB,
        participantId: pCarB,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
    ]);

    // Bensin Mobil A Rp 200.000 paid by Orang Mobil A, scoped to vehicle vehA only
    await db.insert(expenses).values({
      id: "exp-a",
      tripId,
      legId,
      vehicleId: vehA,
      paidBy: pCarA,
      title: "Bensin Mobil A",
      amountIdr: 200000,
      issuedAt: "2026-08-20T08:30:00.000Z",
      shareScope: "vehicle",
      createdAt: new Date().toISOString(),
    });

    const detail = await fetchTripDetail(tripId);
    assert.ok(detail);

    const balA = detail.balances.find((b) => b.participantId === pCarA);
    const balB = detail.balances.find((b) => b.participantId === pCarB);

    assert.equal(balA?.totalShare, 200000);
    assert.equal(balB?.totalShare, 0); // Car B participant does not pay for Car A bensin
  });

  test("handles manual split overrides and balance adjustments", async () => {
    const tripId = "trip-test-3";
    await db.insert(trips).values({
      id: tripId,
      name: "Trip Custom Split",
      startDate: "2026-08-20",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const p1 = "p1";
    const p2 = "p2";
    await db.insert(participants).values([
      {
        id: p1,
        tripId,
        displayName: "Peserta 1",
        joinedAt: new Date().toISOString(),
      },
      {
        id: p2,
        tripId,
        displayName: "Peserta 2",
        joinedAt: new Date().toISOString(),
      },
    ]);

    const legId = "leg-1";
    await db.insert(tripLegs).values({
      id: legId,
      tripId,
      legOrder: 1,
      startDatetime: "2026-08-20T08:00:00.000Z",
      createdAt: new Date().toISOString(),
    });

    // Makan Malam Rp 100.000 paid by p1 with manual splits: p1: 30k, p2: 70k
    const expId = "exp-manual";
    await db.insert(expenses).values({
      id: expId,
      tripId,
      legId,
      paidBy: p1,
      title: "Makan Malam",
      amountIdr: 100000,
      issuedAt: "2026-08-20T19:00:00.000Z",
      createdAt: new Date().toISOString(),
    });

    await db.insert(expenseSplits).values([
      {
        id: "s1",
        expenseId: expId,
        participantId: p1,
        shareAmountOverride: 30000,
        createdAt: new Date().toISOString(),
      },
      {
        id: "s2",
        expenseId: expId,
        participantId: p2,
        shareAmountOverride: 70000,
        createdAt: new Date().toISOString(),
      },
    ]);

    // Add Balance Adjustment: Applied discount/cashback +20.000 for p2
    await db.insert(balanceAdjustments).values({
      id: "adj-1",
      tripId,
      participantId: p2,
      amountIdr: 20000,
      status: "applied", // only applied counts
      createdAt: new Date().toISOString(),
      appliedAt: new Date().toISOString(),
    });

    // Add Draft Adjustment: should NOT affect balance
    await db.insert(balanceAdjustments).values({
      id: "adj-draft",
      tripId,
      participantId: p2,
      amountIdr: 50000,
      status: "draft",
      createdAt: new Date().toISOString(),
    });

    const detail = await fetchTripDetail(tripId);
    assert.ok(detail);

    const bal1 = detail.balances.find((b) => b.participantId === p1);
    const bal2 = detail.balances.find((b) => b.participantId === p2);

    assert.equal(bal1?.totalShare, 30000);
    assert.equal(bal2?.totalShare, 70000);

    assert.equal(bal2?.adjustments, 20000);
    // bal2.balance = totalPaid (0) + adjustments (20000) - totalShare (70000) = -50000
    assert.equal(bal2?.balance, -50000);
  });
});
