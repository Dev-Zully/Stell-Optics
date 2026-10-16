import { auth } from "@/lib/firebase";
import type { DisputeState } from "@/lib/dispute-metrics-api";

/**
 * Client for the backend paginated dispute-history endpoint (#417).
 * Mirrors `Dispute` / `DisputePage` in apps/backend/src/services/dispute.service.ts.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

/** Page sizes offered in the UI — bounded by the backend's MAX_DISPUTE_PAGE_SIZE (50). */
export const DISPUTE_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type DisputePageSize = (typeof DISPUTE_PAGE_SIZE_OPTIONS)[number];

export interface DisputeHistoryItem {
  disputeId: string;
  escrowId: string;
  raisedBy: string;
  reason: string;
  state: DisputeState;
  openedAt: string;
  updatedAt: string;
  escalatedAt?: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface DisputeHistoryPage {
  disputes: DisputeHistoryItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export async function fetchDisputeHistory(
  { limit, offset }: { limit: DisputePageSize; offset: number },
  signal?: AbortSignal,
): Promise<DisputeHistoryPage> {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });

  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${BACKEND_URL}/api/disputes/mine?${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal,
  });
  if (!res.ok) {
    throw new Error(`Dispute history request failed (${res.status})`);
  }
  return (await res.json()) as DisputeHistoryPage;
}
