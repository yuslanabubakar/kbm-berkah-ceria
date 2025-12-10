"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  TripPaymentAccountAttachment,
  UserPaymentAccount,
} from "@/types/expense";

type Props = {
  tripId: string;
  tripName: string;
  attachments: TripPaymentAccountAttachment[];
  userAccounts: UserPaymentAccount[];
};

type AttachFormState = {
  paymentAccountId: string;
  customLabel: string;
  customInstructions: string;
  customPriority: string;
  error?: string;
  loading: boolean;
};

type EditFormState = {
  customLabel: string;
  customInstructions: string;
  customPriority: string;
  loading: boolean;
  error?: string;
};

function sortAttachments(list: TripPaymentAccountAttachment[]) {
  return [...list].sort((a, b) => {
    if (a.priority !== b.priority) {
      return (b.priority ?? 0) - (a.priority ?? 0);
    }

    return new Date(a.attachedAt).getTime() - new Date(b.attachedAt).getTime();
  });
}

function formatChannel(channel: TripPaymentAccountAttachment["channel"]) {
  const labels: Record<TripPaymentAccountAttachment["channel"], string> = {
    bank: "Bank",
    ewallet: "E-Wallet",
    cash: "Tunai",
    other: "Lainnya",
  };
  return labels[channel] ?? channel;
}

