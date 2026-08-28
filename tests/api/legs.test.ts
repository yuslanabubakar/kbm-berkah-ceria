import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { POST as addLeg } from "../../app/api/trips/[tripId]/legs/route";
import { PATCH as updateLeg } from "../../app/api/trips/[tripId]/legs/[legId]/route";
import { setupTestDb, clearTestDb } from "../helpers/testDb";
import {
  TEST_USER_1,
  getAuthHeaders,
  createJsonRequest,
} from "../helpers/authHelper";
import { trips, tripLegs, users } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("API: /api/trips/[tripId]/legs", () => {
  let db: ReturnType<typeof setupTestDb>;
  const tripId = "trip-leg-test";

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
      name: "Trip Leg Test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  test("POST /api/trips/[tripId]/legs adds leg", async () => {
    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      `https://example.com/api/trips/${tripId}/legs`,
      "POST",
      {
        origin: "Jakarta",
        destination: "Cirebon",
        startDate: "2026-08-25",
        startTime: "07:30",
        notes: "Rest area km 57",
      },
      headers,
    );

    const res = await addLeg(req, { params: { tripId } });
    assert.equal(res.status, 201);

    const body = await res.json();
    assert.ok(body.data.legId);
    assert.equal(body.data.order, 1);
  });

  test("PATCH /api/trips/[tripId]/legs/[legId] updates leg details", async () => {
    const legId = "leg-1";
    await db.insert(tripLegs).values({
      id: legId,
      tripId,
      legOrder: 1,
      origin: "Jakarta",
      destination: "Cirebon",
      startDatetime: "2026-08-25T07:30:00.000Z",
      createdAt: new Date().toISOString(),
    });

    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      `https://example.com/api/trips/${tripId}/legs/${legId}`,
      "PATCH",
      { origin: "Jakarta Selatan", destination: "Cirebon Barat" },
      headers,
    );

    const res = await updateLeg(req, { params: { tripId, legId } });
    assert.equal(res.status, 200);

    const updated = await db
      .select()
      .from(tripLegs)
      .where(eq(tripLegs.id, legId))
      .get();
    assert.equal(updated?.origin, "Jakarta Selatan");
    assert.equal(updated?.destination, "Cirebon Barat");
  });
});
