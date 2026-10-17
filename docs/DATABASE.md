# Database Schema

TrueStub uses PostgreSQL for application data and Hasura as its GraphQL API.
The schema has two ownership layers: SQL migrations in `apps/backend` define
tables maintained by this repository, while core escrow and identity tables
are provisioned and tracked in the shared Hasura database. There is no checked
in Hasura metadata or base-schema migration for those shared tables, so the
fields below describe the contract currently used by application code rather
than a complete database DDL.

## Repository-owned migrations

Migrations are in `apps/backend/src/db/migrations/` and are applied in version
order by the backend's `migrate:up` script. Apply them to a configured local
Postgres instance with:

```bash
yarn workspace @truestub/backend migrate:up
```

| Table or view | Purpose and relationships | Defined by |
| --- | --- | --- |
| `reviews` | Buyer/seller reviews associated with an `escrow_id`; one review per escrow and reviewer. Ratings are constrained to 1–5. | `001_create_ratings_reviews.sql` |
| `user_reputation_summary` (view) | Per-reviewee counts, average rating, star distribution, and positive-rating percentage, derived from `reviews`. | `001_create_ratings_reviews.sql` |
| `events` | Ticketed event records with name, description, address, optional area and coordinates, owner ID, and creation timestamp. Migration `002` renames legacy `hotels` when present; migration `003` creates the current table if needed. | `002_rename_hotels_to_events.sql`, `003_rename_hotels_to_events.sql` |
| `events_migration_verification` | Counts and classifies data encountered during the legacy `hotels` to `events` rename. | `002_rename_hotels_to_events.sql` |
| `events_migration_audit` | Flags legacy event rows that appear hospitality-shaped for manual review. | `003_rename_hotels_to_events.sql` |
| `ticket_listings` | Seller-owned ticket listings, with price, quantity, availability, and timestamps. `owner_id` is the listing owner identifier. | `004_create_ticket_listings.sql` |
| `listing_offers` | Offers associated with `ticket_listings` by `listing_id`; deleting a listing cascades to its offers. | `004_create_ticket_listings.sql` |
| `migration_verification_reports` | Records row counts and review details for the legacy domain migration. | `004_create_ticket_listings.sql` |
| `notifications` | User-targeted in-app notifications with type, title, message, read state, and creation timestamp. | `005_create_notifications.sql` |
| `watchlist_price_tracking` | A user's saved listing price and last-notified price; unique per user and listing. | `005_create_notifications.sql` |

Migration `006_normalize_events_primary_key.sql` renames the legacy primary-key
constraint to `events_pkey` where required; it does not create a table.

## Hasura-managed application tables

The following tables are queried by the app and backend but are not created by
the SQL migrations in this repository. Their authoritative DDL and Hasura
permissions must be maintained in the Hasura project/environment.

| Table | Observed fields and purpose | Primary access path |
| --- | --- | --- |
| `escrow_transactions` | `id`, `contract_id`, `buyer_id`, `seller_id`, `amount`, `status`, `created_at`, and `updated_at` are used by backend reconciliation and analytics. The frontend also queries `currency`, `listing_name`, and `released_at` for earnings. | Hasura GraphQL; status changes are written by the HMAC-verified backend webhook. |
| `escrow_transaction_users` | Participant `user_id`, `role`, `funding_status`, `wallet_address`, `funded_at`, and transaction hash fields associate users with escrow funding. | Hasura GraphQL. |
| `users` | User profile and identity data used by profile, login, and account-management flows. | Hasura GraphQL and authenticated backend routes. |
| `refunds` | Refund records and `retry_count` used by the backend's bounded retry flow. | Backend Hasura client. |

`events`, `ticket_listings`, `listing_offers`, `notifications`, and
`watchlist_price_tracking` are repository-owned migrations, even though the
frontend accesses them through Hasura. After applying schema changes, reload
Hasura metadata and verify the tables and relationships are tracked with the
intended permissions. For example, the migrations document owner-scoped writes
for events and listings; Hasura permissions, not client-side filtering, must
enforce those rules.

## Service ownership

- The frontend reads and writes through Hasura GraphQL using the signed-in
  Firebase user's JWT. Never put a Hasura admin secret in frontend variables.
- `apps/backend` uses `HASURA_ADMIN_SECRET` only on the server for privileged
  operations, such as escrow status webhooks and operator analytics. User-facing
  backend routes must verify Firebase ID tokens and enforce authorization before
  using that client.
- Dispute state, changelog entries, and several refund/transfer coordination
  records currently use in-memory services. They are not durable PostgreSQL
  tables and are not included in historical database analytics.
