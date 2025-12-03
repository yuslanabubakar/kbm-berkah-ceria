import { getSupabaseServer } from "@/lib/supabaseServer";
import { Trip, Expense, ExpenseSplit, HostPaymentAccount, TripShare } from "@/types/expense";

export type TripSummary = Trip;

export type BalanceRow = {
  participantId: string;
  nama: string;
  totalPaid: number;
  totalShare: number;
  balance: number;
  adjustments: number;
};

export type TripParticipant = {
  id: string;
  nama: string;
  role?: string | null;
  isDriver?: boolean;
};

export type TripVehicleAssignment = {
  participantId: string;
  participantName: string;
  role?: string | null;
};

export type FleetVehicle = {
  id: string;
  label: string;
  plateNumber?: string | null;
  seatCapacity?: number | null;
  notes?: string | null;
};

export type TripLegVehicle = FleetVehicle & {
  assignments: TripVehicleAssignment[];
  departureTime?: string | null;
};

export type TripLeg = {
  id: string;
  order: number;
  label: string;
  start?: string | null;
  end?: string | null;
  vehicles: TripLegVehicle[];
};

export type TripDetail = {
  trip: {
    id: string;
    nama: string;
    lokasi: string;
    tanggalMulai: string;
    tanggalSelesai?: string;
    catatan?: string | null;
  };
  expenses: Expense[];
  balances: BalanceRow[];
  participants: TripParticipant[];
  legs: TripLeg[];
  adjustments: BalanceAdjustment[];
  fleetVehicles: FleetVehicle[];
  hostAccounts: HostPaymentAccount[];
  permissions: {
    isOwner: boolean;
    canEdit: boolean;
  };
};

export type BalanceAdjustment = {
  id: string;
  participantId: string;
  participantName: string;
  amountIdr: number;
  reason?: string | null;
  status: "draft" | "applied" | "void";
  createdAt: string;
  appliedAt?: string | null;
};

type TripRow = {
  id: string;
  owner_id: string;
  name: string;
  origin_city: string | null;
  destination_city: string | null;
  start_date: string | null;
  end_date: string | null;
  notes?: string | null;
};

type ExpenseParticipantRow = {
  id: string;
  display_name: string;
};

type ExpenseRow = {
  id: string;
  title: string;
  notes: string | null;
  amount_idr: string | number | null;
  issued_at: string;
  participants: ExpenseParticipantRow | ExpenseParticipantRow[] | null;
  is_excluded: boolean;
  expense_splits?: ExpenseSplitRow[] | null;
  leg_id: string;
  vehicle_id: string | null;
  share_scope: "leg" | "vehicle";
};

type ExpenseTotalRow = {
  trip_id: string;
  amount_idr: string | number | null;
};

type BalanceViewRow = {
  participant_id: string;
  display_name: string;
  total_paid: string | number | null;
  total_share: string | number | null;
  balance_idr: string | number | null;
  adjustment_idr?: string | number | null;
};

type ParticipantRow = {
  id: string;
  display_name: string;
  role: string | null;
};

type AssignmentRow = {
  participant_id: string;
  leg_id: string;
  vehicle_id: string;
  role: string | null;
  participants: { id: string; display_name: string } | null;
};

type LegRow = {
  id: string;
  leg_order: number;
  leg_type: string;
  origin: string | null;
  destination: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
};

type VehicleRow = {
  id: string;
  trip_id: string;
  label: string;
  plate_number: string | null;
  seat_capacity: number | null;
  notes: string | null;
};

type LegVehicleLinkRow = {
  leg_id: string;
  vehicle_id: string;
  departure_at: string | null;
};

type HostAccountRow = {
  id: string;
  trip_id: string;
  label: string;
  channel: "bank" | "ewallet" | "cash" | "other";
  provider: string | null;
  account_name: string;
  account_number: string;
  instructions: string | null;
  priority: number | null;
};

