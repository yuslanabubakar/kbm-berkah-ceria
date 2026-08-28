import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../../app/api/auth/[...action]/route";
import { setupTestDb, clearTestDb } from "../helpers/testDb";
import { TEST_USER_1, getAuthHeaders } from "../helpers/authHelper";
import { NextRequest } from "next/server";

describe("API: /api/auth/[...action]", () => {
  beforeEach(() => {
    setupTestDb();
    clearTestDb();
  });

  test("GET /api/auth/me returns null when unauthenticated", async () => {
    const req = new NextRequest("https://example.com/api/auth/me");
    const res = await GET(req, { params: { action: ["me"] } });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.user, null);
  });

  test("GET /api/auth/me returns user when authenticated", async () => {
    const headers = await getAuthHeaders(TEST_USER_1);
    const req = new NextRequest("https://example.com/api/auth/me", { headers });
    const res = await GET(req, { params: { action: ["me"] } });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.user);
    assert.equal(body.user.id, TEST_USER_1.id);
    assert.equal(body.user.email, TEST_USER_1.email);
  });

  test("GET /api/auth/logout clears cookie and redirects", async () => {
    const req = new NextRequest("https://example.com/api/auth/logout");
    const res = await GET(req, { params: { action: ["logout"] } });
    assert.equal(res.status, 307); // NextResponse.redirect status
  });

  test("GET /api/auth/unknown returns 404", async () => {
    const req = new NextRequest("https://example.com/api/auth/unknown");
    const res = await GET(req, { params: { action: ["unknown"] } });
    assert.equal(res.status, 404);
  });
});
