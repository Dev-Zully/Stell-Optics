-- Migration 007: Add database-level unique constraints for idempotency keys
--
-- These constraints back the application-level idempotency checks in
-- refunds.ts and transfers.ts. Without a database-level UNIQUE constraint,
-- two concurrent requests carrying the same idempotency key could both pass
-- the application-level "check-then-write" and both proceed to submit
-- on-chain transactions. The UNIQUE constraints below make the second
-- concurrent insert fail at the database level, guaranteeing that only one
-- of two racing requests can succeed.

-- Up Migration

-- ---------------------------------------------------------------------------
-- Refund idempotency
-- ---------------------------------------------------------------------------
-- Records the idempotency key for each refund request. A UNIQUE constraint on
-- the idempotency key ensures that concurrent duplicate refund requests
-- cannot both be recorded, so only one can proceed to submit an on-chain
-- refund transaction.
CREATE TABLE IF NOT EXISTS refund_idempotency (
    id              BIGSERIAL PRIMARY KEY,
    refund_id       TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT refund_idempotency_key_unique UNIQUE (idempotency_key)
);

-- Also enforce uniqueness on the refund id itself, so a refund cannot be
-- recorded more than once regardless of which idempotency key is used.
CREATE UNIQUE INDEX IF NOT EXISTS refund_idempotency_refund_id_unique
    ON refund_idempotency (refund_id);

-- ---------------------------------------------------------------------------
-- Transfer idempotency
-- ---------------------------------------------------------------------------
-- Records the idempotency key for each ownership-transfer request. A UNIQUE
-- constraint on the idempotency key ensures that concurrent duplicate
-- transfer requests cannot both be recorded, so only one can proceed to
-- apply the ownership transfer.
CREATE TABLE IF NOT EXISTS transfer_idempotency (
    id              BIGSERIAL PRIMARY KEY,
    transfer_id     TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT transfer_idempotency_key_unique UNIQUE (idempotency_key)
);

-- Also enforce uniqueness on the transfer id itself, so a transfer cannot be
-- recorded more than once regardless of which idempotency key is used.
CREATE UNIQUE INDEX IF NOT EXISTS transfer_idempotency_transfer_id_unique
    ON transfer_idempotency (transfer_id);

-- Down Migration

DROP TABLE IF EXISTS transfer_idempotency;
DROP TABLE IF EXISTS refund_idempotency;