type ExpenseSplitRow = {
  participant_id: string;
  share_weight: string | number | null;
  share_amount_override: string | number | null;
  participants: ExpenseParticipantRow | null;
};

type AdjustmentRow = {
  id: string;
  participant_id: string;
  amount_idr: string | number | null;
  reason: string | null;
  status: "draft" | "applied" | "void";
  created_at: string;
  applied_at: string | null;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value == null) {
    return 0;
  }

  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : 0;
};

function formatLocation(origin?: string | null, destination?: string | null) {
  if (origin && destination) {
    return `${origin} ⇄ ${destination}`;
  }
  return origin ?? destination ?? "Tanpa lokasi";
}

function mapHostAccount(row: HostAccountRow): HostPaymentAccount {
  return {
    id: row.id,
    label: row.label,
    channel: row.channel,
    provider: row.provider,
    accountName: row.account_name,
    accountNumber: row.account_number,
    instructions: row.instructions ?? undefined,
    priority: row.priority ?? 0
  };
}

export async function fetchTripsSummary(): Promise<TripSummary[]> {
  const supabase = getSupabaseServer();
  const { data: authData } = await supabase.auth.getUser();
  const currentUser = authData.user ?? null;
  const currentUserId = currentUser?.id ?? null;
  const currentUserEmail = currentUser?.email?.toLowerCase() ?? null;
  const { data: tripsRaw, error } = await supabase
    .from("trips")
    .select("id, owner_id, name, origin_city, destination_city, start_date, end_date")
    .order("start_date", { ascending: false });

  if (error) {
    throw error;
  }

  const trips = (tripsRaw ?? []) as TripRow[];
  const ids = trips.map((trip) => trip.id);
  const totalsMap = new Map<string, number>();
  const hostAccountsMap = new Map<string, HostPaymentAccount[]>();
  const sharesMap = new Map<string, TripShare[]>();
  const editAccessMap = new Map<string, boolean>();

  if (ids.length) {
    const { data: totalsRaw, error: totalsError } = await supabase
      .from("expenses")
      .select("trip_id, amount_idr")
      .in("trip_id", ids);

    if (totalsError) {
      throw totalsError;
    }

    ((totalsRaw ?? []) as ExpenseTotalRow[]).forEach((row) => {
      const current = totalsMap.get(row.trip_id) ?? 0;
      totalsMap.set(row.trip_id, current + toNumber(row.amount_idr));
    });

    const { data: hostRaw, error: hostError } = await supabase
      .from("host_payment_accounts")
      .select("id, trip_id, label, channel, provider, account_name, account_number, instructions, priority, created_at")
      .in("trip_id", ids)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (hostError) {
      throw hostError;
    }

    ((hostRaw ?? []) as HostAccountRow[]).forEach((row) => {
      const list = hostAccountsMap.get(row.trip_id) ?? [];
      list.push(mapHostAccount(row));
      hostAccountsMap.set(row.trip_id, list);
    });

    const { data: sharesRaw, error: sharesError } = await supabase
      .from("trip_shares")
      .select("id, trip_id, shared_with_email, shared_with_user_id, can_edit, created_at")
      .in("trip_id", ids)
      .order("created_at", { ascending: false });

    if (!sharesError && sharesRaw) {
      (sharesRaw as Array<{
        id: string;
        trip_id: string;
        shared_with_email: string;
        shared_with_user_id: string | null;
        can_edit: boolean;
        created_at: string;
      }>).forEach((share) => {
        const list = sharesMap.get(share.trip_id) ?? [];
        list.push({
          id: share.id,
          shared_with_email: share.shared_with_email,
          can_edit: share.can_edit,
          created_at: share.created_at
        });
        sharesMap.set(share.trip_id, list);

        const normalizedShareEmail = share.shared_with_email?.toLowerCase?.() ?? null;
        if (currentUserId && share.shared_with_user_id === currentUserId) {
          if (share.can_edit) {
            editAccessMap.set(share.trip_id, true);
          } else if (!editAccessMap.has(share.trip_id)) {
            editAccessMap.set(share.trip_id, false);
          }
        } else if (!share.shared_with_user_id && currentUserEmail && normalizedShareEmail === currentUserEmail) {
          if (share.can_edit) {
            editAccessMap.set(share.trip_id, true);
          } else if (!editAccessMap.has(share.trip_id)) {
            editAccessMap.set(share.trip_id, false);
          }
        }
      });
    }
  }

  return trips.map<TripSummary>((trip) => ({
    id: trip.id,
    nama: trip.name,
    lokasi: formatLocation(trip.origin_city, trip.destination_city),
    originCity: trip.origin_city ?? null,
    destinationCity: trip.destination_city ?? null,
    tanggalMulai: trip.start_date ?? "",
    tanggalSelesai: trip.end_date ?? undefined,
    totalPengeluaran: totalsMap.get(trip.id) ?? 0,
    expenses: [],
    hostAccounts: hostAccountsMap.get(trip.id) ?? [],
    isOwner: trip.owner_id === currentUserId,
    canEdit: trip.owner_id === currentUserId || editAccessMap.get(trip.id) === true,
    shares: sharesMap.get(trip.id) ?? []
  }));
}

