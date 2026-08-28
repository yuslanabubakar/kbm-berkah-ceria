import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createSessionToken,
  type AuthUser,
  verifySessionToken,
  getCurrentUser,
  upsertUserFromGoogle,
  COOKIE_NAME,
} from "@/lib/auth";
import { setupTestDb, clearTestDb } from "../helpers/testDb";
import { TEST_USER_1 } from "../helpers/authHelper";

describe("auth", () => {
  beforeEach(() => {
    setupTestDb();
    clearTestDb();
  });

  describe("createSessionToken & verifySessionToken", () => {
    test("creates and verifies a valid JWT session token", async () => {
      const token = await createSessionToken(TEST_USER_1);
      assert.ok(typeof token === "string" && token.length > 20);

      const verified = await verifySessionToken(token);
      assert.ok(verified);
      assert.equal(verified?.id, TEST_USER_1.id);
      assert.equal(verified?.email, TEST_USER_1.email);
      assert.equal(verified?.name, TEST_USER_1.name);
      assert.equal(verified?.avatarUrl, TEST_USER_1.avatarUrl);
    });

    test("returns null for malformed token", async () => {
      const verified = await verifySessionToken("invalid.token.payload");
      assert.equal(verified, null);
    });
  });

  describe("getCurrentUser", () => {
    test("extracts user from Authorization: Bearer header", async () => {
      const token = await createSessionToken(TEST_USER_1);
      const req = new Request("https://example.com/api/test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const user = await getCurrentUser(req);
      assert.ok(user);
      assert.equal(user?.id, TEST_USER_1.id);
      assert.equal(user?.email, TEST_USER_1.email);
    });

    test("extracts user from Cookie header", async () => {
      const token = await createSessionToken(TEST_USER_1);
      const req = new Request("https://example.com/api/test", {
        headers: {
          Cookie: `${COOKIE_NAME}=${token}; other_cookie=123`,
        },
      });

      const user = await getCurrentUser(req);
      assert.ok(user);
      assert.equal(user?.id, TEST_USER_1.id);
      assert.equal(user?.email, TEST_USER_1.email);
    });

    test("returns null when no auth header or cookie is present", async () => {
      const req = new Request("https://example.com/api/test");
      const user = await getCurrentUser(req);
      assert.equal(user, null);
    });
  });

  describe("upsertUserFromGoogle", () => {
    test("inserts new user when profile does not exist", async () => {
      const profile = {
        id: "google-123",
        email: "newuser@gmail.com",
        name: "New User",
        picture: "https://example.com/pic.jpg",
      };

      const user = await upsertUserFromGoogle(profile);
      assert.equal(user.id, "google-123");
      assert.equal(user.email, "newuser@gmail.com");
      assert.equal(user.name, "New User");
      assert.equal(user.avatarUrl, "https://example.com/pic.jpg");
    });

    test("updates existing user when email matches", async () => {
      await upsertUserFromGoogle({
        id: "google-123",
        email: "user@gmail.com",
        name: "Initial Name",
        picture: "https://example.com/old.jpg",
      });

      const updated = await upsertUserFromGoogle({
        email: "user@gmail.com",
        name: "Updated Name",
        picture: "https://example.com/new.jpg",
      });

      assert.equal(updated.id, "google-123");
      assert.equal(updated.name, "Updated Name");
      assert.equal(updated.avatarUrl, "https://example.com/new.jpg");
    });
  });
});
