import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  POST as shareTrip,
  GET as getShares,
} from "../../app/api/trips/[tripId]/shares/route";
import { DELETE as deleteShare } from "../../app/api/trips/[tripId]/shares/[shareId]/route";
import { setupTestDb, clearTestDb } from "../helpers/testDb";
import {
  TEST_USER_1,
  TEST_USER_2,
  getAuthHeaders,
  createJsonRequest,
} from "../helpers/authHelper";
import { trips, tripShares, users } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("API: /api/trips/[tripId]/shares", () => {
  let db: ReturnType<typeof setupTestDb>;
  const tripId = "trip-share-test";

  beforeEach(async () => {
    db = setupTestDb();
    clearTestDb();

    await db.insert(users).values([
      {
        id: TEST_USER_1.id,
        email: TEST_USER_1.email,
        name: TEST_USER_1.name,
        createdAt: new Date().toISOString(),
      },
      {
        id: TEST_USER_2.id,
        email: TEST_USER_2.email,
        name: TEST_USER_2.name,
        createdAt: new Date().toISOString(),
      },
    ]);

    await db.insert(trips).values({
      id: tripId,
      ownerId: TEST_USER_1.id,
      name: "Trip Share Test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  test("POST /api/trips/[tripId]/shares shares trip with email", async () => {
    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      `https://example.com/api/trips/${tripId}/shares`,
      "POST",
      { email: TEST_USER_2.email },
      headers,
    );

    const res = await shareTrip(req, { params: { tripId } });
    assert.equal(res.status, 201);

    const body = await res.json();
    assert.ok(body.data.id);
  });

  test("GET /api/trips/[tripId]/shares lists trip shares", async () => {
    await db.insert(tripShares).values({
      id: "share-1",
      tripId,
      sharedWithEmail: "friend@example.com",
      canEdit: false,
      createdAt: new Date().toISOString(),
    });

    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      `https://example.com/api/trips/${tripId}/shares`,
      "GET",
      undefined,
      headers,
    );
    const res = await getShares(req, { params: { tripId } });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.shares.length, 1);
    assert.equal(body.shares[0].shared_with_email, "friend@example.com");
  });

  test("DELETE /api/trips/[tripId]/shares/[shareId] revokes share", async () => {
    const shareId = "share-del-1";
    await db.insert(tripShares).values({
      id: shareId,
      tripId,
      sharedWithEmail: "friend@example.com",
      canEdit: false,
      createdAt: new Date().toISOString(),
    });

    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      `https://example.com/api/trips/${tripId}/shares/${shareId}`,
      "DELETE",
      undefined,
      headers,
    );

    const res = await deleteShare(req, { params: { tripId, shareId } });
    assert.equal(res.status, 200);

    const deleted = await db
      .select()
      .from(tripShares)
      .where(eq(tripShares.id, shareId))
      .get();
    assert.equal(deleted, undefined);
  });
});