export async function fetchTripDetail(tripId: string): Promise<TripDetail | null> {
  const supabase = getSupabaseServer();
  const { data: authData } = await supabase.auth.getUser();
  const currentUser = authData.user ?? null;
  const currentUserId = currentUser?.id ?? null;
  const currentUserEmail = currentUser?.email ?? null;
  const { data: tripRaw, error: tripError } = await supabase
    .from("trips")
    .select("id, owner_id, name, origin_city, destination_city, start_date, end_date, notes")
    .eq("id", tripId)
    .maybeSingle();

  if (tripError) {
    throw tripError;
  }

  const trip = (tripRaw ?? null) as TripRow | null;

  if (!trip) {
    return null;
  }

  const isOwner = trip.owner_id === currentUserId;
  let shareAllowsEdit = false;

  if (!isOwner && (currentUserId || currentUserEmail)) {
    const orConditions: string[] = [];
    if (currentUserId) {
      orConditions.push(`shared_with_user_id.eq.${currentUserId}`);
    }
    if (currentUserEmail) {
      orConditions.push(`shared_with_email.eq.${currentUserEmail}`);
    }

    if (orConditions.length) {
      const { data: shareRow } = await supabase
        .from("trip_shares")
        .select("can_edit")
        .eq("trip_id", tripId)
        .or(orConditions.join(","))
        .maybeSingle();

      shareAllowsEdit = Boolean(shareRow?.can_edit);
    }
  }

  const [
    { data: expensesRaw, error: expenseError },
    { data: balancesRaw, error: balanceError },
    { data: participantsRaw, error: participantsError },
    { data: legsRaw, error: legsError },
    { data: vehiclesRaw, error: vehiclesError },
    { data: legVehicleLinksRaw, error: legVehicleLinksError },
    { data: adjustmentsRaw, error: adjustmentsError },
    { data: hostAccountsRaw, error: hostAccountsError }
  ] = await Promise.all([
    supabase
      .from("expenses")
      .select(
        `id,
         title,
         notes,
         amount_idr,
         issued_at,
        leg_id,
        vehicle_id,
        share_scope,
         is_excluded,
         participants:participants!expenses_paid_by_fkey (id, display_name),
         expense_splits (participant_id, share_weight, share_amount_override, participants (id, display_name))`
      )
      .eq("trip_id", tripId)
      .order("issued_at", { ascending: false })
      .returns<ExpenseRow[]>(),
    supabase
      .from("trip_balances")
      .select("participant_id, display_name, total_paid, total_share, balance_idr")
      .eq("trip_id", tripId)
      .order("balance_idr", { ascending: false })
      .returns<BalanceViewRow[]>(),
    supabase
      .from("participants")
      .select("id, display_name, role")
      .eq("trip_id", tripId)
      .order("display_name", { ascending: true })
      .returns<ParticipantRow[]>(),
    supabase
      .from("trip_legs")
      .select("id, leg_order, leg_type, origin, destination, start_datetime, end_datetime")
      .eq("trip_id", tripId)
      .order("leg_order", { ascending: true })
      .returns<LegRow[]>(),
    supabase
      .from("trip_vehicles")
      .select("id, trip_id, label, plate_number, seat_capacity, notes")
      .eq("trip_id", tripId)
      .order("label", { ascending: true })
      .returns<VehicleRow[]>(),
    supabase
      .from("leg_vehicle_links")
      .select("leg_id, vehicle_id, departure_at")
      .eq("trip_id", tripId)
      .returns<LegVehicleLinkRow[]>(),
    supabase
      .from("balance_adjustments")
      .select("id, participant_id, amount_idr, reason, status, created_at, applied_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .returns<AdjustmentRow[]>(),
    supabase
      .from("host_payment_accounts")
      .select("id, trip_id, label, channel, provider, account_name, account_number, instructions, priority, created_at")
      .eq("trip_id", tripId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<HostAccountRow[]>()
  ]);

  if (expenseError) {
    throw expenseError;
  }

  if (balanceError) {
    throw balanceError;
  }

  if (participantsError) {
    throw participantsError;
  }

  if (legsError) {
    throw legsError;
  }

  if (vehiclesError) {
    throw vehiclesError;
  }

  if (legVehicleLinksError) {
    throw legVehicleLinksError;
  }

  if (adjustmentsError) {
    throw adjustmentsError;
  }

  if (hostAccountsError) {
    throw hostAccountsError;
  }

  const expenses = expensesRaw ?? [];
  const balances = (balancesRaw ?? []) as BalanceViewRow[];
  const participants = (participantsRaw ?? []) as ParticipantRow[];
  const legs = (legsRaw ?? []) as LegRow[];
  const vehicles = (vehiclesRaw ?? []) as VehicleRow[];
  const legVehicleLinks = (legVehicleLinksRaw ?? []) as LegVehicleLinkRow[];
  const adjustments = (adjustmentsRaw ?? []) as AdjustmentRow[];
  const hostAccounts = (hostAccountsRaw ?? []) as HostAccountRow[];

  const driverParticipantIds = new Set<string>();
  let assignments: AssignmentRow[] = [];
  const legIds = legs.map((leg) => leg.id);

  if (legIds.length) {
    const { data: assignmentsRaw, error: assignmentsError } = await supabase
      .from("vehicle_assignments")
      .select("participant_id, leg_id, vehicle_id, role, participants(id, display_name)")
      .in("leg_id", legIds)
      .returns<AssignmentRow[]>();

    if (assignmentsError) {
      throw assignmentsError;
    }

    assignments = assignmentsRaw ?? [];

    assignments.forEach((assignment) => {
      if (assignment.role === "driver") {
        driverParticipantIds.add(assignment.participant_id);
      }
    });
  }

  const mappedExpenses: Expense[] = expenses.map((expense) => {
    const paidByRaw = Array.isArray(expense.participants)
      ? expense.participants[0]
      : expense.participants;
    const splits: ExpenseSplit[] = (expense.expense_splits ?? []).map((split) => ({
      participantId: split.participant_id,
      participantName: split.participants?.display_name ?? "Tanpa nama",
      shareWeight: toNumber(split.share_weight),
      shareAmountOverride:
        split.share_amount_override != null ? toNumber(split.share_amount_override) : undefined
    }));
    return {
      id: expense.id,
      judul: expense.title,
      amountIdr: toNumber(expense.amount_idr),
      paidBy: {
        id: paidByRaw?.id ?? "unknown",
        nama: paidByRaw?.display_name ?? "Tanpa nama"
      },
      date: expense.issued_at,
      notes: expense.notes ?? undefined,
      legId: expense.leg_id,
      vehicleId: expense.vehicle_id,
      shareScope: expense.share_scope,
      splitWith: [],
      isExcluded: expense.is_excluded,
      splits
    };
  });

  const mappedBalances: BalanceRow[] = balances.map((row) => ({
    participantId: row.participant_id,
    nama: row.display_name,
    totalPaid: toNumber(row.total_paid),
    totalShare: toNumber(row.total_share),
    balance: toNumber(row.balance_idr),
    adjustments: toNumber(row.adjustment_idr)
  }));

  const mappedParticipants: TripParticipant[] = participants.map((participant) => ({
    id: participant.id,
    nama: participant.display_name,
    role: participant.role,
    isDriver: driverParticipantIds.has(participant.id)
  }));

  const fleetVehicles: FleetVehicle[] = vehicles.map((vehicle) => ({
    id: vehicle.id,
    label: vehicle.label,
    plateNumber: vehicle.plate_number,
    seatCapacity: vehicle.seat_capacity,
    notes: vehicle.notes ?? undefined
  }));

  const fleetMap = new Map(fleetVehicles.map((vehicle) => [vehicle.id, vehicle]));

  const assignmentsByLegVehicle = assignments.reduce<Record<string, TripVehicleAssignment[]>>((acc, assignment) => {
    const key = `${assignment.leg_id}:${assignment.vehicle_id}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push({
      participantId: assignment.participant_id,
      participantName: assignment.participants?.display_name ?? "Tanpa nama",
      role: assignment.role
    });
    return acc;
  }, {});

  const legLinks = legVehicleLinks.reduce<
    Record<string, { vehicleId: string; departureAt: string | null }[]>
  >((acc, link) => {
    if (!acc[link.leg_id]) {
      acc[link.leg_id] = [];
    }
    acc[link.leg_id].push({ vehicleId: link.vehicle_id, departureAt: link.departure_at });
    return acc;
  }, {});

  const mappedLegs: TripLeg[] = legs.map((leg) => ({
    id: leg.id,
    order: leg.leg_order,
    label: formatLocation(leg.origin, leg.destination),
    start: leg.start_datetime,
    end: leg.end_datetime,
    vehicles: (legLinks[leg.id] ?? [])
      .map((link) => {
        const base = fleetMap.get(link.vehicleId);
        if (!base) {
          return null;
        }
        const key = `${leg.id}:${link.vehicleId}`;
        return {
          ...base,
          assignments: assignmentsByLegVehicle[key] ?? [],
          departureTime: link.departureAt
        } as TripLegVehicle;
      })
      .filter(Boolean) as TripLegVehicle[]
  }));

  const participantNameMap = new Map(mappedParticipants.map((p) => [p.id, p.nama]));
  const mappedAdjustments: BalanceAdjustment[] = adjustments.map((adj) => ({
    id: adj.id,
    participantId: adj.participant_id,
    participantName: participantNameMap.get(adj.participant_id) ?? "Tanpa nama",
    amountIdr: toNumber(adj.amount_idr),
    reason: adj.reason,
    status: adj.status,
    createdAt: adj.created_at,
    appliedAt: adj.applied_at
  }));

  return {
    trip: {
      id: trip.id,
      nama: trip.name,
      lokasi: formatLocation(trip.origin_city, trip.destination_city),
      tanggalMulai: trip.start_date ?? "",
      tanggalSelesai: trip.end_date ?? undefined,
      catatan: trip.notes
    },
    expenses: mappedExpenses,
    balances: mappedBalances,
    participants: mappedParticipants,
    legs: mappedLegs,
    adjustments: mappedAdjustments,
    fleetVehicles,
    hostAccounts: hostAccounts.map(mapHostAccount),
    permissions: {
      isOwner,
      canEdit: isOwner || shareAllowsEdit
    }
  };
}
