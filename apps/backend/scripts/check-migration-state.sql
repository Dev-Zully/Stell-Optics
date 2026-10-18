-- =============================================================================
-- check-migration-state.sql — read-only migration-state check (issue #378)
--
-- Run against one environment at a time:
--
--   psql "$DATABASE_URL" -f apps/backend/scripts/check-migration-state.sql
--
-- Confirms the database is not just "has the migration files" but actually in
-- the state 006_normalize_events_primary_key.sql is meant to leave it in,
-- regardless of which of the duplicate 002/003 rename migrations it applied.
-- Record the output in docs/DATABASE.md ("Cross-environment migration state").
--
-- Nothing here writes to the database.
-- =============================================================================

\echo '--- 1. Applied migrations (node-pg-migrate records these in pgmigrations)'
SELECT id, name, run_on
FROM pgmigrations
ORDER BY run_on, id;

\echo '--- 2. Has 006_normalize_events_primary_key run?'
SELECT EXISTS (
    SELECT 1 FROM pgmigrations WHERE name = '006_normalize_events_primary_key'
) AS migration_006_applied;

\echo '--- 3. Primary-key constraint name on public.events (expect: events_pkey)'
SELECT c.conname AS events_pk_name
FROM pg_constraint c
WHERE c.conrelid = to_regclass('public.events')
  AND c.contype = 'p';

\echo '--- 4. Leftover legacy objects (expect: both false)'
SELECT
    to_regclass('public.hotels') IS NOT NULL AS hotels_table_still_exists,
    EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotels_pkey') AS hotels_pkey_still_exists;

\echo '--- 5. Overall verdict'
SELECT CASE
    WHEN to_regclass('public.events') IS NULL
        THEN 'INCONSISTENT: public.events does not exist'
    WHEN NOT EXISTS (SELECT 1 FROM pgmigrations WHERE name = '006_normalize_events_primary_key')
        THEN 'INCONSISTENT: 006 has not been applied; run migrate:up'
    WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotels_pkey')
        THEN 'INCONSISTENT: hotels_pkey still present after 006'
    WHEN to_regclass('public.hotels') IS NOT NULL
        THEN 'INCONSISTENT: legacy public.hotels table still present'
    WHEN NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = to_regclass('public.events') AND contype = 'p' AND conname = 'events_pkey'
    )
        THEN 'INCONSISTENT: public.events primary key is not named events_pkey'
    ELSE 'CONSISTENT'
END AS verdict;
