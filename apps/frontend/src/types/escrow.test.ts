/**
 * Tests for the `normalizeEscrow` helper — closes #391.
 *
 * Verifies that `Escrow.refundStatus` is always derived from `refund.status`
 * by construction and can never silently drift from it.
 */

import { normalizeEscrow, type Escrow, type RefundRecord } from './escrow';

// ─── Helpers ────────────────────────────────────────────────────────────────

const BASE_ESCROW: Omit<Escrow, 'refund' | 'refundStatus'> = {
  id: 'escrow-1',
  status: 'funded',
  amount: '100',
  asset: 'USDC',
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const BASE_REFUND: RefundRecord = {
  id: 'refund-1',
  escrowId: 'escrow-1',
  status: 'requested',
  amount: '100',
  asset: 'USDC',
  createdAt: '2024-01-01T01:00:00Z',
  updatedAt: '2024-01-01T01:00:00Z',
};

// ─── normalizeEscrow tests ───────────────────────────────────────────────────

describe('normalizeEscrow (closes #391)', () => {
  describe('refundStatus derivation', () => {
    it('sets refundStatus to undefined when no refund record is present', () => {
      const result = normalizeEscrow({ ...BASE_ESCROW });
      expect(result.refundStatus).toBeUndefined();
    });

    it('derives refundStatus from refund.status when a refund record is present', () => {
      const result = normalizeEscrow({
        ...BASE_ESCROW,
        refund: { ...BASE_REFUND, status: 'requested' },
      });
      expect(result.refundStatus).toBe('requested');
    });

    it('keeps refundStatus in sync when refund.status is "processing"', () => {
      const result = normalizeEscrow({
        ...BASE_ESCROW,
        refund: { ...BASE_REFUND, status: 'processing' },
      });
      expect(result.refundStatus).toBe('processing');
    });

    it('keeps refundStatus in sync when refund.status is "submitted"', () => {
      const result = normalizeEscrow({
        ...BASE_ESCROW,
        refund: { ...BASE_REFUND, status: 'submitted' },
      });
      expect(result.refundStatus).toBe('submitted');
    });

    it('keeps refundStatus in sync when refund.status is "completed"', () => {
      const result = normalizeEscrow({
        ...BASE_ESCROW,
        refund: { ...BASE_REFUND, status: 'completed' },
      });
      expect(result.refundStatus).toBe('completed');
    });

    it('keeps refundStatus in sync when refund.status is "failed"', () => {
      const result = normalizeEscrow({
        ...BASE_ESCROW,
        refund: { ...BASE_REFUND, status: 'failed' },
      });
      expect(result.refundStatus).toBe('failed');
    });

    it('keeps refundStatus in sync when refund.status is "none"', () => {
      const result = normalizeEscrow({
        ...BASE_ESCROW,
        refund: { ...BASE_REFUND, status: 'none' },
      });
      expect(result.refundStatus).toBe('none');
    });
  });

  describe('drift prevention — caller-supplied refundStatus is ignored', () => {
    it('ignores a caller-supplied refundStatus that differs from refund.status', () => {
      // Simulates a stale API response that has the two fields out of sync.
      const result = normalizeEscrow({
        ...BASE_ESCROW,
        refund: { ...BASE_REFUND, status: 'completed' },
        refundStatus: 'requested', // stale / wrong value
      });

      // normalizeEscrow must always win — refundStatus must equal refund.status.
      expect(result.refundStatus).toBe('completed');
      expect(result.refundStatus).toBe(result.refund!.status);
    });

    it('overrides a caller-supplied refundStatus even when no refund record exists', () => {
      // A caller that sets refundStatus without a refund record is wrong by
      // definition — the field must be cleared.
      const result = normalizeEscrow({
        ...BASE_ESCROW,
        refundStatus: 'requested', // wrong — no refund record
      });

      expect(result.refundStatus).toBeUndefined();
    });

    it('never returns an object where refundStatus !== refund.status', () => {
      const statuses = ['none', 'requested', 'processing', 'submitted', 'completed', 'failed'] as const;

      for (const status of statuses) {
        const result = normalizeEscrow({
          ...BASE_ESCROW,
          refund: { ...BASE_REFUND, status },
          // Deliberately pass a mismatched value for every combination.
          refundStatus: status === 'requested' ? 'completed' : 'requested',
        });

        expect(result.refundStatus).toBe(status);
        expect(result.refundStatus).toBe(result.refund!.status);
      }
    });
  });

  describe('immutability / purity', () => {
    it('does not mutate the input object', () => {
      const input = {
        ...BASE_ESCROW,
        refund: { ...BASE_REFUND, status: 'completed' as const },
        refundStatus: 'requested' as const,
      };
      const before = JSON.stringify(input);

      normalizeEscrow(input);

      expect(JSON.stringify(input)).toBe(before);
    });

    it('returns a new object, not the same reference', () => {
      const input = { ...BASE_ESCROW };
      const result = normalizeEscrow(input);
      expect(result).not.toBe(input);
    });
  });

  describe('non-refundStatus fields are preserved', () => {
    it('preserves all base Escrow fields untouched', () => {
      const result = normalizeEscrow({
        ...BASE_ESCROW,
        refund: { ...BASE_REFUND, status: 'submitted' },
      });

      expect(result.id).toBe(BASE_ESCROW.id);
      expect(result.status).toBe(BASE_ESCROW.status);
      expect(result.amount).toBe(BASE_ESCROW.amount);
      expect(result.asset).toBe(BASE_ESCROW.asset);
      expect(result.buyerId).toBe(BASE_ESCROW.buyerId);
      expect(result.sellerId).toBe(BASE_ESCROW.sellerId);
    });

    it('preserves all RefundRecord fields on the nested refund object', () => {
      const refund: RefundRecord = {
        ...BASE_REFUND,
        status: 'submitted',
        transactionHash: 'abc123',
        ledger: 42,
        reason: 'event cancelled',
      };

      const result = normalizeEscrow({ ...BASE_ESCROW, refund });

      expect(result.refund).toEqual(refund);
    });
  });
});
