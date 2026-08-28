import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GET as getReport } from "../../app/api/trips/[tripId]/report/route";
import { setupTestDb, clearTestDb } from "../helpers/testDb";
import { trips, participants, tripLegs, expenses, users } from "@/db/schema";
import { NextRequest } from "next/server";

describe("API: /api/trips/[tripId]/report", () => {
  let db: ReturnType<typeof setupTestDb>;
  const tripId = "trip-rep-test";

  beforeEach(async () => {
    db = setupTestDb();
    clearTestDb();

    await db.insert(users).values({
      id: "u1",
      email: "u1@example.com",
      name: "User 1",
      createdAt: new Date().toISOString(),
    });

    await db.insert(trips).values({
      id: tripId,
      ownerId: "u1",
      name: "Trip Laporan",
      startDate: "2026-08-20",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.insert(participants).values({
      id: "p1",
      tripId,
      displayName: "Peserta 1",
      joinedAt: new Date().toISOString(),
    });

    await db.insert(tripLegs).values({
      id: "l1",
      tripId,
      legOrder: 1,
      startDatetime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    await db.insert(expenses).values({
      id: "e1",
      tripId,
      legId: "l1",
      paidBy: "p1",
      title: "Bensin Laporan",
      amountIdr: 100000,
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  });

  test("GET /api/trips/[tripId]/report returns HTML printable report page", async () => {
    const req = new NextRequest(
      `https://example.com/api/trips/${tripId}/report`,
    );
    const res = await getReport(req, { params: { tripId } });
    assert.equal(res.status, 200);

    const html = await res.text();
    assert.match(html, /Trip Laporan/);
    assert.match(html, /Bensin Laporan/);
  });

  test("GET /api/trips/[tripId]/report returns 404 for missing trip", async () => {
    const req = new NextRequest("https://example.com/api/trips/unknown/report");
    const res = await getReport(req, { params: { tripId: "unknown" } });
    assert.equal(res.status, 404);
  });
});
