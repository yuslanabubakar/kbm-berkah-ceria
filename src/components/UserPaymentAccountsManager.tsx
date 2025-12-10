"use client";

import { useEffect, useMemo, useState } from "react";
import { AddPaymentAccountForm } from "@/components/AddPaymentAccountForm";
import { EditPaymentAccountForm } from "@/components/EditPaymentAccountForm";
import { PaymentAccountsList } from "@/components/PaymentAccountsList";
import type { UserPaymentAccount } from "@/types/expense";

type Props = {
  accounts: UserPaymentAccount[];
  onChange: (accounts: UserPaymentAccount[]) => void;
};

function sortAccounts(list: UserPaymentAccount[]) {
  return [...list].sort((a, b) => {
    if ((a.priority ?? 0) !== (b.priority ?? 0)) {
      return (b.priority ?? 0) - (a.priority ?? 0);
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function UserPaymentAccountsManager({ accounts, onChange }: Props) {
  const sortedAccounts = useMemo(() => sortAccounts(accounts), [accounts]);
  const [editingAccount, setEditingAccount] =
    useState<UserPaymentAccount | null>(null);
  const [showForm, setShowForm] = useState(sortedAccounts.length === 0);

  useEffect(() => {
    if (sortedAccounts.length === 0) {
      setShowForm(true);
    }
  }, [sortedAccounts.length]);

  useEffect(() => {
    if (editingAccount) {
      const latest = sortedAccounts.find(
        (account) => account.id === editingAccount.id,
      );
      if (!latest) {
        setEditingAccount(null);
      } else if (latest !== editingAccount) {
        setEditingAccount(latest);
      }
    }
  }, [editingAccount, sortedAccounts]);

  function handleAdded(account: UserPaymentAccount) {
    onChange(sortAccounts([...sortedAccounts, account]));
    setShowForm(false);
  }

  function handleEditRequest(account: UserPaymentAccount) {
    setEditingAccount(account);
    setShowForm(false);
  }

  function handleEditSuccess(account: UserPaymentAccount) {
    onChange(
      sortAccounts(
        sortedAccounts.map((item) => (item.id === account.id ? account : item)),
      ),
    );
    setEditingAccount(null);
  }

  function handleDelete(accountId: string) {
    onChange(
      sortAccounts(sortedAccounts.filter((item) => item.id !== accountId)),
    );
    if (editingAccount?.id === accountId) {
      setEditingAccount(null);
    }
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Metode pembayaran saya
          </h2>
          <p className="text-sm text-slate-500">
            Simpan rekening dan e-wallet di sini, lalu lampirkan ke setiap trip.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((prev) => !prev);
            setEditingAccount(null);
          }}
          className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
        >
          {showForm ? "Tutup" : "+ Tambah metode"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <AddPaymentAccountForm onSuccess={handleAdded} />
        </div>
      )}

      {editingAccount && (
        <div className="rounded-2xl border border-brand-blue bg-blue-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              Edit metode pembayaran
            </h3>
            <button
              type="button"
              onClick={() => setEditingAccount(null)}
              className="text-sm text-slate-600 hover:text-slate-800"
            >
              Batal
            </button>
          </div>
          <EditPaymentAccountForm
            account={editingAccount}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditingAccount(null)}
          />
        </div>
      )}

      <PaymentAccountsList
        accounts={sortedAccounts}
        onDelete={handleDelete}
        onEdit={handleEditRequest}
      />
    </div>
  );
}
