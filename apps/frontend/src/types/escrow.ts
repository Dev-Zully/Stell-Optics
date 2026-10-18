export type EscrowStatus =
  | 'pending'
  | 'funded'
  | 'released'
  | 'refunded'
  | 'disputed'
  | 'cancelled';

export type RefundStatus =
  | 'none'
  | 'requested'
  | 'processing'
  | 'submitted'
  | 'completed'
  | 'failed';

export interface RefundRecord {
  id: string;
  escrowId: string;
  status: RefundStatus;
  amount: string;
  asset: string;
  /** Stellar transaction hash for the on-chain refund, when available. */
  transactionHash?: string;
  /** Ledger the refund transaction was included in, when available. */
  ledger?: number;
  reason?: string;
  errorMessage?: string;
  requestedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Escrow {
  id: string;
  status: EscrowStatus;
  amount: string;
  asset: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  /** Present when the escrow has been refunded (or a refund is in flight). */
  refund?: RefundRecord;
  /**
   * Convenience mirror of `refund.status` for status views.
   *
   * IMPORTANT — always use `normalizeEscrow()` when constructing or
   * deserializing an `Escrow` object.  Direct construction that sets
   * `refundStatus` independently of `refund.status` risks silent drift.
   * `normalizeEscrow()` is the single source of truth: it always derives
   * `refundStatus` from `refund.status` and strips any caller-supplied value.
   */
  refundStatus?: RefundStatus;
}

/**
 * Normalize an `Escrow` object so that `refundStatus` is always derived from
 * `refund.status`, never set independently.
 *
 * Call this:
 *  - when constructing an `Escrow` from a raw API/GraphQL response, and
 *  - when updating an `Escrow` object after a refund status change.
 *
 * The function is pure and always returns a new object; it never mutates the
 * input.
 *
 * Closes #391.
 */
export function normalizeEscrow(raw: Omit<Escrow, 'refundStatus'> & { refundStatus?: RefundStatus }): Escrow {
  return {
    ...raw,
    // Always derive refundStatus from refund.status — ignore any caller-supplied value.
    refundStatus: raw.refund?.status,
  };
}
