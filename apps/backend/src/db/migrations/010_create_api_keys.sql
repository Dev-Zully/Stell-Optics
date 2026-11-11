-- 010_create_api_keys.sql
-- Issue #447 — admin API keys for service-to-service / operational endpoints.
-- A single shared key (API_KEY_ADMIN) protects metrics and sync routes.

CREATE TABLE IF NOT EXISTS api_keys (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  key_hash   TEXT NOT NULL UNIQUE,
  scopes     TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used  TIMESTAMPTZ,
  revoked    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash
  ON api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_api_keys_revoked
  ON api_keys(revoked);
