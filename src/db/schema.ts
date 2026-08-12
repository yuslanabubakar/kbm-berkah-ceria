import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// 1. Users
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").notNull(),
});

// 2. Trips
export const trips = sqliteTable("trips", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").references(() => users.id, {
    onDelete: "set null",
  }),
  slug: text("slug").unique(),
  name: text("name").notNull(),
  originCity: text("origin_city"),
  destinationCity: text("destination_city"),
  currency: text("currency").notNull().default("IDR"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// 3. Participants
export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  displayName: text("display_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").default("member"),
  isDriver: integer("is_driver", { mode: "boolean" }).notNull().default(false),
  joinedAt: text("joined_at").notNull(),
});

// 4. Trip Legs
export const tripLegs = sqliteTable("trip_legs", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  legOrder: integer("leg_order").notNull(),
  legType: text("leg_type").notNull().default("custom"),
  startDatetime: text("start_datetime").notNull(),
  endDatetime: text("end_datetime"),
  origin: text("origin"),
  destination: text("destination"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

// 5. Fleet Vehicles
export const fleetVehicles = sqliteTable("fleet_vehicles", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  plateNumber: text("plate_number"),
  seatCapacity: integer("seat_capacity").notNull().default(7),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

// 6. Leg Vehicle Links
export const legVehicleLinks = sqliteTable("leg_vehicle_links", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  legId: text("leg_id")
    .notNull()
    .references(() => tripLegs.id, { onDelete: "cascade" }),
  vehicleId: text("vehicle_id")
    .notNull()
    .references(() => fleetVehicles.id, { onDelete: "cascade" }),
  departureTime: text("departure_time"),
  createdAt: text("created_at").notNull(),
});

// 7. Vehicle Assignments
export const vehicleAssignments = sqliteTable("vehicle_assignments", {
  id: text("id").primaryKey(),
  legId: text("leg_id")
    .notNull()
    .references(() => tripLegs.id, { onDelete: "cascade" }),
  vehicleId: text("vehicle_id")
    .notNull()
    .references(() => fleetVehicles.id, { onDelete: "cascade" }),
  participantId: text("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("passenger"),
  allocationOverride: real("allocation_override"),
  joinedAt: text("joined_at").notNull(),
  leftAt: text("left_at"),
  notes: text("notes"),
});

// 8. Expenses
export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  legId: text("leg_id")
    .notNull()
    .references(() => tripLegs.id, { onDelete: "cascade" }),
  vehicleId: text("vehicle_id").references(() => fleetVehicles.id, {
    onDelete: "set null",
  }),
  paidBy: text("paid_by")
    .notNull()
    .references(() => participants.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  expenseType: text("expense_type").default("lainnya"),
  notes: text("notes"),
  amountIdr: real("amount_idr").notNull(),
  issuedAt: text("issued_at").notNull(),
  createdBy: text("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  shareScope: text("share_scope").notNull().default("leg"),
  isExcluded: integer("is_excluded", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull(),
});

// 9. Expense Splits
export const expenseSplits = sqliteTable("expense_splits", {
  id: text("id").primaryKey(),
  expenseId: text("expense_id")
    .notNull()
    .references(() => expenses.id, { onDelete: "cascade" }),
  participantId: text("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  shareWeight: real("share_weight").notNull().default(1.0),
  shareAmountOverride: real("share_amount_override"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

// 10. Balance Adjustments
export const balanceAdjustments = sqliteTable("balance_adjustments", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  participantId: text("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  amountIdr: real("amount_idr").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("draft"),
  createdBy: text("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: text("created_at").notNull(),
  appliedBy: text("applied_by").references(() => users.id, {
    onDelete: "set null",
  }),
  appliedAt: text("applied_at"),
});

// 11. User Payment Accounts
export const userPaymentAccounts = sqliteTable("user_payment_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  channel: text("channel").notNull(),
  provider: text("provider"),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  instructions: text("instructions"),
  priority: integer("priority").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// 12. Trip Payment Accounts
export const tripPaymentAccounts = sqliteTable("trip_payment_accounts", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  paymentAccountId: text("payment_account_id")
    .notNull()
    .references(() => userPaymentAccounts.id, { onDelete: "cascade" }),
  customLabel: text("custom_label"),
  customInstructions: text("custom_instructions"),
  customPriority: integer("custom_priority"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// 13. Trip Shares
export const tripShares = sqliteTable("trip_shares", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  sharedWithEmail: text("shared_with_email").notNull(),
  canEdit: integer("can_edit", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
