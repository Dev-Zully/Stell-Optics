import { z } from "zod";

/**
 * Asset codes supported by multi-asset escrow. Keep in sync with the asset
 * list in `components/tw-blocks/wallet-kit/trustlines.ts`.
 */
export const SUPPORTED_ESCROW_ASSETS = ["USDC", "XLM", "EURC"] as const;

export type EscrowAsset = (typeof SUPPORTED_ESCROW_ASSETS)[number];

export const escrowAssetSchema = z.enum(SUPPORTED_ESCROW_ASSETS);

export function isSupportedEscrowAsset(value: unknown): value is EscrowAsset {
  return escrowAssetSchema.safeParse(value).success;
}

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
  asset: EscrowAsset;
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
  asset: EscrowAsset;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  /** Present when the escrow has been refunded (or a refund is in flight). */
  refund?: RefundRecord;
  /** Convenience mirror of `refund.status` for status views. */
  refundStatus?: RefundStatus;
}

const escrowStatusSchema = z.enum([
  "pending",
  "funded",
  "released",
  "refunded",
  "disputed",
  "cancelled",
]);

const refundStatusSchema = z.enum([
  "none",
  "requested",
  "processing",
  "submitted",
  "completed",
  "failed",
]);

/**
 * Runtime validators for escrow/refund payloads coming from the API. The
 * static types above can't stop an unexpected value (e.g. an asset typo from
 * the backend) from reaching the UI, so parse responses through these at the
 * API boundary.
 */
export const refundRecordSchema = z.object({
  id: z.string(),
  escrowId: z.string(),
  status: refundStatusSchema,
  amount: z.string(),
  asset: escrowAssetSchema,
  transactionHash: z.string().optional(),
  ledger: z.number().optional(),
  reason: z.string().optional(),
  errorMessage: z.string().optional(),
  requestedAt: z.string().optional(),
  submittedAt: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<RefundRecord>;

export const escrowSchema = z.object({
  id: z.string(),
  status: escrowStatusSchema,
  amount: z.string(),
  asset: escrowAssetSchema,
  buyerId: z.string(),
  sellerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  refund: refundRecordSchema.optional(),
  refundStatus: refundStatusSchema.optional(),
}) satisfies z.ZodType<Escrow>;

/** Validates an API payload as a RefundRecord; throws a ZodError on mismatch. */
export function parseRefundRecord(data: unknown): RefundRecord {
  return refundRecordSchema.parse(data);
}

/** Validates an API payload as an Escrow; throws a ZodError on mismatch. */
export function parseEscrow(data: unknown): Escrow {
  return escrowSchema.parse(data);
}
