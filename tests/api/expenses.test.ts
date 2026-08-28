import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { POST as createExpense } from "../../app/api/expenses/route";
import {
  PATCH as updateExpense,
  DELETE as deleteExpense,
} from "../../app/api/expenses/[expenseId]/route";
import { setupTestDb, clearTestDb } from "../helpers/testDb";
import {
  TEST_USER_1,
  getAuthHeaders,
  createJsonRequest,
} from "../helpers/authHelper";
import { trips, tripLegs, participants, expenses, users } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("API: /api/expenses & /api/expenses/[expenseId]", () => {
  let db: ReturnType<typeof setupTestDb>;
  const tripId = "trip-exp-test";
  const legId = "leg-exp-test";
  const participantId = "part-exp-test";

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
      name: "Trip Expense Test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.insert(tripLegs).values({
      id: legId,
      tripId,
      legOrder: 1,
      startDatetime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    await db.insert(participants).values({
      id: participantId,
      tripId,
      displayName: "Pembayar Utama",
      joinedAt: new Date().toISOString(),
    });
  });

  test("POST /api/expenses creates expense", async () => {
    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      "https://example.com/api/expenses",
      "POST",
      {
        tripId,
        judul: "Makan Siang Sate",
        amountIdr: 120000,
        paidBy: participantId,
        legId,
        shareScope: "leg",
        catatan: "Sate Maranggi",
      },
      headers,
    );

    const res = await createExpense(req);
    assert.equal(res.status, 201);

    const body = await res.json();
    assert.ok(body.id);
  });

  test("PATCH /api/expenses/[expenseId] updates expense", async () => {
    const expenseId = "exp-edit-1";
    await db.insert(expenses).values({
      id: expenseId,
      tripId,
      legId,
      paidBy: participantId,
      title: "Makan Siang Lama",
      amountIdr: 100000,
      issuedAt: new Date().toISOString(),
      shareScope: "leg",
      createdAt: new Date().toISOString(),
    });

    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      `https://example.com/api/expenses/${expenseId}`,
      "PATCH",
      {
        tripId,
        judul: "Makan Siang Baru",
        amountIdr: 150000,
        paidBy: participantId,
        legId,
        shareScope: "leg",
      },
      headers,
    );

    const res = await updateExpense(req, { params: { expenseId } });
    assert.equal(res.status, 200);

    const updated = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expenseId))
      .get();
    assert.equal(updated?.title, "Makan Siang Baru");
    assert.equal(updated?.amountIdr, 150000);
  });

  test("DELETE /api/expenses/[expenseId] deletes expense", async () => {
    const expenseId = "exp-del-1";
    await db.insert(expenses).values({
      id: expenseId,
      tripId,
      legId,
      paidBy: participantId,
      title: "Hapus Biaya",
      amountIdr: 50000,
      issuedAt: new Date().toISOString(),
      shareScope: "leg",
      createdAt: new Date().toISOString(),
    });

    const headers = await getAuthHeaders(TEST_USER_1);
    const req = createJsonRequest(
      `https://example.com/api/expenses/${expenseId}`,
      "DELETE",
      { tripId },
      headers,
    );

    const res = await deleteExpense(req, { params: { expenseId } });
    assert.equal(res.status, 200);

    const deleted = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expenseId))
      .get();
    assert.equal(deleted, undefined);
  });
});
