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
  paymentAccountId?: string;
  label: string;
  channel: HostPaymentChannel;
  provider?: string | null;
  accountName: string;
  accountNumber: string;
  instructions?: string | null;
  priority: number;
};

export type UserPaymentAccount = {
  id: string;
  label: string;
  channel: HostPaymentChannel;
  provider?: string | null;
  accountName: string;
  accountNumber: string;
  instructions?: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type TripPaymentAccountAttachment = HostPaymentAccount & {
  paymentAccountId: string;
  customLabel?: string | null;
  customInstructions?: string | null;
  customPriority?: number | null;
  attachedAt: string;
  updatedAt: string;
};

export type Expense = {
  id: string;
  judul: string;
  amountIdr: number;
  paidBy: Participant;
  expenseType?: string;
  date: string;
  notes?: string;
  legId?: string;
  vehicleId?: string | null;
  shareScope: ExpenseShareScope;
  splitWith: Participant[];
  splits?: ExpenseSplit[];
  isExcluded?: boolean;
};

export type TripShare = {
  id: string;
  shared_with_email: string;
  can_edit: boolean;
  created_at: string;
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
  isOwner: boolean;
  canEdit: boolean;
  shares: TripShare[];
};
