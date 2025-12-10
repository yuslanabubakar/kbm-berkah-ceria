"use client";

import { useState } from "react";
import { UserPaymentAccountsManager } from "@/components/UserPaymentAccountsManager";
import type { UserPaymentAccount } from "@/types/expense";

type Props = {
  initialAccounts: UserPaymentAccount[];
};

export function DashboardPaymentSection({ initialAccounts }: Props) {
  const [userAccounts, setUserAccounts] =
    useState<UserPaymentAccount[]>(initialAccounts);

  return (
    <UserPaymentAccountsManager
      accounts={userAccounts}
      onChange={setUserAccounts}
    />
  );
}
