import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { POST as addParticipant } from "../../app/api/trips/[tripId]/participants/route";
import {
  PATCH as updateParticipant,
  DELETE as deleteParticipant,
} from "../../app/api/trips/[tripId]/participants/[participantId]/route";
import { setupTestDb, clearTestDb } from "../helpers/testDb";
import {
  TEST_USER_1,
  getAuthHeaders,
  createJsonRequest,
} from "../helpers/authHelper";
import { trips, participants, users } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("API: /api/trips/[tripId]/participants", () => {
  let db: ReturnType<typeof setupTestDb>;
  const tripId = "trip-part-test";

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
      name: "Trip Test Participants",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  test("POST /api/trips/[tripId]/participants adds participant", async () => {
    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      `https://example.com/api/trips/${tripId}/participants`,
      "POST",
      { name: "Ahmad", isDriver: true },
      headers,
    );

    const res = await addParticipant(req, { params: { tripId } });
    assert.equal(res.status, 201);

    const body = await res.json();
    assert.equal(body.data.name, "Ahmad");
    assert.equal(body.data.role, "driver");
  });

  test("PATCH /api/trips/[tripId]/participants/[participantId] updates participant", async () => {
    const participantId = "part-1";
    await db.insert(participants).values({
      id: participantId,
      tripId,
      displayName: "Ahmad Lama",
      isDriver: false,
      role: "member",
      joinedAt: new Date().toISOString(),
    });

    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      `https://example.com/api/trips/${tripId}/participants/${participantId}`,
      "PATCH",
      { name: "Ahmad Baru", isDriver: true },
      headers,
    );

    const res = await updateParticipant(req, {
      params: { tripId, participantId },
    });
    assert.equal(res.status, 200);

    const updated = await db
      .select()
      .from(participants)
      .where(eq(participants.id, participantId))
      .get();
    assert.equal(updated?.displayName, "Ahmad Baru");
    assert.equal(updated?.isDriver, true);
  });

  test("DELETE /api/trips/[tripId]/participants/[participantId] deletes participant", async () => {
    const participantId = "part-del";
    await db.insert(participants).values([
      {
        id: participantId,
        tripId,
        displayName: "Peserta Hapus",
        joinedAt: new Date().toISOString(),
      },
      {
        id: "part-stay",
        tripId,
        displayName: "Peserta Tetap",
        joinedAt: new Date().toISOString(),
      },
    ]);

    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      `https://example.com/api/trips/${tripId}/participants/${participantId}`,
      "DELETE",
      undefined,
      headers,
    );

    const res = await deleteParticipant(req, {
      params: { tripId, participantId },
    });
    assert.equal(res.status, 200);

    const deleted = await db
      .select()
      .from(participants)
      .where(eq(participants.id, participantId))
      .get();
    assert.equal(deleted, undefined);
  });
});
