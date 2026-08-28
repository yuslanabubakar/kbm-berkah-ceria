import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { POST as addVehicle } from "../../app/api/trips/[tripId]/vehicles/route";
import { POST as assignVehicle } from "../../app/api/trips/[tripId]/vehicles/[vehicleId]/assignments/route";
import { setupTestDb, clearTestDb } from "../helpers/testDb";
import {
  TEST_USER_1,
  getAuthHeaders,
  createJsonRequest,
} from "../helpers/authHelper";
import {
  trips,
  tripLegs,
  fleetVehicles,
  legVehicleLinks,
  participants,
  users,
} from "@/db/schema";

describe("API: /api/trips/[tripId]/vehicles", () => {
  let db: ReturnType<typeof setupTestDb>;
  const tripId = "trip-veh-test";

  beforeEach(async () => {
    db = setupTestDb();
    clearTestDb();

    await db.insert(users).values({
      id: TEST_USER_1.id,
      email: TEST_USER_1.email,
      name: TEST_USER_1.name,
      createdAt: new Date().toISOString(),
    });

    await db.insert(trips).values({
      id: tripId,
      ownerId: TEST_USER_1.id,
      name: "Trip Vehicle Test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  test("POST /api/trips/[tripId]/vehicles adds fleet vehicle", async () => {
    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      `https://example.com/api/trips/${tripId}/vehicles`,
      "POST",
      {
        label: "Hiace Commuter",
        plateNumber: "B 1234 CD",
        seatCapacity: 14,
      },
      headers,
    );

    const res = await addVehicle(req, { params: { tripId } });
    assert.equal(res.status, 201);

    const body = await res.json();
    assert.ok(body.data.vehicleId);
  });

  test("POST /api/trips/[tripId]/vehicles/[vehicleId]/assignments assigns participants", async () => {
    const legId = "leg-veh-1";
    const vehicleId = "veh-test-1";
    const participantId = "part-veh-1";

    await db.insert(tripLegs).values({
      id: legId,
      tripId,
      legOrder: 1,
      startDatetime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    await db.insert(fleetVehicles).values({
      id: vehicleId,
      tripId,
      label: "Avanza Silver",
      createdAt: new Date().toISOString(),
    });

    await db.insert(legVehicleLinks).values({
      id: "link-veh-1",
      tripId,
      legId,
      vehicleId,
      createdAt: new Date().toISOString(),
    });

    await db.insert(participants).values({
      id: participantId,
      tripId,
      displayName: "Supir Avanza",
      joinedAt: new Date().toISOString(),
    });

    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      `https://example.com/api/trips/${tripId}/vehicles/${vehicleId}/assignments`,
      "POST",
      {
        legId,
        assignments: [{ participantId, role: "driver" }],
      },
      headers,
    );

    const res = await assignVehicle(req, { params: { tripId, vehicleId } });
    assert.equal(res.status, 200);
  });
});
