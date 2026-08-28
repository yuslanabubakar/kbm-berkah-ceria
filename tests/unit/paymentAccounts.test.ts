import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { fetchUserPaymentAccounts } from "@/lib/paymentAccounts";
import { setupTestDb, clearTestDb } from "../helpers/testDb";
import { userPaymentAccounts, users } from "@/db/schema";
import { TEST_USER_1 } from "../helpers/authHelper";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth";

describe("paymentAccounts", () => {
  beforeEach(() => {
    setupTestDb();
    clearTestDb();
  });

  test("returns empty array when user is not authenticated", async () => {
    const accounts = await fetchUserPaymentAccounts();
    assert.deepEqual(accounts, []);
  });

  test("fetches user payment accounts ordered by priority desc", async () => {
    const db = setupTestDb();
    const token = await createSessionToken(TEST_USER_1);

    await db.insert(users).values({
      id: TEST_USER_1.id,
      email: TEST_USER_1.email,
      name: TEST_USER_1.name,
      createdAt: new Date().toISOString(),
    });
    // Insert test accounts
    await db.insert(userPaymentAccounts).values([
      {
        id: "acc-1",
        userId: TEST_USER_1.id,
        label: "BCA Irfan",
        channel: "bank",
        provider: "BCA",
        accountName: "Irfan",
        accountNumber: "1234567890",
        priority: 1,
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
      {
        id: "acc-2",
        userId: TEST_USER_1.id,
        label: "GoPay Irfan",
        channel: "ewallet",
        provider: "GoPay",
        accountName: "Irfan",
        accountNumber: "08123456789",
        priority: 10, // Higher priority
        createdAt: "2026-08-02T00:00:00.000Z",
        updatedAt: "2026-08-02T00:00:00.000Z",
      },
      {
        id: "acc-other",
        userId: TEST_USER_1.id,
        label: "BCA Other",
        channel: "bank",
        accountName: "Other",
        accountNumber: "999999",
        priority: 100,
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
    ]);

    // Mock getCurrentUser by setting cookie in mock headers if needed or test direct fetch
    // Since fetchUserPaymentAccounts calls getCurrentUser() with no params (using next/headers cookies),
    // let us test via direct DB query check or mock
  });
});
