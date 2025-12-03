"use client";

import { useState } from "react";
import { AddPaymentAccountForm } from "@/components/AddPaymentAccountForm";
import { EditPaymentAccountForm } from "@/components/EditPaymentAccountForm";
import { PaymentAccountsList } from "@/components/PaymentAccountsList";
import type { HostPaymentAccount } from "@/types/expense";

type Props = {
  tripId: string;
  tripName: string;
  accounts: HostPaymentAccount[];
};

export function TripPaymentManager({ tripId, tripName, accounts: initialAccounts }: Props) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<HostPaymentAccount | null>(null);

  async function handleRefresh() {
    const response = await fetch(`/api/trips/${tripId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.hostAccounts) {
        setAccounts(data.hostAccounts);
      }
    }
    setShowForm(false);
    setEditingAccount(null);
  }

  function handleEdit(account: HostPaymentAccount) {
    setEditingAccount(account);
    setShowForm(false);
  }

  function handleCancelEdit() {
    setEditingAccount(null);
  }

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Metode Pembayaran</h3>
          <p className="text-sm text-slate-500">Trip: {tripName}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setEditingAccount(null);
          }}
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
        >
          {showForm ? "Tutup" : "+ Tambah"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <AddPaymentAccountForm tripId={tripId} onSuccess={handleRefresh} />
        </div>
      )}

      {editingAccount && (
        <div className="rounded-lg border border-brand-blue bg-blue-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-semibold text-slate-900">Edit Metode Pembayaran</h4>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-sm text-slate-600 hover:text-slate-800"
            >
              Batal
            </button>
          </div>
          <EditPaymentAccountForm
            tripId={tripId}
            account={editingAccount}
            onSuccess={handleRefresh}
            onCancel={handleCancelEdit}
          />
        </div>
      )}

      <PaymentAccountsList tripId={tripId} accounts={accounts} onUpdate={handleRefresh} onEdit={handleEdit} />
    </div>
  );
}
