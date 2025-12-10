import { getSupabaseServer } from "@/lib/supabaseServer";
import type { HostPaymentChannel, UserPaymentAccount } from "@/types/expense";

function mapUserPaymentAccount(row: {
  id: string;
  label: string;
  channel: string;
  provider: string | null;
  account_name: string;
  account_number: string;
  instructions: string | null;
  priority: number | null;
  created_at: string;
  updated_at: string;
}): UserPaymentAccount {
  return {
    id: row.id,
    label: row.label,
    channel: row.channel as HostPaymentChannel,
    provider: row.provider,
    accountName: row.account_name,
    accountNumber: row.account_number,
    instructions: row.instructions ?? undefined,
    priority: row.priority ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchUserPaymentAccounts(): Promise<
  UserPaymentAccount[]
> {
  const supabase = getSupabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from("user_payment_accounts")
    .select(
      `
        id,
        label,
        channel,
        provider,
        account_name,
        account_number,
        instructions,
        priority,
        created_at,
        updated_at
      `,
    )
    .eq("owner_id", user.id)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map(mapUserPaymentAccount);
}
