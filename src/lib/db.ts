import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import { getRequestContext } from "@cloudflare/next-on-pages";
import * as schema from "@/db/schema";

export type AppDb = DrizzleD1Database<typeof schema>;

export function getDb(): AppDb {
  let d1Binding: D1Database | undefined;

  try {
    const ctx = getRequestContext();
    d1Binding = (ctx?.env as any)?.DB as D1Database | undefined;
  } catch {
    // getRequestContext may throw if called outside request context
  }

  if (!d1Binding) {
    d1Binding = (process.env as unknown as { DB?: D1Database }).DB;
  }

  if (!d1Binding) {
    throw new Error(
      "D1 Database binding 'DB' not found. Ensure wrangler.toml contains [[d1_databases]] binding = 'DB'.",
    );
  }

  return drizzle(d1Binding, { schema });
}
