import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  trips,
  participants,
  tripLegs,
  fleetVehicles,
  legVehicleLinks,
  vehicleAssignments,
  expenses,
  expenseSplits,
  balanceAdjustments,
  userPaymentAccounts,
  tripPaymentAccounts,
  tripShares,
} from "@/db/schema";
import { eq, inArray, desc, asc, and } from "drizzle-orm";
import {
  Trip,
  Expense,
  ExpenseSplit,
  HostPaymentAccount,
  TripShare,
  TripPaymentAccountAttachment,
} from "@/types/expense";

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
  paymentAttachments: TripPaymentAccountAttachment[];
  permissions: {
    isOwner: boolean;
    canEdit: boolean;
  };
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

function formatLocation(origin?: string | null, destination?: string | null) {
  if (origin && destination) {
    return `${origin} ⇄ ${destination}`;
  }
  return origin ?? destination ?? "Tanpa lokasi";
}

export async function fetchTripsSummary(): Promise<TripSummary[]> {
  const db = getDb();
  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const currentUserEmail = currentUser?.email?.toLowerCase() ?? null;

  const allTrips = await db
    .select()
    .from(trips)
    .orderBy(desc(trips.startDate))
    .all();
  if (!allTrips.length) return [];

  const tripIds = allTrips.map((t) => t.id);

  // 1. Fetch Expense Totals per trip
  const allExpenses = await db
    .select({ tripId: expenses.tripId, amountIdr: expenses.amountIdr })
    .from(expenses)
    .where(inArray(expenses.tripId, tripIds))
    .all();

  const totalsMap = new Map<string, number>();
  for (const exp of allExpenses) {
    const current = totalsMap.get(exp.tripId) ?? 0;
    totalsMap.set(exp.tripId, current + toNumber(exp.amountIdr));
  }

  // 2. Fetch Payment Accounts
  const tripAccounts = await db
    .select()
    .from(tripPaymentAccounts)
    .where(inArray(tripPaymentAccounts.tripId, tripIds))
    .all();

  const hostAccountsMap = new Map<string, TripPaymentAccountAttachment[]>();
  if (tripAccounts.length) {
    const accountIds = [
      ...new Set(tripAccounts.map((a) => a.paymentAccountId)),
    ];
    const userAccs = await db
      .select()
      .from(userPaymentAccounts)
      .where(inArray(userPaymentAccounts.id, accountIds))
      .all();
    const userAccMap = new Map(userAccs.map((a) => [a.id, a]));

    for (const tAcc of tripAccounts) {
      const base = userAccMap.get(tAcc.paymentAccountId);
      if (!base) continue;

      const attachment: TripPaymentAccountAttachment = {
        id: tAcc.id,
        paymentAccountId: base.id,
        label: tAcc.customLabel ?? base.label,
        channel: base.channel as "bank" | "ewallet" | "cash" | "other",
        provider: base.provider,
        accountName: base.accountName,
        accountNumber: base.accountNumber,
        instructions: tAcc.customInstructions ?? base.instructions ?? undefined,
        priority: tAcc.customPriority ?? base.priority,
        customLabel: tAcc.customLabel ?? undefined,
        customInstructions: tAcc.customInstructions ?? undefined,
        customPriority: tAcc.customPriority ?? undefined,
        attachedAt: tAcc.createdAt,
        updatedAt: tAcc.updatedAt,
      };

      const list = hostAccountsMap.get(tAcc.tripId) ?? [];
      list.push(attachment);
      hostAccountsMap.set(tAcc.tripId, list);
    }
  }

  // 3. Fetch Trip Shares
  const sharesMap = new Map<string, TripShare[]>();
  const editAccessMap = new Map<string, boolean>();

  const sharesRows = await db
    .select()
    .from(tripShares)
    .where(inArray(tripShares.tripId, tripIds))
    .orderBy(desc(tripShares.createdAt))
    .all();

  for (const s of sharesRows) {
    const list = sharesMap.get(s.tripId) ?? [];
    list.push({
      id: s.id,
      shared_with_email: s.sharedWithEmail,
      can_edit: s.canEdit,
      created_at: s.createdAt,
    });
    sharesMap.set(s.tripId, list);

    if (
      currentUserEmail &&
      s.sharedWithEmail.toLowerCase() === currentUserEmail
    ) {
      if (s.canEdit) editAccessMap.set(s.tripId, true);
      else if (!editAccessMap.has(s.tripId)) editAccessMap.set(s.tripId, false);
    }
  }

  return allTrips.map((t) => ({
    id: t.id,
    nama: t.name,
    lokasi: formatLocation(t.originCity, t.destinationCity),
    originCity: t.originCity ?? null,
    destinationCity: t.destinationCity ?? null,
    tanggalMulai: t.startDate ?? "",
    tanggalSelesai: t.endDate ?? undefined,
    totalPengeluaran: totalsMap.get(t.id) ?? 0,
    expenses: [],
    hostAccounts: hostAccountsMap.get(t.id) ?? [],
    isOwner: t.ownerId === currentUserId,
    canEdit: t.ownerId === currentUserId || editAccessMap.get(t.id) === true,
    shares: sharesMap.get(t.id) ?? [],
  }));
}

