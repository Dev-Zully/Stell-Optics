export type EarningsPeriod = "day" | "week" | "month";

export interface PayoutEscrow {
  id: string;
  listingName: string;
  amount: number;
  currency: string;
  status: string;
  /** ISO timestamp of the release, when funds reached the seller. */
  releasedAt?: string;
}

export interface EarningsBucket {
  /** Sortable bucket start, YYYY-MM-DD (UTC). */
  key: string;
  total: number;
  count: number;
}

export interface EarningsSummary {
  total: number;
  count: number;
  buckets: EarningsBucket[];
  /** Sum of pending/at-risk escrows, kept separate from confirmed `total`. */
  pendingTotal: number;
  pendingCount: number;
  pendingBuckets: EarningsBucket[];
}

const RELEASED_STATUSES = ["released", "completed"];

const PENDING_STATUSES = ["disputed", "funded", "pending", "in_dispute"];

export const isPayout = (e: PayoutEscrow) =>
  RELEASED_STATUSES.includes(e.status.toLowerCase()) && !!e.releasedAt;

/**
 * Escrows that are still in flight or at risk: funded but not released,
 * awaiting resolution, or actively disputed. These must never be counted
 * toward confirmed earnings.
 */
export const isPending = (e: PayoutEscrow) =>
  !isPayout(e) && PENDING_STATUSES.includes(e.status.toLowerCase());

function bucketKey(iso: string, period: EarningsPeriod): string {
  const d = new Date(iso);
  if (period === "month") d.setUTCDate(1);
  if (period === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday
  return d.toISOString().slice(0, 10);
}

/**
 * Aggregate released escrows into per-period buckets, oldest first.
 * Pending/at-risk escrows (including disputed ones) are excluded from the
 * confirmed `total` and reported separately via `pendingTotal`/`pendingBuckets`.
 */
export function summarizeEarnings(escrows: PayoutEscrow[], period: EarningsPeriod): EarningsSummary {
  const map = new Map<string, EarningsBucket>();
  const pendingMap = new Map<string, EarningsBucket>();
  let total = 0;
  let count = 0;
  let pendingTotal = 0;
  let pendingCount = 0;

  for (const e of escrows) {
    if (isPayout(e)) {
      const key = bucketKey(e.releasedAt!, period);
      const bucket = map.get(key) ?? { key, total: 0, count: 0 };
      bucket.total += e.amount;
      bucket.count += 1;
      map.set(key, bucket);
      total += e.amount;
      count += 1;
    } else if (isPending(e)) {
      // Pending escrows have no release date; bucket by their most recent
      // known timestamp so the breakdown still groups sensibly.
      const key = bucketKey(e.releasedAt ?? new Date().toISOString(), period);
      const bucket = pendingMap.get(key) ?? { key, total: 0, count: 0 };
      bucket.total += e.amount;
      bucket.count += 1;
      pendingMap.set(key, bucket);
      pendingTotal += e.amount;
      pendingCount += 1;
    }
  }

  return {
    total,
    count,
    buckets: [...map.values()].sort((a, b) => a.key.localeCompare(b.key)),
    pendingTotal,
    pendingCount,
    pendingBuckets: [...pendingMap.values()].sort((a, b) => a.key.localeCompare(b.key)),
  };
}

/** Aggregate only pending/at-risk escrows into per-period buckets, oldest first. */
export function summarizePendingEarnings(
  escrows: PayoutEscrow[],
  period: EarningsPeriod,
): EarningsSummary {
  return summarizeEarnings(escrows, period);
}
