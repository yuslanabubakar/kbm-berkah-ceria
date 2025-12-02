export type Participant = {
  id: string;
  nama: string;
  avatar?: string;
};

export type ExpenseSplit = {
  participantId: string;
  participantName: string;
  shareWeight: number;
  shareAmountOverride?: number;
};

export type ExpenseShareScope = "leg" | "vehicle";

export type HostPaymentChannel = "bank" | "ewallet" | "cash" | "other";

export type HostPaymentAccount = {
  id: string;
  label: string;
  channel: HostPaymentChannel;
  provider?: string | null;
  accountName: string;
  accountNumber: string;
  instructions?: string | null;
  priority: number;
};

export type Expense = {
  id: string;
  judul: string;
  amountIdr: number;
  paidBy: Participant;
  date: string;
  notes?: string;
  legId?: string;
  vehicleId?: string | null;
  shareScope: ExpenseShareScope;
  splitWith: Participant[];
  splits?: ExpenseSplit[];
  isExcluded?: boolean;
};

export type Trip = {
  id: string;
  nama: string;
  lokasi: string;
  originCity?: string | null;
  destinationCity?: string | null;
  tanggalMulai: string;
  tanggalSelesai?: string;
  totalPengeluaran: number;
  expenses: Expense[];
  hostAccounts: HostPaymentAccount[];
};
