-- D1 Initial Schema for KBM Berkah Ceria
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS trip_shares;
DROP TABLE IF EXISTS trip_payment_accounts;
DROP TABLE IF EXISTS user_payment_accounts;
DROP TABLE IF EXISTS balance_adjustments;
DROP TABLE IF EXISTS expense_splits;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS vehicle_assignments;
DROP TABLE IF EXISTS leg_vehicle_links;
DROP TABLE IF EXISTS fleet_vehicles;
DROP TABLE IF EXISTS trip_legs;
DROP TABLE IF EXISTS participants;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS users;
PRAGMA foreign_keys = ON;

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
  currency TEXT NOT NULL DEFAULT 'IDR',
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
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
  role TEXT DEFAULT 'member',
  is_driver INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trip_legs (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  leg_order INTEGER NOT NULL,
  leg_type TEXT NOT NULL DEFAULT 'custom',
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
  role TEXT NOT NULL DEFAULT 'passenger',
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
  expense_type TEXT DEFAULT 'lainnya',
  notes TEXT,
  amount_idr REAL NOT NULL,
  issued_at TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  share_scope TEXT NOT NULL DEFAULT 'leg',
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
  status TEXT NOT NULL DEFAULT 'draft',
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
