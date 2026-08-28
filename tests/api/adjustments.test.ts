import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { POST as createAdjustment } from "../../app/api/trips/[tripId]/adjustments/route";
import { PATCH as updateAdjustment } from "../../app/api/trips/[tripId]/adjustments/[adjustmentId]/route";
import { setupTestDb, clearTestDb } from "../helpers/testDb";
import {
  TEST_USER_1,
  getAuthHeaders,
  createJsonRequest,
} from "../helpers/authHelper";
import { trips, participants, balanceAdjustments, users } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("API: /api/trips/[tripId]/adjustments", () => {
  let db: ReturnType<typeof setupTestDb>;
  const tripId = "trip-adj-test";
  const participantId = "part-adj-test";

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
      name: "Trip Adjustment Test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.insert(participants).values({
      id: participantId,
      tripId,
      displayName: "Peserta Penyesuaian",
      joinedAt: new Date().toISOString(),
    });
  });

  test("POST /api/trips/[tripId]/adjustments creates draft adjustment", async () => {
    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      `https://example.com/api/trips/${tripId}/adjustments`,
      "POST",
      {
        participantId,
        amountIdr: -25000,
        reason: "Potongan parkir pribadi",
        applyNow: false,
      },
      headers,
    );

    const res = await createAdjustment(req, { params: { tripId } });
    assert.equal(res.status, 201);

    const body = await res.json();
    assert.ok(body.data.id);

    const row = await db
      .select()
      .from(balanceAdjustments)
      .where(eq(balanceAdjustments.id, body.data.id))
      .get();
    assert.equal(row?.status, "draft");
    assert.equal(row?.amountIdr, -25000);
  });

  test("PATCH /api/trips/[tripId]/adjustments/[adjustmentId] applies adjustment", async () => {
    const adjustmentId = "adj-apply-1";
    await db.insert(balanceAdjustments).values({
      id: adjustmentId,
      tripId,
      participantId,
      amountIdr: 50000,
      status: "draft",
      createdAt: new Date().toISOString(),
    });

    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      `https://example.com/api/trips/${tripId}/adjustments/${adjustmentId}`,
      "PATCH",
      { action: "apply" },
      headers,
    );

    const res = await updateAdjustment(req, {
      params: { tripId, adjustmentId },
    });
    assert.equal(res.status, 200);

    const row = await db
      .select()
      .from(balanceAdjustments)
      .where(eq(balanceAdjustments.id, adjustmentId))
      .get();
    assert.equal(row?.status, "applied");
    assert.equal(row?.appliedBy, TEST_USER_1.id);
  });
});
