import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { userPaymentAccounts } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import type { HostPaymentChannel, UserPaymentAccount } from "@/types/expense";

export async function fetchUserPaymentAccounts(): Promise<
  UserPaymentAccount[]
> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const db = getDb();
  const rows = await db
    .select()
    .from(userPaymentAccounts)
    .where(eq(userPaymentAccounts.userId, currentUser.id))
    .orderBy(
      desc(userPaymentAccounts.priority),
      asc(userPaymentAccounts.createdAt),
    )
    .all();

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    channel: row.channel as HostPaymentChannel,
    provider: row.provider,
    accountName: row.accountName,
    accountNumber: row.accountNumber,
    instructions: row.instructions ?? undefined,
    priority: row.priority,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}
