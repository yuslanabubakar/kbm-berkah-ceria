// @ts-nocheck
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

class D1MockStatement {
  db: DatabaseSync;
  sql: string;
  params: any[];

  constructor(db: DatabaseSync, sql: string, params: any[] = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...params: any[]) {
    return new D1MockStatement(this.db, this.sql, params);
  }

  async all() {
    const stmt = this.db.prepare(this.sql);
    const results = stmt.all(...this.params);
    return { results, success: true, meta: {} };
  }

  async first(colName?: string) {
    const stmt = this.db.prepare(this.sql);
    const row = stmt.get(...this.params) as any;
    if (!row) return null;
    if (colName) return row[colName];
    return row;
  }

  async run() {
    const stmt = this.db.prepare(this.sql);
    const info = stmt.run(...this.params);
    return {
      success: true,
      meta: {
        changes: info.changes,
        last_row_id: Number(info.lastInsertRowid),
      },
    };
  }

  async raw() {
    const stmt = this.db.prepare(this.sql);
    const results = stmt.all(...this.params);
    return results.map((r: any) => Object.values(r));
  }
}

export class D1MockDatabase {
  sqlite: DatabaseSync;

  constructor(sqlite: DatabaseSync) {
    this.sqlite = sqlite;
  }

  prepare(sql: string) {
    return new D1MockStatement(this.sqlite, sql);
  }

  async batch(statements: D1MockStatement[]) {
    return Promise.all(statements.map((s) => s.run()));
  }

  async exec(query: string) {
    this.sqlite.exec(query);
    return { count: 1, duration: 0 };
  }
}

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    slug TEXT UNIQUE,
    name TEXT NOT NULL,
    origin_city TEXT,
    destination_city TEXT,
    currency TEXT NOT NULL DEFAULT "IDR",
    start_date TEXT,
    end_date TEXT,
    status TEXT NOT NULL DEFAULT "draft",
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT "member",
    is_driver INTEGER NOT NULL DEFAULT 0,
    joined_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trip_legs (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    leg_order INTEGER NOT NULL,
    leg_type TEXT NOT NULL DEFAULT "custom",
    start_datetime TEXT NOT NULL,
    end_datetime TEXT,
    origin TEXT,
    destination TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fleet_vehicles (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    plate_number TEXT,
    seat_capacity INTEGER NOT NULL DEFAULT 7,
    notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leg_vehicle_links (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    leg_id TEXT NOT NULL REFERENCES trip_legs(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
    departure_time TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vehicle_assignments (
    id TEXT PRIMARY KEY,
    leg_id TEXT NOT NULL REFERENCES trip_legs(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT "passenger",
    allocation_override REAL,
    joined_at TEXT NOT NULL,
    left_at TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    leg_id TEXT NOT NULL REFERENCES trip_legs(id) ON DELETE CASCADE,
    vehicle_id TEXT REFERENCES fleet_vehicles(id) ON DELETE SET NULL,
    paid_by TEXT NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    expense_type TEXT DEFAULT "lainnya",
    notes TEXT,
    amount_idr REAL NOT NULL,
    issued_at TEXT NOT NULL,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    share_scope TEXT NOT NULL DEFAULT "leg",
    is_excluded INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expense_splits (
    id TEXT PRIMARY KEY,
    expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    share_weight REAL NOT NULL DEFAULT 1.0,
    share_amount_override REAL,
    notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS balance_adjustments (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    amount_idr REAL NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT "draft",
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    applied_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    applied_at TEXT
  );

  CREATE TABLE IF NOT EXISTS user_payment_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    channel TEXT NOT NULL,
    provider TEXT,
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    instructions TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trip_payment_accounts (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    payment_account_id TEXT NOT NULL REFERENCES user_payment_accounts(id) ON DELETE CASCADE,
    custom_label TEXT,
    custom_instructions TEXT,
    custom_priority INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trip_shares (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    shared_with_email TEXT NOT NULL,
    can_edit INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`;

let currentSqlite: DatabaseSync | null = null;
let currentD1Mock: D1MockDatabase | null = null;

export function setupTestDb() {
  currentSqlite = new DatabaseSync(":memory:");
  currentD1Mock = new D1MockDatabase(currentSqlite);
  currentD1Mock.exec(CREATE_TABLES_SQL);
  (globalThis as any).__TEST_D1_DB__ = currentD1Mock;
  return drizzle(currentD1Mock as any, { schema });
}

export function clearTestDb() {
  if (currentSqlite) {
    const tableNames = [
      "trip_shares",
      "trip_payment_accounts",
      "user_payment_accounts",
      "balance_adjustments",
      "expense_splits",
      "expenses",
      "vehicle_assignments",
      "leg_vehicle_links",
      "fleet_vehicles",
      "trip_legs",
      "participants",
      "trips",
      "users",
    ];
    for (const table of tableNames) {
      try {
        currentSqlite.exec(`DELETE FROM ${table};`);
      } catch {}
    }
  }
}