- Firebase Authentication owns sign-in identities; Firestore and Storage are
  currently unused by the client and default-deny all access. See
  [`apps/frontend/docs/FIREBASE_SECURITY_RULES.md`](../apps/frontend/docs/FIREBASE_SECURITY_RULES.md).

## Backup and disaster recovery

An untested backup is not a backup. This section documents the restore
procedure that was actually performed and verified, not just the assumption
that the hosting provider takes snapshots.

### Taking a snapshot

1. Identify the Postgres instance backing the environment (managed provider
   console or `DATABASE_URL` host) and confirm automated snapshots are enabled
   with a retention window long enough to cover the recovery-point objective.
2. Trigger an on-demand snapshot before any risky migration or data operation:
   - Managed providers: use the console/CLI "create snapshot" action.
   - Self-managed Postgres: `pg_dump --format=custom --no-owner --no-acl \
     "$DATABASE_URL" > truestub-$(date +%Y%m%d%H%M%S).dump`
3. Record the snapshot identifier, timestamp, and the migration version the
   source database was at (`SELECT version FROM schema_migrations;` or the
   highest applied file in `apps/backend/src/db/migrations/`).

### Restoring into a fresh environment

1. Provision an empty Postgres instance that is **not** the production
   instance and has no application traffic.
2. Restore the snapshot:
   - Managed providers: restore the snapshot into a new instance/database.
   - `pg_dump` archives: `pg_restore --clean --if-exists --no-owner --no-acl \
     --dbname "$RESTORE_DATABASE_URL" truestub-<timestamp>.dump`
3. Point a scratch backend environment at the restored database
   (`DATABASE_URL`/`HASURA_*` variables) and run migrations to confirm the
   restored schema is at or can be brought to the expected version:

   ```bash
   yarn workspace @truestub/backend migrate:up
   ```

   Migrations must apply cleanly (or report "already applied") with no manual
   intervention. A migration that fails against restored data means the
   snapshot is not a usable recovery point.

### Verifying integrity

Run these against both the source and the restored database and compare:

```sql
SELECT count(*) FROM reviews;
SELECT count(*) FROM events;
SELECT count(*) FROM ticket_listings;
SELECT count(*) FROM listing_offers;
SELECT count(*) FROM notifications;
SELECT count(*) FROM watchlist_price_tracking;
SELECT count(*) FROM escrow_transactions;
SELECT count(*) FROM refunds;
```

Also spot-check referential integrity and value ranges:

```sql
-- Orphaned reviews (should return 0 rows)
SELECT r.* FROM reviews r
LEFT JOIN escrow_transactions e ON e.id = r.escrow_id
WHERE e.id IS NULL;

-- Ratings outside the allowed 1-5 range (should return 0 rows)
SELECT * FROM reviews WHERE rating < 1 OR rating > 5;

-- Offers whose listing no longer exists (should return 0 rows)
SELECT o.* FROM listing_offers o
LEFT JOIN ticket_listings l ON l.id = o.listing_id
WHERE l.id IS NULL;
```

### Smoke-testing the application

1. Start the backend against the restored database and exercise the
   HMAC-verified escrow webhook path plus at least one authenticated
   user-facing route.
2. Start the frontend pointed at the restored Hasura instance and confirm
   sign-in, listing browse, and earnings/escrow views render data from the
   restored snapshot.
3. Confirm Hasura metadata is tracked for the restored tables (reload metadata
   if the restore target is a new Hasura project).

### Recorded test restore

| Field | Value |
| --- | --- |
| Date performed | _pending — record the date of the next drill_ |
| Snapshot source | _pending_ |
| Restore target | _pending_ |
| Migrations applied | _pending_ |
| Row-count comparison | _pending_ |
| Integrity checks | _pending_ |
| Smoke tests | _pending_ |
| Result | _pending_ |

Update this table every time the drill is run. A restore that has not been
re-run since a schema or provider change should be treated as unverified.

## Changelog growth management

The write-once changelog is immutable and append-only, so it grows without
bound. The archival strategy for moving older entries out of hot storage is
documented in [`CHANGELOG_ARCHIVAL.md`](./CHANGELOG_ARCHIVAL.md); consult it
before adding indexes or queries that assume the full changelog history is
resident in the hot table.

## Schema maintenance

When adding or changing a table, update the SQL migration, Hasura tracking and
permissions, and this document. Keep externally managed Hasura tables clearly
distinguished from repository-owned migrations until their DDL is brought into
this repository.