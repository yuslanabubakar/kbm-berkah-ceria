import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  GET as getUserAccounts,
  POST as createUserAccount,
} from "../../app/api/payment-accounts/route";
import {
  PATCH as updateUserAccount,
  DELETE as deleteUserAccount,
} from "../../app/api/payment-accounts/[accountId]/route";
import { POST as attachTripPaymentAccount } from "../../app/api/trips/[tripId]/payment-accounts/route";
import {
  PATCH as updateTripPaymentAttachment,
  DELETE as detachTripPaymentAccount,
} from "../../app/api/trips/[tripId]/payment-accounts/[attachmentId]/route";
import { setupTestDb, clearTestDb } from "../helpers/testDb";
import {
  TEST_USER_1,
  getAuthHeaders,
  createJsonRequest,
} from "../helpers/authHelper";
import {
  trips,
  userPaymentAccounts,
  tripPaymentAccounts,
  users,
} from "@/db/schema";
import { eq } from "drizzle-orm";

describe("API: Payment Accounts & Trip Attachments", () => {
  let db: ReturnType<typeof setupTestDb>;
  const tripId = "trip-pay-test";

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
      name: "Trip Payment Test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe("User Payment Accounts (/api/payment-accounts)", () => {
    test("POST /api/payment-accounts creates user payment account", async () => {
      const headers = await getAuthHeaders(TEST_USER_1);
      const req = createJsonRequest(
        "https://example.com/api/payment-accounts",
        "POST",
        {
          label: "BCA Utama",
          channel: "bank",
          provider: "BCA",
          accountName: "Irfan Pratama",
          accountNumber: "1234567890",
          priority: 5,
        },
        headers,
      );

      const res = await createUserAccount(req);
      assert.equal(res.status, 201);

      const body = await res.json();
      assert.ok(body.data.id);
      assert.equal(body.data.label, "BCA Utama");
    });

    test("GET /api/payment-accounts lists user accounts", async () => {
      await db.insert(userPaymentAccounts).values({
        id: "acc-1",
        userId: TEST_USER_1.id,
        label: "Mandiri Irfan",
        channel: "bank",
        accountName: "Irfan",
        accountNumber: "987654321",
        priority: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const headers = await getAuthHeaders(TEST_USER_1);
      const req = createJsonRequest(
        "https://example.com/api/payment-accounts",
        "GET",
        undefined,
        headers,
      );
      const res = await getUserAccounts(req);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.data.length, 1);
      assert.equal(body.data[0].label, "Mandiri Irfan");
    });
  });

  describe("Trip Payment Attachment (/api/trips/[tripId]/payment-accounts)", () => {
    test("POST attaches payment account to trip without 401 error", async () => {
      const accountId = "acc-attach-1";
      await db.insert(userPaymentAccounts).values({
        id: accountId,
        userId: TEST_USER_1.id,
        label: "GoPay Irfan",
        channel: "ewallet",
        provider: "GoPay",
        accountName: "Irfan",
        accountNumber: "082118204795",
        priority: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const headers = await getAuthHeaders(TEST_USER_1);
      const req = createJsonRequest(
        `https://example.com/api/trips/${tripId}/payment-accounts`,
        "POST",
        {
          paymentAccountId: accountId,
          customLabel: "GoPay Driver Irfan",
          customPriority: 10,
        },
        headers,
      );

      const res = await attachTripPaymentAccount(req, { params: { tripId } });
      assert.equal(res.status, 201);

      const body = await res.json();
      assert.ok(body.data.id);
      assert.equal(body.data.label, "GoPay Driver Irfan");
      assert.equal(body.data.priority, 10);
      assert.equal(body.data.channel, "ewallet");
    });

    test("PATCH updates attachment custom label and priority", async () => {
      const accountId = "acc-patch-1";
      const attachmentId = "att-patch-1";

      await db.insert(userPaymentAccounts).values({
        id: accountId,
        userId: TEST_USER_1.id,
        label: "BCA Tabungan",
        channel: "bank",
        accountName: "Irfan",
        accountNumber: "123123123",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.insert(tripPaymentAccounts).values({
        id: attachmentId,
        tripId,
        paymentAccountId: accountId,
        customLabel: "BCA Lama",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const headers = await getAuthHeaders(TEST_USER_1);
      const req = createJsonRequest(
        `https://example.com/api/trips/${tripId}/payment-accounts/${attachmentId}`,
        "PATCH",
        { customLabel: "BCA Baru", customPriority: 2 },
        headers,
      );

      const res = await updateTripPaymentAttachment(req, {
        params: { tripId, attachmentId },
      });
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.data.label, "BCA Baru");
      assert.equal(body.data.priority, 2);
    });

    test("DELETE detaches payment account from trip", async () => {
      const accountId = "acc-del-1";
      const attachmentId = "att-del-1";

      await db.insert(userPaymentAccounts).values({
        id: accountId,
        userId: TEST_USER_1.id,
        label: "BCA Hapus",
        channel: "bank",
        accountName: "Irfan",
        accountNumber: "55555",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.insert(tripPaymentAccounts).values({
        id: attachmentId,
        tripId,
        paymentAccountId: accountId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const headers = await getAuthHeaders(TEST_USER_1);
      const req = createJsonRequest(
        `https://example.com/api/trips/${tripId}/payment-accounts/${attachmentId}`,
        "DELETE",
        undefined,
        headers,
      );

      const res = await detachTripPaymentAccount(req, {
        params: { tripId, attachmentId },
      });
      assert.equal(res.status, 200);

      const deleted = await db
        .select()
        .from(tripPaymentAccounts)
        .where(eq(tripPaymentAccounts.id, attachmentId))
        .get();
      assert.equal(deleted, undefined);
    });
  });
});
