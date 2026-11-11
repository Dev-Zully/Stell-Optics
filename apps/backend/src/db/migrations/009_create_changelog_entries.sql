-- 009_create_changelog_entries.sql
-- Issue #155 — write-once immutable changelog entries table.
-- Stores audit entries for every money-movement and state-transition event so
-- operators can reconstruct the full history of an escrow, dispute, refund,
-- or transfer.

CREATE TABLE IF NOT EXISTS changelog_entries (
  entry_id       TEXT PRIMARY KEY,
  action         TEXT NOT NULL,
  actor_id       TEXT NOT NULL,
  resource_id    TEXT NOT NULL,
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata       JSONB,
  request_id     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_changelog_entries_resource_id
  ON changelog_entries(resource_id);

CREATE INDEX IF NOT EXISTS idx_changelog_entries_action
  ON changelog_entries(action);

CREATE INDEX IF NOT EXISTS idx_changelog_entries_timestamp
  ON changelog_entries(timestamp DESC);
