/**
 * Changelog entry-type taxonomy — issue #416
 *
 * The write-once changelog (issue #155) stores an `action` string plus free
 * `metadata`. As more systems write to it (disputes, refunds, transfers,
 * account deletion), every writer must use one of the entry types below and
 * the matching metadata shape, so consumers can reliably tell entry kinds
 * apart instead of each writer inventing its own ad hoc shape.
 *
 * Naming convention: `<domain>.<past-tense verb>` (lowercase, snake_case
 * words), e.g. `dispute.resolved`. Full documentation lives in
 * docs/CHANGELOG_TAXONOMY.md — keep the two in sync.
 */

export const CHANGELOG_ENTRY_TYPES = {
  DISPUTE_RAISED: "dispute.raised",
  DISPUTE_ESCALATED: "dispute.escalated",
  DISPUTE_RESOLVED: "dispute.resolved",
  DISPUTE_WITHDRAWN: "dispute.withdrawn",
  DISPUTE_SLA_BREACH: "dispute.sla_breach",
  REFUND_SUBMITTED: "refund.submitted",
  REFUND_COMPLETED: "refund.completed",
  TRANSFER_COMPLETED: "transfer.completed",
  ACCOUNT_DELETED: "account.deleted",
} as const;

export type ChangelogEntryType = (typeof CHANGELOG_ENTRY_TYPES)[keyof typeof CHANGELOG_ENTRY_TYPES];

const ENTRY_TYPE_VALUES = new Set<string>(Object.values(CHANGELOG_ENTRY_TYPES));

export function isChangelogEntryType(action: string): action is ChangelogEntryType {
  return ENTRY_TYPE_VALUES.has(action);
}

/** State-machine states mirrored from DisputeService (kept local to avoid a cycle). */
type DisputeStateName = "OPEN" | "ESCALATED" | "RESOLVED" | "WITHDRAWN";

/** Shared shape for every dispute lifecycle transition entry. */
export interface DisputeTransitionMetadata {
  escrowId: string;
  fromState: DisputeStateName | null;
  toState: DisputeStateName;
}

/**
 * Metadata shape per entry type. `resourceId` conventions:
 *   - dispute.*  → disputeId
 *   - refund.*   → refundId
 *   - transfer.* → transferId
 *   - account.*  → userId
 */
export interface ChangelogEntryMetadata {
  "dispute.raised": DisputeTransitionMetadata & { fromState: null; toState: "OPEN"; reason: string };
  "dispute.escalated": DisputeTransitionMetadata & { toState: "ESCALATED" };
  "dispute.resolved": DisputeTransitionMetadata & { toState: "RESOLVED"; resolution?: string };
  "dispute.withdrawn": DisputeTransitionMetadata & { toState: "WITHDRAWN" };
  "dispute.sla_breach": {
    escrowId: string;
    state: "ESCALATED";
    escalatedAt: string | null;
    elapsedMs: number;
    slaMs: number;
    policy: "manual_intervention";
  };
  "refund.submitted": {
    escrowId: string;
    amount: string | number;
    currency?: string;
    refundTo: string;
  };
  "refund.completed": {
    escrowId: string;
    amount: string | number;
    currency?: string;
    refundTo: string;
    txHash: string;
  };
  "transfer.completed": {
    escrowId: string;
    fromOwner: string;
    toOwner: string;
  };
  "account.deleted": {
    /** Why the account was removed, e.g. "user_request" or "admin_action". */
    reason: string;
  };
}

/** Maps a DisputeService transition event to its taxonomy entry type. */
export const DISPUTE_EVENT_ENTRY_TYPES = {
  escalate: CHANGELOG_ENTRY_TYPES.DISPUTE_ESCALATED,
  resolve: CHANGELOG_ENTRY_TYPES.DISPUTE_RESOLVED,
  withdraw: CHANGELOG_ENTRY_TYPES.DISPUTE_WITHDRAWN,
} as const;