export function TripPaymentManager({
  tripId,
  tripName,
  attachments: initialAttachments,
  userAccounts,
}: Props) {
  const [attachments, setAttachments] = useState<
    TripPaymentAccountAttachment[]
  >(() => sortAttachments(initialAttachments));
  const [attachForm, setAttachForm] = useState<AttachFormState>({
    paymentAccountId: "",
    customLabel: "",
    customInstructions: "",
    customPriority: "",
    loading: false,
  });
  const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(
    null,
  );
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [showAttachForm, setShowAttachForm] = useState(false);

  const availableAccounts = useMemo(() => {
    const attachedAccountIds = new Set(
      attachments.map((attachment) => attachment.paymentAccountId),
    );
    return userAccounts.filter(
      (account) => !attachedAccountIds.has(account.id),
    );
  }, [attachments, userAccounts]);

  useEffect(() => {
    setAttachments((prev) =>
      sortAttachments(
        prev.map((attachment) => {
          const base = userAccounts.find(
            (account) => account.id === attachment.paymentAccountId,
          );
          if (!base) {
            return attachment;
          }

          const mergedPriority =
            attachment.customPriority ?? base.priority ?? 0;
          const mergedInstructions =
            attachment.customInstructions ?? base.instructions ?? undefined;

          return {
            ...attachment,
            label: attachment.customLabel ?? base.label,
            channel: base.channel,
            provider: base.provider ?? undefined,
            accountName: base.accountName,
            accountNumber: base.accountNumber,
            instructions: mergedInstructions,
            priority: mergedPriority,
          };
        }),
      ),
    );
  }, [userAccounts]);

  function resetAttachForm() {
    setAttachForm({
      paymentAccountId: "",
      customLabel: "",
      customInstructions: "",
      customPriority: "",
      loading: false,
    });
  }

  async function handleAttach(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!attachForm.paymentAccountId) {
      setAttachForm((prev) => ({
        ...prev,
        error: "Pilih salah satu metode pembayaran",
      }));
      return;
    }

    setAttachForm((prev) => ({ ...prev, loading: true, error: undefined }));

    const trimmedPriority = attachForm.customPriority.trim();
    let customPriority: number | undefined;

    if (trimmedPriority) {
      const parsed = Number(trimmedPriority);
      if (!Number.isFinite(parsed)) {
        setAttachForm((prev) => ({
          ...prev,
          loading: false,
          error: "Prioritas harus berupa angka",
        }));
        return;
      }
      customPriority = parsed;
    }

    const payload = {
      paymentAccountId: attachForm.paymentAccountId,
      customLabel: attachForm.customLabel || undefined,
      customInstructions: attachForm.customInstructions || undefined,
      customPriority,
    };

    try {
      const response = await fetch(`/api/trips/${tripId}/payment-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as {
        message?: string;
        data?: TripPaymentAccountAttachment;
      } | null;

      if (!response.ok) {
        throw new Error(
          result?.message || "Gagal melampirkan metode pembayaran",
        );
      }

      const attachment = result?.data;
      if (attachment) {
        setAttachments((prev) => sortAttachments([...prev, attachment]));
      }

      resetAttachForm();
      setShowAttachForm(false);
    } catch (error) {
      setAttachForm((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal melampirkan metode pembayaran",
      }));
      return;
    }

    setAttachForm((prev) => ({ ...prev, loading: false }));
  }

  function handleStartEdit(attachment: TripPaymentAccountAttachment) {
    setEditingAttachmentId(attachment.id);
    setEditForm({
      customLabel: attachment.customLabel ?? "",
      customInstructions: attachment.customInstructions ?? "",
      customPriority:
        attachment.customPriority != null
          ? String(attachment.customPriority)
          : "",
      loading: false,
    });
  }

  function handleCancelEdit() {
    setEditingAttachmentId(null);
    setEditForm(null);
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingAttachmentId || !editForm) return;

    setEditForm({ ...editForm, loading: true, error: undefined });

    const trimmedPriority = editForm.customPriority.trim();
    let customPriority: number | null = null;

    if (trimmedPriority) {
      const parsed = Number(trimmedPriority);
      if (!Number.isFinite(parsed)) {
        setEditForm((prev) =>
          prev
            ? {
                ...prev,
                loading: false,
                error: "Prioritas harus berupa angka",
              }
            : null,
        );
        return;
      }
      customPriority = parsed;
    }

    const payload = {
      customLabel: editForm.customLabel,
      customInstructions: editForm.customInstructions,
      customPriority,
    };

    try {
      const response = await fetch(
        `/api/trips/${tripId}/payment-accounts/${editingAttachmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = (await response.json().catch(() => null)) as {
        message?: string;
        data?: TripPaymentAccountAttachment;
      } | null;

      if (!response.ok) {
        throw new Error(result?.message || "Gagal memperbarui lampiran");
      }

      const attachment = result?.data;
      if (attachment) {
        setAttachments((prev) =>
          sortAttachments(
            prev.map((item) =>
              item.id === editingAttachmentId ? attachment : item,
            ),
          ),
        );
      }

      setEditingAttachmentId(null);
      setEditForm(null);
    } catch (error) {
      setEditForm((prev) =>
        prev
          ? {
              ...prev,
              loading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Gagal memperbarui lampiran",
            }
          : null,
      );
      return;
    }
  }

  async function handleDetach(attachmentId: string) {
    if (!confirm("Lepas metode pembayaran ini dari trip?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/trips/${tripId}/payment-accounts/${attachmentId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(result?.message || "Gagal melepas lampiran");
      }

      setAttachments((prev) =>
        prev.filter((attachment) => attachment.id !== attachmentId),
      );

      if (editingAttachmentId === attachmentId) {
        setEditingAttachmentId(null);
        setEditForm(null);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal melepas lampiran");
    }
  }

  const isEmpty = attachments.length === 0;

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Metode Pembayaran Trip
          </h3>
          <p className="text-sm text-slate-500">Trip: {tripName}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAttachForm((prev) => !prev);
            resetAttachForm();
          }}
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
        >
          {showAttachForm ? "Tutup" : "+ Lampirkan metode"}
        </button>
      </div>

      {showAttachForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          {userAccounts.length === 0 ? (
            <p className="text-sm text-slate-500">
              Belum ada metode pembayaran pribadi. Tambahkan dulu di bagian atas
              dashboard.
            </p>
          ) : (
            <form onSubmit={handleAttach} className="space-y-4">
              {attachForm.error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {attachForm.error}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Pilih metode
                </label>
                <select
                  value={attachForm.paymentAccountId}
                  onChange={(event) =>
                    setAttachForm((prev) => ({
                      ...prev,
                      paymentAccountId: event.target.value,
                      error: undefined,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">-- Pilih salah satu --</option>
                  {availableAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.label} · {account.accountNumber}
                    </option>
                  ))}
                </select>
                {availableAccounts.length === 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Semua metode sudah dilampirkan ke trip ini.
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Label khusus
                  <input
                    type="text"
                    maxLength={80}
                    value={attachForm.customLabel}
                    onChange={(event) =>
                      setAttachForm((prev) => ({
                        ...prev,
                        customLabel: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Kosongkan untuk pakai nama asli"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Prioritas khusus
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={attachForm.customPriority}
                    onChange={(event) =>
                      setAttachForm((prev) => ({
                        ...prev,
                        customPriority: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Kosongkan untuk ikut prioritas asli"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Instruksi khusus
                <textarea
                  value={attachForm.customInstructions}
                  onChange={(event) =>
                    setAttachForm((prev) => ({
                      ...prev,
                      customInstructions: event.target.value,
                    }))
                  }
                  maxLength={280}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Kosongkan untuk menggunakan catatan bawaan"
                />
              </label>

              <button
                type="submit"
                disabled={attachForm.loading || availableAccounts.length === 0}
                className="w-full rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-50"
              >
                {attachForm.loading ? "Menyimpan..." : "Lampirkan ke trip"}
              </button>
            </form>
          )}
        </div>
      )}

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Belum ada metode pembayaran yang dilampirkan. Tambahkan metode pribadi
          lalu lampirkan ke trip ini.
        </div>
      ) : (
        <div className="space-y-4">
          {attachments.map((attachment) => {
            const isEditing = editingAttachmentId === attachment.id;
            const baseAccount = userAccounts.find(
              (account) => account.id === attachment.paymentAccountId,
            );
            return (
              <div
                key={attachment.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-semibold text-slate-900">
                        {attachment.label}
                      </h4>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {formatChannel(attachment.channel)}
                      </span>
                      {attachment.priority != null &&
                        attachment.priority > 0 && (
                          <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs text-brand-blue">
                            Prioritas {attachment.priority}
                          </span>
                        )}
                    </div>
                    {attachment.provider && (
                      <p className="text-xs text-slate-500">
                        {attachment.provider}
                      </p>
                    )}
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">A/n:</span>{" "}
                      {attachment.accountName}
                    </p>
                    <p className="font-mono text-sm text-slate-900">
                      {attachment.accountNumber}
                    </p>
                    {attachment.instructions && (
                      <p className="text-xs text-slate-600">
                        ℹ️ {attachment.instructions}
                      </p>
                    )}
                    {attachment.customLabel && (
                      <p className="text-xs text-indigo-500">
                        Label khusus: {attachment.customLabel}
                      </p>
                    )}
                    {attachment.customInstructions && (
                      <p className="text-xs text-indigo-500">
                        Instruksi khusus: {attachment.customInstructions}
                      </p>
                    )}
                    {attachment.customPriority != null && (
                      <p className="text-xs text-indigo-500">
                        Prioritas khusus: {attachment.customPriority}
                      </p>
                    )}
                    {baseAccount &&
                      !attachment.customLabel &&
                      !attachment.customInstructions &&
                      attachment.priority === baseAccount.priority && (
                        <p className="text-xs text-slate-400">
                          Menggunakan pengaturan bawaan
                        </p>
                      )}
                  </div>
                  <div className="flex flex-shrink-0 items-start gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(attachment)}
                      className="text-sm text-brand-blue hover:text-brand-blue/80"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDetach(attachment.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Lepas
                    </button>
                  </div>
                </div>

                {isEditing && editForm && (
                  <form
                    onSubmit={handleEditSubmit}
                    className="mt-4 space-y-3 rounded-lg border border-brand-blue/40 bg-blue-50 p-4"
                  >
                    {editForm.error && (
                      <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">
                        {editForm.error}
                      </p>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm font-medium text-slate-700">
                        Label khusus
                        <input
                          type="text"
                          maxLength={80}
                          value={editForm.customLabel}
                          onChange={(event) =>
                            setEditForm(
                              (prev) =>
                                prev && {
                                  ...prev,
                                  customLabel: event.target.value,
                                },
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-sm font-medium text-slate-700">
                        Prioritas khusus
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editForm.customPriority}
                          onChange={(event) =>
                            setEditForm(
                              (prev) =>
                                prev && {
                                  ...prev,
                                  customPriority: event.target.value,
                                },
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          placeholder="Kosongkan untuk pakai bawaan"
                        />
                      </label>
                    </div>
                    <label className="text-sm font-medium text-slate-700">
                      Instruksi khusus
                      <textarea
                        value={editForm.customInstructions}
                        onChange={(event) =>
                          setEditForm(
                            (prev) =>
                              prev && {
                                ...prev,
                                customInstructions: event.target.value,
                              },
                          )
                        }
                        rows={2}
                        maxLength={280}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={editForm.loading}
                        className="flex-1 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-60"
                      >
                        {editForm.loading ? "Menyimpan..." : "Simpan perubahan"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={editForm.loading}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Batal
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Kosongkan semua field untuk kembali ke pengaturan bawaan
                      akun.
                    </p>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
