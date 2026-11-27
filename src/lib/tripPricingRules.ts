export const TRIP_RULE_VERSION_LEGACY = 1;
export const TRIP_RULE_VERSION_TOWNHALL_2026 = 2;
export const CURRENT_TRIP_RULE_VERSION = TRIP_RULE_VERSION_TOWNHALL_2026;

export const DRIVER_DISCOUNT_POOL = 0.5;
export const SINGLE_TRIP_WEIGHT_BONUS = 0.1;

export type AssignmentWeightInput = {
  legId: string;
  vehicleId: string;
  participantId: string;
  role: string;
  allocationOverride?: number | string | null;
};

export type ParticipantWeightFallbackInput = {
  id: string;
  isDriver: boolean;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export function normalizeTripRuleVersion(version?: number | null): number {
  if (
    typeof version === "number" &&
    version >= TRIP_RULE_VERSION_TOWNHALL_2026
  ) {
    return TRIP_RULE_VERSION_TOWNHALL_2026;
  }
  return TRIP_RULE_VERSION_LEGACY;
}

/**
 * Computes the discount fraction per driver for a given number of drivers
 * sharing a single vehicle on a single leg.
 * Total driver discount is capped at 50% (0.5):
 * - 1 driver  -> 0.5 (50%), weight = 0.5
 * - 2 drivers -> 0.25 (25%), weight = 0.75
 * - 3 drivers -> 0.5 / 3 (~16.67%), weight = 5/6
 */
export function computeDriverDiscountPerDriver(driverCount: number): number {
  if (driverCount <= 0) return 0;
  return DRIVER_DISCOUNT_POOL / driverCount;
}

export function computeDriverBaseWeight(driverCount: number): number {
  if (driverCount <= 0) return 1.0;
  return 1.0 - computeDriverDiscountPerDriver(driverCount);
}

/**
 * Identifies participants who only joined 1 leg (departure-only or return-only)
 * in a multi-leg trip.
 *
 * Requires at least 2 legs in the trip AND at least 2 legs with active assignments
 * so that partially configured trips (where the return leg has no assignments yet)
 * do not prematurely flag every participant as single-trip.
 */
export function computeSingleTripParticipantIds(
  totalLegCount: number,
  allTripAssignments: ReadonlyArray<
    Pick<AssignmentWeightInput, "legId" | "participantId">
  >,
): Set<string> {
  if (totalLegCount < 2 || allTripAssignments.length === 0) {
    return new Set();
  }

  const activeLegIds = new Set<string>();
  const legsByParticipant = new Map<string, Set<string>>();

  for (const assignment of allTripAssignments) {
    activeLegIds.add(assignment.legId);
    let legSet = legsByParticipant.get(assignment.participantId);
    if (!legSet) {
      legSet = new Set<string>();
      legsByParticipant.set(assignment.participantId, legSet);
    }
    legSet.add(assignment.legId);
  }

  if (activeLegIds.size < 2) {
    return new Set();
  }

  const singleTripIds = new Set<string>();
  for (const [participantId, legSet] of legsByParticipant.entries()) {
    if (legSet.size === 1) {
      singleTripIds.add(participantId);
    }
  }

  return singleTripIds;
}

export function computeExpenseAutoWeights(params: {
  ruleVersion: number;
  matchingAssignments: ReadonlyArray<AssignmentWeightInput>;
  participants: ReadonlyArray<ParticipantWeightFallbackInput>;
  singleTripParticipantIds?: ReadonlySet<string>;
}): Map<string, number> {
  const {
    ruleVersion,
    matchingAssignments,
    participants,
    singleTripParticipantIds,
  } = params;

  const normalizedVersion = normalizeTripRuleVersion(ruleVersion);
  const participantWeightMap = new Map<string, number>();

  if (normalizedVersion < TRIP_RULE_VERSION_TOWNHALL_2026) {
    // Legacy v1: each driver gets a fixed 0.5 weight; no single-trip bonus
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
      for (const p of participants) {
        participantWeightMap.set(p.id, p.isDriver ? 0.5 : 1.0);
      }
    }
    return participantWeightMap;
  }

  // Townhall PK v2:
  // 1. Max 50% driver discount pool per vehicle per leg (0.5 / N per driver)
  // 2. Single Trip Only Fee: +0.1 weight for participants joining only 1 leg
  const singleTripSet = singleTripParticipantIds ?? new Set<string>();

  if (matchingAssignments.length > 0) {
    const driverCountByLegVehicle = new Map<string, number>();
    for (const a of matchingAssignments) {
      if (a.role === "driver") {
        const key = `${a.legId}:${a.vehicleId}`;
        driverCountByLegVehicle.set(
          key,
          (driverCountByLegVehicle.get(key) ?? 0) + 1,
        );
      }
    }

    for (const a of matchingAssignments) {
      if (a.allocationOverride != null) {
        participantWeightMap.set(
          a.participantId,
          toNumber(a.allocationOverride),
        );
        continue;
      }

      const key = `${a.legId}:${a.vehicleId}`;
      const driverCount = driverCountByLegVehicle.get(key) ?? 0;
      const baseWeight =
        a.role === "driver" ? computeDriverBaseWeight(driverCount) : 1.0;
      const singleTripBonus = singleTripSet.has(a.participantId)
        ? SINGLE_TRIP_WEIGHT_BONUS
        : 0;

      participantWeightMap.set(a.participantId, baseWeight + singleTripBonus);
    }
  } else {
    // Fallback when no vehicle assignments exist on this leg
    const driverCount = participants.filter((p) => p.isDriver).length;
    for (const p of participants) {
      const baseWeight = p.isDriver
        ? computeDriverBaseWeight(driverCount)
        : 1.0;
      const singleTripBonus = singleTripSet.has(p.id)
        ? SINGLE_TRIP_WEIGHT_BONUS
        : 0;
      participantWeightMap.set(p.id, baseWeight + singleTripBonus);
    }
  }

  return participantWeightMap;
}

export type SettlementTransfer = {
  fromParticipantId: string;
  fromName: string;
  toParticipantId: string;
  toName: string;
  amountIdr: number;
};

/**
 * Computes a greedy minimal list of transfers ("Siapa Bayar ke Siapa")
 * to settle all participant balances.
 */
export function computeSettlementTransfers(
  balances: ReadonlyArray<{
    participantId: string;
    nama: string;
    balance: number;
  }>,
): SettlementTransfer[] {
  const debtors = balances
    .filter((b) => Math.round(b.balance) < 0)
    .map((b) => ({
      id: b.participantId,
      name: b.nama,
      remaining: Math.abs(Math.round(b.balance)),
    }))
    .sort((a, b) => b.remaining - a.remaining);

  const creditors = balances
    .filter((b) => Math.round(b.balance) > 0)
    .map((b) => ({
      id: b.participantId,
      name: b.nama,
      remaining: Math.round(b.balance),
    }))
    .sort((a, b) => b.remaining - a.remaining);

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.remaining, creditor.remaining);

    if (amount >= 1) {
      transfers.push({
        fromParticipantId: debtor.id,
        fromName: debtor.name,
        toParticipantId: creditor.id,
        toName: creditor.name,
        amountIdr: amount,
      });
    }

    debtor.remaining -= amount;
    creditor.remaining -= amount;

    if (debtor.remaining < 1) i++;
    if (creditor.remaining < 1) j++;
  }

  return transfers;
}
