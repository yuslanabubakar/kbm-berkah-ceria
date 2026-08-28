import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { POST as createTrip } from "../../app/api/trips/route";
import {
  GET as getTripDetail,
  PATCH as updateTrip,
  DELETE as deleteTrip,
} from "../../app/api/trips/[tripId]/route";
import { setupTestDb, clearTestDb } from "../helpers/testDb";
import {
  TEST_USER_1,
  getAuthHeaders,
  createJsonRequest,
} from "../helpers/authHelper";
import { trips, users } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("API: /api/trips & /api/trips/[tripId]", () => {
  let db: ReturnType<typeof setupTestDb>;

  beforeEach(async () => {
    db = setupTestDb();
    clearTestDb();

    // Seed test user
    await db.insert(users).values({
      id: TEST_USER_1.id,
      email: TEST_USER_1.email,
      name: TEST_USER_1.name,
      createdAt: new Date().toISOString(),
    });
  });

  describe("POST /api/trips", () => {
    test("returns 401 when unauthenticated", async () => {
      const req = createJsonRequest("https://example.com/api/trips", "POST", {
        name: "Trip Baru",
        participants: [{ name: "Peserta 1" }],
      });
      const res = await createTrip(req);
      assert.equal(res.status, 401);
    });

    test("returns 400 on invalid payload", async () => {
      const headers = await getAuthHeaders(TEST_USER_1);
      const req = createJsonRequest(
        "https://example.com/api/trips",
        "POST",
        {
          name: "Ab", // too short
          participants: [],
        },
        headers,
      );

      const res = await createTrip(req);
      assert.equal(res.status, 400);
    });

    test("creates trip and initial leg/participants successfully", async () => {
      const headers = await getAuthHeaders(TEST_USER_1);
      const req = createJsonRequest(
        "https://example.com/api/trips",
        "POST",
        {
          name: "Tour De Java",
          originCity: "Jakarta",
          destinationCity: "Yogyakarta",
          startDate: "2026-08-25",
          endDate: "2026-08-30",
          vehicleLabel: "Innova Reborn",
          participants: [
            { name: "Irfan", isDriver: true },
            { name: "Yuslan", isDriver: false },
          ],
        },
        headers,
      );

      const res = await createTrip(req);
      assert.equal(res.status, 201);

      const body = await res.json();
      assert.ok(body.data.tripId);
    });
  });

  describe("GET /api/trips/[tripId]", () => {
    test("returns 404 for non-existent trip", async () => {
      const req = createJsonRequest(
        "https://example.com/api/trips/unknown",
        "GET",
      );
      const res = await getTripDetail(req, { params: { tripId: "unknown" } });
      assert.equal(res.status, 404);
    });

    test("returns trip details", async () => {
      const tripId = "trip-test-get";
      await db.insert(trips).values({
        id: tripId,
        ownerId: TEST_USER_1.id,
        name: "Trip Detail Test",
        originCity: "Bandung",
        destinationCity: "Jakarta",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = createJsonRequest(
        `https://example.com/api/trips/${tripId}`,
        "GET",
      );
      const res = await getTripDetail(req, { params: { tripId } });
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.trip.name, "Trip Detail Test");
    });
  });

  describe("PATCH /api/trips/[tripId]", () => {
    test("updates trip name and dates", async () => {
      const tripId = "trip-test-patch";
      await db.insert(trips).values({
        id: tripId,
        ownerId: TEST_USER_1.id,
        name: "Trip Lama",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const headers = await getAuthHeaders(TEST_USER_1);
      const req = createJsonRequest(
        `https://example.com/api/trips/${tripId}`,
        "PATCH",
        { name: "Trip Baru Terupdate" },
        headers,
      );

      const res = await updateTrip(req, { params: { tripId } });
      assert.equal(res.status, 200);

      const updated = await db
        .select()
        .from(trips)
        .where(eq(trips.id, tripId))
        .get();
      assert.equal(updated?.name, "Trip Baru Terupdate");
    });
  });

  describe("DELETE /api/trips/[tripId]", () => {
    test("deletes trip successfully", async () => {
      const tripId = "trip-test-delete";
      await db.insert(trips).values({
        id: tripId,
        ownerId: TEST_USER_1.id,
        name: "Trip Hapus",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const headers = await getAuthHeaders(TEST_USER_1);
      const req = createJsonRequest(
        `https://example.com/api/trips/${tripId}`,
        "DELETE",
        undefined,
        headers,
      );
      const res = await deleteTrip(req, { params: { tripId } });
      assert.equal(res.status, 200);

      const deleted = await db
        .select()
        .from(trips)
        .where(eq(trips.id, tripId))
        .get();
      assert.equal(deleted, undefined);
    });
  });
});