export async function fetchTripDetail(
  tripId: string,
): Promise<TripDetail | null> {
  const db = getDb();
  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const currentUserEmail = currentUser?.email?.toLowerCase() ?? null;

  const trip = await db.select().from(trips).where(eq(trips.id, tripId)).get();
  if (!trip) return null;

  const isOwner = trip.ownerId === currentUserId;
  let shareAllowsEdit = false;

  if (!isOwner && currentUserEmail) {
    const share = await db
      .select()
      .from(tripShares)
      .where(
        and(
          eq(tripShares.tripId, tripId),
          eq(tripShares.sharedWithEmail, currentUserEmail),
        ),
      )
      .get();

    shareAllowsEdit = Boolean(share?.canEdit);
  }

  // Fetch all sub-resources concurrently
  const [
    participantsRows,
    legsRows,
    vehiclesRows,
    legLinksRows,
    assignmentsRows,
    expensesRows,
    adjustmentsRows,
    tAccountsRows,
  ] = await Promise.all([
    db
      .select()
      .from(participants)
      .where(eq(participants.tripId, tripId))
      .orderBy(asc(participants.displayName))
      .all(),
    db
      .select()
      .from(tripLegs)
      .where(eq(tripLegs.tripId, tripId))
      .orderBy(asc(tripLegs.legOrder))
      .all(),
    db
      .select()
      .from(fleetVehicles)
      .where(eq(fleetVehicles.tripId, tripId))
      .orderBy(asc(fleetVehicles.label))
      .all(),
    db
      .select()
      .from(legVehicleLinks)
      .where(eq(legVehicleLinks.tripId, tripId))
      .all(),
    db
      .select({
        id: vehicleAssignments.id,
        legId: vehicleAssignments.legId,
        vehicleId: vehicleAssignments.vehicleId,
        participantId: vehicleAssignments.participantId,
        role: vehicleAssignments.role,
        allocationOverride: vehicleAssignments.allocationOverride,
      })
      .from(vehicleAssignments)
      .innerJoin(tripLegs, eq(vehicleAssignments.legId, tripLegs.id))
      .where(eq(tripLegs.tripId, tripId))
      .all(),
    db
      .select()
      .from(expenses)
      .where(eq(expenses.tripId, tripId))
      .orderBy(desc(expenses.issuedAt))
      .all(),
    db
      .select()
      .from(balanceAdjustments)
      .where(eq(balanceAdjustments.tripId, tripId))
      .orderBy(desc(balanceAdjustments.createdAt))
      .all(),
    db
      .select()
      .from(tripPaymentAccounts)
      .where(eq(tripPaymentAccounts.tripId, tripId))
      .all(),
  ]);

  const participantMap = new Map(participantsRows.map((p) => [p.id, p]));
  const driverParticipantIds = new Set(
    assignmentsRows
      .filter((a) => a.role === "driver")
      .map((a) => a.participantId),
  );

  // Fetch expense splits
  const expenseIds = expensesRows.map((e) => e.id);
  const splitsRows = expenseIds.length
    ? await db
        .select()
        .from(expenseSplits)
        .where(inArray(expenseSplits.expenseId, expenseIds))
        .all()
    : [];

  const splitsByExpense = new Map<string, typeof splitsRows>();
  for (const s of splitsRows) {
    const list = splitsByExpense.get(s.expenseId) ?? [];
    list.push(s);
    splitsByExpense.set(s.expenseId, list);
  }

  // Map Expenses
  const mappedExpenses: Expense[] = expensesRows.map((exp) => {
    const paidByPart = participantMap.get(exp.paidBy);
    const expSplits = splitsByExpense.get(exp.id) ?? [];
    const mappedSplits: ExpenseSplit[] = expSplits.map((s) => {
      const p = participantMap.get(s.participantId);
      return {
        participantId: s.participantId,
        participantName: p?.displayName ?? "Tanpa nama",
        shareWeight: toNumber(s.shareWeight),
        shareAmountOverride:
          s.shareAmountOverride != null
            ? toNumber(s.shareAmountOverride)
            : undefined,
      };
    });

    return {
      id: exp.id,
      judul: exp.title,
      amountIdr: toNumber(exp.amountIdr),
      paidBy: {
        id: exp.paidBy,
        nama: paidByPart?.displayName ?? "Tanpa nama",
      },
      expenseType: exp.expenseType ?? undefined,
      date: exp.issuedAt,
      notes: exp.notes ?? undefined,
      legId: exp.legId,
      vehicleId: exp.vehicleId,
      shareScope: ((exp.shareScope as "leg" | "vehicle") ||
        (exp.vehicleId ? "vehicle" : "leg")) as "leg" | "vehicle",
      splitWith: [],
      isExcluded: exp.isExcluded,
      splits: mappedSplits,
    };
  });

  // Calculate Balances
  const totalPaidMap = new Map<string, number>();
  const totalShareMap = new Map<string, number>();
  const adjustmentMap = new Map<string, number>();

  for (const p of participantsRows) {
    totalPaidMap.set(p.id, 0);
    totalShareMap.set(p.id, 0);
    adjustmentMap.set(p.id, 0);
  }

  for (const adj of adjustmentsRows) {
    if (adj.status === "applied") {
      const current = adjustmentMap.get(adj.participantId) ?? 0;
      adjustmentMap.set(adj.participantId, current + toNumber(adj.amountIdr));
    }
  }

  for (const exp of expensesRows) {
    if (exp.isExcluded) continue;

    // Paid by credit
    const currentPaid = totalPaidMap.get(exp.paidBy) ?? 0;
    totalPaidMap.set(exp.paidBy, currentPaid + toNumber(exp.amountIdr));

    const expSplits = splitsByExpense.get(exp.id) ?? [];
    if (expSplits.length > 0) {
      // Manual splits calculation
      const totalWeight = expSplits.reduce(
        (acc, s) => acc + toNumber(s.shareWeight),
        0,
      );
      for (const s of expSplits) {
        let shareAmt = 0;
        if (s.shareAmountOverride != null) {
          shareAmt = toNumber(s.shareAmountOverride);
        } else if (totalWeight > 0) {
          shareAmt =
            (toNumber(exp.amountIdr) * toNumber(s.shareWeight)) / totalWeight;
        }
        const currentShare = totalShareMap.get(s.participantId) ?? 0;
        totalShareMap.set(s.participantId, currentShare + shareAmt);
      }
    } else {
      // Auto distribution: Target vehicle or leg assignments with driver discount (50% weight)
      const isVehicleScope =
        exp.shareScope === "vehicle" && Boolean(exp.vehicleId);

      const matchingAssignments = isVehicleScope
        ? assignmentsRows.filter(
            (a) => a.legId === exp.legId && a.vehicleId === exp.vehicleId,
          )
        : exp.legId
          ? assignmentsRows.filter((a) => a.legId === exp.legId)
          : [];

      const participantWeightMap = new Map<string, number>();

      if (matchingAssignments.length > 0) {
        for (const a of matchingAssignments) {
          const w =
            a.allocationOverride != null
              ? toNumber(a.allocationOverride)
              : a.role === "driver"
                ? 0.5
                : 1.0;
          participantWeightMap.set(a.participantId, w);
        }
      } else {
        // Fallback if no vehicle assignments on this leg: distribute to all participants
        for (const p of participantsRows) {
          participantWeightMap.set(p.id, p.isDriver ? 0.5 : 1.0);
        }
      }

      const totalWeight = Array.from(participantWeightMap.values()).reduce(
        (sum, w) => sum + w,
        0,
      );

      const expAmount = toNumber(exp.amountIdr);
      for (const [pid, w] of participantWeightMap.entries()) {
        const shareAmt = totalWeight > 0 ? (expAmount * w) / totalWeight : 0;
        const currentShare = totalShareMap.get(pid) ?? 0;
        totalShareMap.set(pid, currentShare + shareAmt);
      }
    }
  }

  const mappedBalances: BalanceRow[] = participantsRows
    .map((p) => {
      const totalPaid = totalPaidMap.get(p.id) ?? 0;
      const totalShare = totalShareMap.get(p.id) ?? 0;
      const adj = adjustmentMap.get(p.id) ?? 0;
      return {
        participantId: p.id,
        nama: p.displayName,
        totalPaid,
        totalShare,
        balance: totalPaid - totalShare + adj,
        adjustments: adj,
      };
    })
    .sort((a, b) => b.balance - a.balance);

  const mappedParticipants: TripParticipant[] = participantsRows.map((p) => ({
    id: p.id,
    nama: p.displayName,
    role: p.role,
    isDriver: driverParticipantIds.has(p.id),
  }));

  const mappedFleetVehicles: FleetVehicle[] = vehiclesRows.map((v) => ({
    id: v.id,
    label: v.label,
    plateNumber: v.plateNumber,
    seatCapacity: v.seatCapacity,
    notes: v.notes ?? undefined,
  }));
  const fleetMap = new Map(mappedFleetVehicles.map((v) => [v.id, v]));

  const assignmentsByLegVehicle = assignmentsRows.reduce<
    Record<string, TripVehicleAssignment[]>
  >((acc, a) => {
    const key = `${a.legId}:${a.vehicleId}`;
    if (!acc[key]) acc[key] = [];
    const p = participantMap.get(a.participantId);
    acc[key].push({
      participantId: a.participantId,
      participantName: p?.displayName ?? "Tanpa nama",
      role: a.role,
    });
    return acc;
  }, {});

  const legLinksMap = legLinksRows.reduce<
    Record<string, { vehicleId: string; departureAt: string | null }[]>
  >((acc, link) => {
    if (!acc[link.legId]) acc[link.legId] = [];
    acc[link.legId].push({
      vehicleId: link.vehicleId,
      departureAt: link.departureTime,
    });
    return acc;
  }, {});

  const mappedLegs: TripLeg[] = legsRows.map((leg) => ({
    id: leg.id,
    order: leg.legOrder,
    label: formatLocation(leg.origin, leg.destination),
    start: leg.startDatetime,
    end: leg.endDatetime ?? undefined,
    vehicles: (legLinksMap[leg.id] ?? [])
      .map((link) => {
        const base = fleetMap.get(link.vehicleId);
        if (!base) return null;
        const key = `${leg.id}:${link.vehicleId}`;
        return {
          ...base,
          assignments: assignmentsByLegVehicle[key] ?? [],
          departureTime: link.departureAt,
        } as TripLegVehicle;
      })
      .filter(Boolean) as TripLegVehicle[],
  }));

  const mappedAdjustments: BalanceAdjustment[] = adjustmentsRows.map((adj) => {
    const p = participantMap.get(adj.participantId);
    return {
      id: adj.id,
      participantId: adj.participantId,
      participantName: p?.displayName ?? "Tanpa nama",
      amountIdr: toNumber(adj.amountIdr),
      reason: adj.reason,
      status: adj.status as "draft" | "applied" | "void",
      createdAt: adj.createdAt,
      appliedAt: adj.appliedAt,
    };
  });

  // Host payment attachments
  let attachmentList: TripPaymentAccountAttachment[] = [];
  if (tAccountsRows.length) {
    const userAccs = await db
      .select()
      .from(userPaymentAccounts)
      .where(
        inArray(
          userPaymentAccounts.id,
          tAccountsRows.map((t) => t.paymentAccountId),
        ),
      )
      .all();
    const userAccMap = new Map(userAccs.map((a) => [a.id, a]));

    const unFilteredList = tAccountsRows.map((tAcc) => {
      const base = userAccMap.get(tAcc.paymentAccountId);
      if (!base) return null;
      const attachment: TripPaymentAccountAttachment = {
        id: tAcc.id,
        paymentAccountId: base.id,
        label: tAcc.customLabel ?? base.label,
        channel: base.channel as "bank" | "ewallet" | "cash" | "other",
        provider: base.provider ?? null,
        accountName: base.accountName,
        accountNumber: base.accountNumber,
        instructions: tAcc.customInstructions ?? base.instructions ?? undefined,
        priority: tAcc.customPriority ?? base.priority,
        customLabel: tAcc.customLabel ?? undefined,
        customInstructions: tAcc.customInstructions ?? undefined,
        customPriority: tAcc.customPriority ?? undefined,
        attachedAt: tAcc.createdAt,
        updatedAt: tAcc.updatedAt,
      };
      return attachment;
    });

    attachmentList = unFilteredList
      .filter((a): a is TripPaymentAccountAttachment => a !== null)
      .sort((a, b) =>
        a.priority !== b.priority
          ? a.priority - b.priority
          : a.attachedAt.localeCompare(b.attachedAt),
      );
  }

  return {
    trip: {
      id: trip.id,
      nama: trip.name,
      lokasi: formatLocation(trip.originCity, trip.destinationCity),
      tanggalMulai: trip.startDate ?? "",
      tanggalSelesai: trip.endDate ?? undefined,
      catatan: trip.notes,
    },
    expenses: mappedExpenses,
    balances: mappedBalances,
    participants: mappedParticipants,
    legs: mappedLegs,
    adjustments: mappedAdjustments,
    fleetVehicles: mappedFleetVehicles,
    hostAccounts: attachmentList,
    paymentAttachments: attachmentList,
    permissions: {
      isOwner,
      canEdit: isOwner || shareAllowsEdit,
    },
  };
}

export type CommunityStats = {
  totalTrip: number;
  totalPeserta: number;
  totalPengeluaran: number;
};

export async function fetchCommunityStats(): Promise<CommunityStats> {
  const db = getDb();
  const [allTrips, allParticipants, allExpenses] = await Promise.all([
    db.select({ id: trips.id }).from(trips).all(),
    db.select({ id: participants.id }).from(participants).all(),
    db
      .select({ amountIdr: expenses.amountIdr })
      .from(expenses)
      .where(eq(expenses.isExcluded, false))
      .all(),
  ]);

  const totalTrip = allTrips.length;
  const totalPeserta = allParticipants.length;
  const totalPengeluaran = allExpenses.reduce(
    (sum, row) => sum + toNumber(row.amountIdr),
    0,
  );

  return { totalTrip, totalPeserta, totalPengeluaran };
}
