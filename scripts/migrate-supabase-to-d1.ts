import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to run migration script.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function escapeSql(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") return String(val);
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

async function run() {
  console.log("🚀 Starting data dump from Supabase...");
  let sqlStatements: string[] = [
    "-- Migration script generated from Supabase Postgres\n",
  ];

  // 1. Fetch Users
  const { data: authUsers } = await supabase.auth.admin
    .listUsers()
    .catch(() => ({ data: { users: [] } }));
  const userList = authUsers?.users || [];
  for (const u of userList) {
    const id = escapeSql(u.id);
    const email = escapeSql(u.email);
    const name = escapeSql(
      u.user_metadata?.full_name || u.email?.split("@")[0] || "User",
    );
    const avatar = escapeSql(u.user_metadata?.avatar_url || null);
    const createdAt = escapeSql(u.created_at || new Date().toISOString());
    sqlStatements.push(
      `INSERT OR REPLACE INTO users (id, email, name, avatar_url, created_at) VALUES (${id}, ${email}, ${name}, ${avatar}, ${createdAt});`,
    );
  }

  // 2. Fetch Trips
  const { data: trips } = await supabase.from("trips").select("*");
  if (trips) {
    for (const t of trips) {
      sqlStatements.push(
        `INSERT OR REPLACE INTO trips (id, owner_id, slug, name, origin_city, destination_city, currency, start_date, end_date, status, notes, created_at, updated_at) VALUES (${escapeSql(t.id)}, ${escapeSql(t.owner_id)}, ${escapeSql(t.slug)}, ${escapeSql(t.name)}, ${escapeSql(t.origin_city)}, ${escapeSql(t.destination_city)}, ${escapeSql(t.currency || "IDR")}, ${escapeSql(t.start_date)}, ${escapeSql(t.end_date)}, ${escapeSql(t.status || "ongoing")}, ${escapeSql(t.notes)}, ${escapeSql(t.created_at || new Date().toISOString())}, ${escapeSql(t.updated_at || new Date().toISOString())});`,
      );
    }
  }

  // 3. Fetch Participants
  const { data: participants } = await supabase
    .from("participants")
    .select("*");
  if (participants) {
    for (const p of participants) {
      sqlStatements.push(
        `INSERT OR REPLACE INTO participants (id, trip_id, user_id, display_name, email, phone, role, is_driver, joined_at) VALUES (${escapeSql(p.id)}, ${escapeSql(p.trip_id)}, ${escapeSql(p.user_id)}, ${escapeSql(p.display_name)}, ${escapeSql(p.email)}, ${escapeSql(p.phone)}, ${escapeSql(p.role)}, ${p.role === "driver" ? 1 : 0}, ${escapeSql(p.joined_at || new Date().toISOString())});`,
      );
    }
  }

  // 4. Fetch Trip Legs
  const { data: legs } = await supabase.from("trip_legs").select("*");
  if (legs) {
    for (const l of legs) {
      sqlStatements.push(
        `INSERT OR REPLACE INTO trip_legs (id, trip_id, leg_order, leg_type, start_datetime, end_datetime, origin, destination, notes, created_at) VALUES (${escapeSql(l.id)}, ${escapeSql(l.trip_id)}, ${escapeSql(l.leg_order)}, ${escapeSql(l.leg_type || "custom")}, ${escapeSql(l.start_datetime)}, ${escapeSql(l.end_datetime)}, ${escapeSql(l.origin)}, ${escapeSql(l.destination)}, ${escapeSql(l.notes)}, ${escapeSql(l.created_at || new Date().toISOString())});`,
      );
    }
  }

  // 5. Fetch Fleet Vehicles
  const { data: vehicles } = await supabase.from("trip_vehicles").select("*");
  if (vehicles) {
    for (const v of vehicles) {
      sqlStatements.push(
        `INSERT OR REPLACE INTO fleet_vehicles (id, trip_id, label, plate_number, seat_capacity, notes, created_at) VALUES (${escapeSql(v.id)}, ${escapeSql(v.trip_id)}, ${escapeSql(v.label)}, ${escapeSql(v.plate_number)}, ${escapeSql(v.seat_capacity || 7)}, ${escapeSql(v.notes)}, ${escapeSql(v.created_at || new Date().toISOString())});`,
      );
    }
  }

  // 6. Fetch Leg Vehicle Links
  const { data: links } = await supabase.from("leg_vehicle_links").select("*");
  if (links) {
    for (const l of links) {
      sqlStatements.push(
        `INSERT OR REPLACE INTO leg_vehicle_links (id, trip_id, leg_id, vehicle_id, departure_time, created_at) VALUES (${escapeSql(l.id)}, ${escapeSql(l.trip_id)}, ${escapeSql(l.leg_id)}, ${escapeSql(l.vehicle_id)}, ${escapeSql(l.departure_at)}, ${escapeSql(l.created_at || new Date().toISOString())});`,
      );
    }
  }

  // 7. Fetch Vehicle Assignments
  const { data: assignments } = await supabase
    .from("vehicle_assignments")
    .select("*");
  if (assignments) {
    for (const a of assignments) {
      sqlStatements.push(
        `INSERT OR REPLACE INTO vehicle_assignments (id, leg_id, vehicle_id, participant_id, role, allocation_override, joined_at, left_at, notes) VALUES (${escapeSql(a.id)}, ${escapeSql(a.leg_id)}, ${escapeSql(a.vehicle_id)}, ${escapeSql(a.participant_id)}, ${escapeSql(a.role || "passenger")}, ${escapeSql(a.allocation_override)}, ${escapeSql(a.joined_at || new Date().toISOString())}, ${escapeSql(a.left_at)}, ${escapeSql(a.notes)});`,
      );
    }
  }

  // 8. Fetch Expenses
  const { data: expenses } = await supabase.from("expenses").select("*");
  if (expenses) {
    for (const e of expenses) {
      sqlStatements.push(
        `INSERT OR REPLACE INTO expenses (id, trip_id, leg_id, vehicle_id, paid_by, title, expense_type, notes, amount_idr, issued_at, created_by, is_excluded, created_at) VALUES (${escapeSql(e.id)}, ${escapeSql(e.trip_id)}, ${escapeSql(e.leg_id)}, ${escapeSql(e.vehicle_id)}, ${escapeSql(e.paid_by)}, ${escapeSql(e.title)}, ${escapeSql(e.expense_type || "lainnya")}, ${escapeSql(e.notes)}, ${escapeSql(e.amount_idr)}, ${escapeSql(e.issued_at || new Date().toISOString())}, ${escapeSql(e.created_by)}, ${e.is_excluded ? 1 : 0}, ${escapeSql(e.created_at || new Date().toISOString())});`,
      );
    }
  }

  // 9. Fetch Expense Splits
  const { data: splits } = await supabase.from("expense_splits").select("*");
  if (splits) {
    for (const s of splits) {
      sqlStatements.push(
        `INSERT OR REPLACE INTO expense_splits (id, expense_id, participant_id, share_weight, share_amount_override, notes, created_at) VALUES (${escapeSql(s.id)}, ${escapeSql(s.expense_id)}, ${escapeSql(s.participant_id)}, ${escapeSql(s.share_weight || 1)}, ${escapeSql(s.share_amount_override)}, ${escapeSql(s.notes)}, ${escapeSql(s.created_at || new Date().toISOString())});`,
      );
    }
  }

  // 10. Fetch Adjustments
  const { data: adjustments } = await supabase
    .from("balance_adjustments")
    .select("*");
  if (adjustments) {
    for (const a of adjustments) {
      sqlStatements.push(
        `INSERT OR REPLACE INTO balance_adjustments (id, trip_id, participant_id, amount_idr, reason, status, created_by, created_at, applied_by, applied_at) VALUES (${escapeSql(a.id)}, ${escapeSql(a.trip_id)}, ${escapeSql(a.participant_id)}, ${escapeSql(a.amount_idr)}, ${escapeSql(a.reason)}, ${escapeSql(a.status || "draft")}, ${escapeSql(a.created_by)}, ${escapeSql(a.created_at || new Date().toISOString())}, ${escapeSql(a.applied_by)}, ${escapeSql(a.applied_at)});`,
      );
    }
  }

  // 11. Fetch User Payment Accounts
  const { data: userAccs } = await supabase
    .from("user_payment_accounts")
    .select("*");
  if (userAccs) {
    for (const acc of userAccs) {
      sqlStatements.push(
        `INSERT OR REPLACE INTO user_payment_accounts (id, user_id, label, channel, provider, account_name, account_number, instructions, priority, created_at, updated_at) VALUES (${escapeSql(acc.id)}, ${escapeSql(acc.owner_id)}, ${escapeSql(acc.label)}, ${escapeSql(acc.channel)}, ${escapeSql(acc.provider)}, ${escapeSql(acc.account_name)}, ${escapeSql(acc.account_number)}, ${escapeSql(acc.instructions)}, ${escapeSql(acc.priority || 0)}, ${escapeSql(acc.created_at || new Date().toISOString())}, ${escapeSql(acc.updated_at || new Date().toISOString())});`,
      );
    }
  }

  // 12. Fetch Trip Payment Accounts
  const { data: tripAccs } = await supabase
    .from("trip_payment_accounts")
    .select("*");
  if (tripAccs) {
    for (const tAcc of tripAccs) {
      sqlStatements.push(
        `INSERT OR REPLACE INTO trip_payment_accounts (id, trip_id, payment_account_id, custom_label, custom_instructions, custom_priority, created_at, updated_at) VALUES (${escapeSql(tAcc.id)}, ${escapeSql(tAcc.trip_id)}, ${escapeSql(tAcc.payment_account_id)}, ${escapeSql(tAcc.custom_label)}, ${escapeSql(tAcc.custom_instructions)}, ${escapeSql(tAcc.custom_priority)}, ${escapeSql(tAcc.created_at || new Date().toISOString())}, ${escapeSql(tAcc.updated_at || new Date().toISOString())});`,
      );
    }
  }

  // 13. Fetch Trip Shares
  const { data: shares } = await supabase.from("trip_shares").select("*");
  if (shares) {
    for (const s of shares) {
      sqlStatements.push(
        `INSERT OR REPLACE INTO trip_shares (id, trip_id, shared_with_email, can_edit, created_at) VALUES (${escapeSql(s.id)}, ${escapeSql(s.trip_id)}, ${escapeSql(s.shared_with_email)}, ${s.can_edit ? 1 : 0}, ${escapeSql(s.created_at || new Date().toISOString())});`,
      );
    }
  }

  const outputDir = path.join(__dirname, "../migrations");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "seed_from_supabase.sql");
  fs.writeFileSync(outputPath, sqlStatements.join("\n"), "utf-8");
  console.log(`✅ Supabase data successfully exported to: ${outputPath}`);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
