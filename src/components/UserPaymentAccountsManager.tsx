"use client";

import { useEffect, useMemo, useState } from "react";
import { AddPaymentAccountForm } from "@/components/AddPaymentAccountForm";
import { EditPaymentAccountForm } from "@/components/EditPaymentAccountForm";
import { PaymentAccountsList } from "@/components/PaymentAccountsList";
import type { UserPaymentAccount } from "@/types/expense";
import { Plus, CreditCard } from "lucide-react";

type Props = {
  accounts: UserPaymentAccount[];
  onChange: (accounts: UserPaymentAccount[]) => void;
};

function sortAccounts(list: UserPaymentAccount[]) {
  return [...list].sort((a, b) => {
    if ((a.priority ?? 0) !== (b.priority ?? 0))
      return (b.priority ?? 0) - (a.priority ?? 0);
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function UserPaymentAccountsManager({ accounts, onChange }: Props) {
  const sortedAccounts = useMemo(() => sortAccounts(accounts), [accounts]);
  const [editingAccount, setEditingAccount] =
    useState<UserPaymentAccount | null>(null);
  const [showForm, setShowForm] = useState(sortedAccounts.length === 0);

  useEffect(() => {
    if (sortedAccounts.length === 0) setShowForm(true);
  }, [sortedAccounts.length]);

  useEffect(() => {
    if (editingAccount) {
      const latest = sortedAccounts.find((a) => a.id === editingAccount.id);
      if (!latest) setEditingAccount(null);
      else if (latest !== editingAccount) setEditingAccount(latest);
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
    if (editingAccount?.id === accountId) setEditingAccount(null);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "rgba(46, 90, 172, 0.12)" }}
          >
            <CreditCard size={18} style={{ color: "#2E5AAC" }} />
          </div>
          <div>
            <h2
              className="text-base font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Metode Pembayaran
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Simpan rekening dan e-wallet, lalu lampirkan ke trip
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((p) => !p);
            setEditingAccount(null);
          }}
          className="btn-primary text-xs"
        >
          <Plus size={14} />
          {showForm ? "Tutup" : "Tambah Rekening"}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div
          className="rounded-2xl p-4 animate-slide-down"
          style={{
            background: "var(--bg-muted)",
            border: "1px solid var(--border-color)",
          }}
        >
          <AddPaymentAccountForm onSuccess={handleAdded} />
        </div>
      )}

      {/* Edit Form */}
      {editingAccount && (
        <div
          className="rounded-2xl p-4 animate-slide-down"
          style={{
            background: "rgba(46, 90, 172, 0.06)",
            border: "1px solid rgba(46, 90, 172, 0.2)",
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3
              className="text-sm font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Edit metode pembayaran
            </h3>
            <button
              type="button"
              onClick={() => setEditingAccount(null)}
              className="text-xs font-medium"
              style={{ color: "var(--text-muted)" }}
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
