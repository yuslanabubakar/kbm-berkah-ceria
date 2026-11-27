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

  test("v2 Townhall PK: splits 50% driver discount across 2 drivers in one car (@25% each) and 3 drivers (@50%/3)", async () => {
    const tripId = "trip-v2-multi-driver";
    await db.insert(trips).values({
      id: tripId,
      name: "Trip V2 Multi Driver",
      startDate: "2026-12-01",
      ruleVersion: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const d1 = "d1";
    const d2 = "d2";
    const d3 = "d3";
    const p1 = "p1";
    await db.insert(participants).values([
      {
        id: d1,
        tripId,
        displayName: "Supir 1",
        isDriver: true,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: d2,
        tripId,
        displayName: "Supir 2",
        isDriver: true,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: d3,
        tripId,
        displayName: "Supir 3",
        isDriver: true,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: p1,
        tripId,
        displayName: "Penumpang 1",
        isDriver: false,
        role: "member",
        joinedAt: new Date().toISOString(),
      },
    ]);

    const leg1 = "leg-1";
    const leg2 = "leg-2";
    await db.insert(tripLegs).values([
      {
        id: leg1,
        tripId,
        legOrder: 1,
        startDatetime: "2026-12-01T08:00:00.000Z",
        origin: "Bandung",
        destination: "Jakarta",
        createdAt: new Date().toISOString(),
      },
      {
        id: leg2,
        tripId,
        legOrder: 2,
        startDatetime: "2026-12-04T16:00:00.000Z",
        origin: "Jakarta",
        destination: "Bandung",
        createdAt: new Date().toISOString(),
      },
    ]);

    const veh1 = "veh-1";
    await db.insert(fleetVehicles).values({
      id: veh1,
      tripId,
      label: "Innova",
      createdAt: new Date().toISOString(),
    });

    await db.insert(legVehicleLinks).values([
      {
        id: "lvl-1",
        tripId,
        legId: leg1,
        vehicleId: veh1,
        createdAt: new Date().toISOString(),
      },
      {
        id: "lvl-2",
        tripId,
        legId: leg2,
        vehicleId: veh1,
        createdAt: new Date().toISOString(),
      },
    ]);

    // Leg 1: 2 drivers (d1, d2 -> 0.75 each) + 2 passengers (d3, p1 -> 1.0 each). Total weight = 3.5
    // Leg 2: 3 drivers (d1, d2, d3 -> 5/6 each) + 1 passenger (p1 -> 1.0). Total weight = 3.5
    // Everyone joins both legs (PP) -> no single trip bonus.
    await db.insert(vehicleAssignments).values([
      {
        id: "va-1",
        legId: leg1,
        vehicleId: veh1,
        participantId: d1,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-2",
        legId: leg1,
        vehicleId: veh1,
        participantId: d2,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-3",
        legId: leg1,
        vehicleId: veh1,
        participantId: d3,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-4",
        legId: leg1,
        vehicleId: veh1,
        participantId: p1,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-5",
        legId: leg2,
        vehicleId: veh1,
        participantId: d1,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-6",
        legId: leg2,
        vehicleId: veh1,
        participantId: d2,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-7",
        legId: leg2,
        vehicleId: veh1,
        participantId: d3,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-8",
        legId: leg2,
        vehicleId: veh1,
        participantId: p1,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
    ]);

    // Leg 1 expense: Rp 350.000 -> weight 3.5 -> 100k per 1.0 weight
    //   d1 = 75k, d2 = 75k, d3 = 100k, p1 = 100k
    // Leg 2 expense: Rp 210.000 -> weight 3.5 -> 60k per 1.0 weight
    //   d1 = 50k (5/6 * 60k), d2 = 50k, d3 = 50k, p1 = 60k
    await db.insert(expenses).values([
      {
        id: "exp-l1",
        tripId,
        legId: leg1,
        vehicleId: veh1,
        paidBy: d1,
        title: "BBM Pergi",
        amountIdr: 350000,
        issuedAt: "2026-12-01T09:00:00.000Z",
        shareScope: "leg",
        createdAt: new Date().toISOString(),
      },
      {
        id: "exp-l2",
        tripId,
        legId: leg2,
        vehicleId: veh1,
        paidBy: p1,
        title: "BBM Pulang",
        amountIdr: 210000,
        issuedAt: "2026-12-04T17:00:00.000Z",
        shareScope: "leg",
        createdAt: new Date().toISOString(),
      },
    ]);

    const detail = await fetchTripDetail(tripId);
    assert.ok(detail);
    assert.equal(detail.trip.ruleVersion, 2);

    const balD1 = detail.balances.find((b) => b.participantId === d1);
    const balD2 = detail.balances.find((b) => b.participantId === d2);
    const balD3 = detail.balances.find((b) => b.participantId === d3);
    const balP1 = detail.balances.find((b) => b.participantId === p1);

    assert.ok(Math.abs((balD1?.totalShare ?? 0) - 125000) < 0.01); // 75k + 50k
    assert.ok(Math.abs((balD2?.totalShare ?? 0) - 125000) < 0.01); // 75k + 50k
    assert.ok(Math.abs((balD3?.totalShare ?? 0) - 150000) < 0.01); // 100k + 50k
    assert.ok(Math.abs((balP1?.totalShare ?? 0) - 160000) < 0.01); // 100k + 60k
  });

  test("v2 Townhall PK: applies +0.1 single-trip fee for departure/return-only participants (including drivers) and ignores manual food splits", async () => {
    const tripId = "trip-v2-single-trip";
    await db.insert(trips).values({
      id: tripId,
      name: "Trip V2 Single Trip Fee",
      startDate: "2026-12-01",
      ruleVersion: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const pDriverSingle = "p-driver-single";
    const pPassPP = "p-pass-pp";
    const pPassSingle = "p-pass-single";
    const pDriverReturn = "p-driver-return";

    await db.insert(participants).values([
      {
        id: pDriverSingle,
        tripId,
        displayName: "Supir Pergi Saja",
        isDriver: true,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: pPassPP,
        tripId,
        displayName: "Penumpang PP",
        isDriver: false,
        role: "member",
        joinedAt: new Date().toISOString(),
      },
      {
        id: pPassSingle,
        tripId,
        displayName: "Penumpang Pergi Saja",
        isDriver: false,
        role: "member",
        joinedAt: new Date().toISOString(),
      },
      {
        id: pDriverReturn,
        tripId,
        displayName: "Supir Pulang Saja",
        isDriver: true,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
    ]);

    const leg1 = "leg-1";
    const leg2 = "leg-2";
    await db.insert(tripLegs).values([
      {
        id: leg1,
        tripId,
        legOrder: 1,
        startDatetime: "2026-12-01T08:00:00.000Z",
        origin: "Bandung",
        destination: "Jakarta",
        createdAt: new Date().toISOString(),
      },
      {
        id: leg2,
        tripId,
        legOrder: 2,
        startDatetime: "2026-12-04T16:00:00.000Z",
        origin: "Jakarta",
        destination: "Bandung",
        createdAt: new Date().toISOString(),
      },
    ]);

    const veh1 = "veh-1";
    await db.insert(fleetVehicles).values({
      id: veh1,
      tripId,
      label: "Avanza",
      createdAt: new Date().toISOString(),
    });

    // Leg 1: pDriverSingle (driver, single -> 0.5 + 0.1 = 0.6), pPassPP (passenger, PP -> 1.0), pPassSingle (passenger, single -> 1.1)
    //   Total Leg 1 weight = 0.6 + 1.0 + 1.1 = 2.7
    // Leg 2: pDriverReturn (driver, single -> 0.5 + 0.1 = 0.6), pPassPP (passenger, PP -> 1.0)
    //   Total Leg 2 weight = 0.6 + 1.0 = 1.6
    await db.insert(vehicleAssignments).values([
      {
        id: "va-1",
        legId: leg1,
        vehicleId: veh1,
        participantId: pDriverSingle,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-2",
        legId: leg1,
        vehicleId: veh1,
        participantId: pPassPP,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-3",
        legId: leg1,
        vehicleId: veh1,
        participantId: pPassSingle,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-4",
        legId: leg2,
        vehicleId: veh1,
        participantId: pDriverReturn,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-5",
        legId: leg2,
        vehicleId: veh1,
        participantId: pPassPP,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
    ]);

    // Leg 1 Tol: Rp 270.000 -> pDriverSingle: 60k, pPassPP: 100k, pPassSingle: 110k
    // Leg 1 Makan (manual food stop): Rp 90.000 -> pPassPP: 40k, pPassSingle: 50k (exact override, no +0.1)
    // Leg 2 Tol: Rp 160.000 -> pDriverReturn: 60k, pPassPP: 100k
    await db.insert(expenses).values([
      {
        id: "exp-l1-tol",
        tripId,
        legId: leg1,
        vehicleId: veh1,
        paidBy: pPassPP,
        title: "Tol Pergi",
        amountIdr: 270000,
        issuedAt: "2026-12-01T09:00:00.000Z",
        shareScope: "leg",
        createdAt: new Date().toISOString(),
      },
      {
        id: "exp-l1-makan",
        tripId,
        legId: leg1,
        vehicleId: veh1,
        paidBy: pPassPP,
        title: "Makan Rest Area",
        expenseType: "makan",
        amountIdr: 90000,
        issuedAt: "2026-12-01T11:00:00.000Z",
        shareScope: "vehicle",
        createdAt: new Date().toISOString(),
      },
      {
        id: "exp-l2-tol",
        tripId,
        legId: leg2,
        vehicleId: veh1,
        paidBy: pDriverReturn,
        title: "Tol Pulang",
        amountIdr: 160000,
        issuedAt: "2026-12-04T17:00:00.000Z",
        shareScope: "leg",
        createdAt: new Date().toISOString(),
      },
    ]);

    await db.insert(expenseSplits).values([
      {
        id: "sp-1",
        expenseId: "exp-l1-makan",
        participantId: pPassPP,
        shareAmountOverride: 40000,
        createdAt: new Date().toISOString(),
      },
      {
        id: "sp-2",
        expenseId: "exp-l1-makan",
        participantId: pPassSingle,
        shareAmountOverride: 50000,
        createdAt: new Date().toISOString(),
      },
    ]);

    const detail = await fetchTripDetail(tripId);
    assert.ok(detail);

    // Check participant single-trip flags
    const metaById = new Map(detail.participants.map((p) => [p.id, p]));
    assert.equal(metaById.get(pDriverSingle)?.isSingleTrip, true);
    assert.equal(metaById.get(pPassSingle)?.isSingleTrip, true);
    assert.equal(metaById.get(pDriverReturn)?.isSingleTrip, true);
    assert.equal(metaById.get(pPassPP)?.isSingleTrip, false);

    // Check shares
    const balDriverSingle = detail.balances.find(
      (b) => b.participantId === pDriverSingle,
    );
    const balPassPP = detail.balances.find((b) => b.participantId === pPassPP);
    const balPassSingle = detail.balances.find(
      (b) => b.participantId === pPassSingle,
    );
    const balDriverReturn = detail.balances.find(
      (b) => b.participantId === pDriverReturn,
    );

    assert.ok(Math.abs((balDriverSingle?.totalShare ?? 0) - 60000) < 0.01);
    assert.ok(Math.abs((balPassPP?.totalShare ?? 0) - 240000) < 0.01); // 100k + 40k + 100k
    assert.ok(Math.abs((balPassSingle?.totalShare ?? 0) - 160000) < 0.01); // 110k + 50k
    assert.ok(Math.abs((balDriverReturn?.totalShare ?? 0) - 60000) < 0.01);
  });

  test("v1 legacy trips preserve old calculation rules (2 drivers each 0.5, no single-trip fee)", async () => {
    const tripId = "trip-v1-legacy";
    await db.insert(trips).values({
      id: tripId,
      name: "Trip Historis V1",
      startDate: "2026-01-10",
      ruleVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const d1 = "d1";
    const d2 = "d2";
    const pSingle = "p-single";
    await db.insert(participants).values([
      {
        id: d1,
        tripId,
        displayName: "Supir 1",
        isDriver: true,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: d2,
        tripId,
        displayName: "Supir 2",
        isDriver: true,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: pSingle,
        tripId,
        displayName: "Penumpang 1 Arah",
        isDriver: false,
        role: "member",
        joinedAt: new Date().toISOString(),
      },
    ]);

    const leg1 = "leg-1";
    const leg2 = "leg-2";
    await db.insert(tripLegs).values([
      {
        id: leg1,
        tripId,
        legOrder: 1,
        startDatetime: "2026-01-10T08:00:00.000Z",
        createdAt: new Date().toISOString(),
      },
      {
        id: leg2,
        tripId,
        legOrder: 2,
        startDatetime: "2026-01-12T17:00:00.000Z",
        createdAt: new Date().toISOString(),
      },
    ]);

    const veh1 = "veh-1";
    await db.insert(fleetVehicles).values({
      id: veh1,
      tripId,
      label: "Avanza",
      createdAt: new Date().toISOString(),
    });

    await db.insert(vehicleAssignments).values([
      {
        id: "va-1",
        legId: leg1,
        vehicleId: veh1,
        participantId: d1,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-2",
        legId: leg1,
        vehicleId: veh1,
        participantId: d2,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-3",
        legId: leg1,
        vehicleId: veh1,
        participantId: pSingle,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-4",
        legId: leg2,
        vehicleId: veh1,
        participantId: d1,
        role: "driver",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-5",
        legId: leg2,
        vehicleId: veh1,
        participantId: d2,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
    ]);

    // Legacy v1 on Leg 1: d1 = 0.5, d2 = 0.5, pSingle = 1.0 -> total weight = 2.0
    await db.insert(expenses).values({
      id: "exp-v1",
      tripId,
      legId: leg1,
      vehicleId: veh1,
      paidBy: d1,
      title: "Tol Historis",
      amountIdr: 200000,
      issuedAt: "2026-01-10T09:00:00.000Z",
      shareScope: "leg",
      createdAt: new Date().toISOString(),
    });

    const detail = await fetchTripDetail(tripId);
    assert.ok(detail);
    assert.equal(detail.trip.ruleVersion, 1);

    const balD1 = detail.balances.find((b) => b.participantId === d1);
    const balD2 = detail.balances.find((b) => b.participantId === d2);
    const balPSingle = detail.balances.find((b) => b.participantId === pSingle);

    assert.equal(balD1?.totalShare, 50000);
    assert.equal(balD2?.totalShare, 50000);
    assert.equal(balPSingle?.totalShare, 100000);
    assert.equal(
      detail.participants.find((p) => p.id === pSingle)?.isSingleTrip,
      false,
    );
  });

  test("v2 Townhall PK: participant departing in Car A and returning in Car B is NOT charged single-trip fee", async () => {
    const tripId = "trip-v2-cross-car-pp";
    await db.insert(trips).values({
      id: tripId,
      name: "Trip V2 Lintas Mobil PP",
      startDate: "2026-12-01",
      ruleVersion: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const pSwitchCar = "p-switch-car";
    const pSameCarPP = "p-same-car-pp";
    const pSingle = "p-single-car-a";

    await db.insert(participants).values([
      {
        id: pSwitchCar,
        tripId,
        displayName: "Pindah Mobil PP",
        isDriver: false,
        role: "member",
        joinedAt: new Date().toISOString(),
      },
      {
        id: pSameCarPP,
        tripId,
        displayName: "Tetap Mobil A PP",
        isDriver: false,
        role: "member",
        joinedAt: new Date().toISOString(),
      },
      {
        id: pSingle,
        tripId,
        displayName: "Single Trip A",
        isDriver: false,
        role: "member",
        joinedAt: new Date().toISOString(),
      },
    ]);

    const leg1 = "leg-1";
    const leg2 = "leg-2";
    await db.insert(tripLegs).values([
      {
        id: leg1,
        tripId,
        legOrder: 1,
        startDatetime: "2026-12-01T08:00:00.000Z",
        origin: "Bandung",
        destination: "Jakarta",
        createdAt: new Date().toISOString(),
      },
      {
        id: leg2,
        tripId,
        legOrder: 2,
        startDatetime: "2026-12-04T16:00:00.000Z",
        origin: "Jakarta",
        destination: "Bandung",
        createdAt: new Date().toISOString(),
      },
    ]);

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

    // pSwitchCar departs in Mobil A (leg1), returns in Mobil B (leg2) -> PP (weight 1.0, NOT 1.1)
    // pSameCarPP departs in Mobil A (leg1), returns in Mobil A (leg2) -> PP (weight 1.0)
    // pSingle departs in Mobil A (leg1) only -> Single Trip (weight 1.1)
    await db.insert(vehicleAssignments).values([
      {
        id: "va-1",
        legId: leg1,
        vehicleId: vehA,
        participantId: pSwitchCar,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-2",
        legId: leg1,
        vehicleId: vehA,
        participantId: pSameCarPP,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-3",
        legId: leg1,
        vehicleId: vehA,
        participantId: pSingle,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-4",
        legId: leg2,
        vehicleId: vehB,
        participantId: pSwitchCar,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "va-5",
        legId: leg2,
        vehicleId: vehA,
        participantId: pSameCarPP,
        role: "passenger",
        joinedAt: new Date().toISOString(),
      },
    ]);

    // Leg 1 Vehicle A expense: Rp 310.000
    // Weights: pSwitchCar = 1.0, pSameCarPP = 1.0, pSingle = 1.1 -> total = 3.1
    await db.insert(expenses).values({
      id: "exp-l1-veh-a",
      tripId,
      legId: leg1,
      vehicleId: vehA,
      paidBy: pSameCarPP,
      title: "BBM Mobil A",
      amountIdr: 310000,
      issuedAt: "2026-12-01T09:00:00.000Z",
      shareScope: "vehicle",
      createdAt: new Date().toISOString(),
    });

    const detail = await fetchTripDetail(tripId);
    assert.ok(detail);

    const metaById = new Map(detail.participants.map((p) => [p.id, p]));
    assert.equal(metaById.get(pSwitchCar)?.isSingleTrip, false);
    assert.equal(metaById.get(pSameCarPP)?.isSingleTrip, false);
    assert.equal(metaById.get(pSingle)?.isSingleTrip, true);

    const balSwitch = detail.balances.find(
      (b) => b.participantId === pSwitchCar,
    );
    const balSame = detail.balances.find((b) => b.participantId === pSameCarPP);
    const balSingle = detail.balances.find((b) => b.participantId === pSingle);

    assert.ok(Math.abs((balSwitch?.totalShare ?? 0) - 100000) < 0.01);
    assert.ok(Math.abs((balSame?.totalShare ?? 0) - 100000) < 0.01);
    assert.ok(Math.abs((balSingle?.totalShare ?? 0) - 110000) < 0.01);

    // Also verify breakdown & settlement transfers are populated
    assert.equal(balSingle?.breakdown.length, 1);
    assert.equal(balSingle?.breakdown[0].isSingleTripApplied, true);
    assert.equal(balSwitch?.breakdown[0].isSingleTripApplied, false);
    assert.equal(detail.transfers.length, 2);
  });
});
