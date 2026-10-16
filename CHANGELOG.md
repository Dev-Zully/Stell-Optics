# Changelog

All notable changes to this project are documented in this file.

This file is maintained automatically by [semantic-release](https://semantic-release.gitbook.io/)
(see [`release.config.js`](release.config.js)) from
[conventional commit](docs/GIT_GUIDELINE.md) messages merged to `main`. Entries
below this point are added automatically on release — do not hand-edit them.

---

## [0.1.0](https://github.com/frienzy514-png/stellar-TrueStub/releases/tag/v0.1.0) — 2026-10-16

This is the first tracked release of **TrueStub** — a decentralised P2P escrow
platform for secondary-market ticket sales built on the Stellar blockchain via
the Trustless Work API.

### Features

- **Escrow-status webhook** — `POST /webhooks/escrow-status` receives signed
  Trustless Work callbacks, verifies the HMAC-SHA256 signature against
  `TRUSTLESS_WORK_WEBHOOK_SECRET`, deduplicates replays, updates
  `escrow_transactions.status` in Hasura, and dispatches escrow-lifecycle
  notifications ([#233](../../issues/233), [#323](../../issues/323),
  [#326](../../issues/326)).
- **Dispute resolution** — `POST /api/disputes/:id/resolve` signs and submits
  on-chain dispute resolutions via the Trustless Work dispute-resolver wallet,
  with bounded exponential-backoff retries and terminal failure detection
  ([#252](../../issues/252), [#329](../../issues/329)).
- **Refunds** — `POST /api/refunds/claim` executes buyer refunds on-chain,
  including amount-mismatch validation against the escrow's actual disputed
  balance ([#252](../../issues/252)).
- **Ownership transfer** — `POST /api/transfers` initiates and confirms ticket
  ownership transfers between Stellar wallets.
- **Listing alerts** — `POST /api/listing-alerts` lets buyers subscribe to
  re-list notifications; fire-and-forget email dispatch on match.
- **Listing fraud detection** — price-spike and duplicate-listing guards on
  every ticket listing write.
- **Changelog API** — `GET /api/changelog` exposes escrow-transaction audit
  history from Hasura for display in the frontend.
- **Analytics** — `GET /api/analytics` returns aggregate platform metrics.
- **User sync** — `POST /api/sync-user` mirrors Firebase Auth users into
  Hasura on first login.
- **Backend scaffold** — Express server with Helmet, CORS, rate limiting,
  Pino structured logging, Sentry error tracking, and Firebase Admin auth
  middleware.
- **Database migrations** — SQL migration files (via `node-pg-migrate`) for
  ratings/reviews, events, ticket listings, notifications, and primary-key
  normalisation.
- **Docker Compose stack** — root-level `docker-compose.yml` wires Postgres +
  Hasura + the backend service for local development.

### Bug Fixes

- Reject webhook deliveries whose `contractId` is missing or whose `status`
  does not appear in the known status map, preventing silent no-ops.
- Guard against empty `SENTRY_DSN` / `HASURA_GRAPHQL_URL` passed as blank
  strings from Docker Compose environment passthrough.
- Use `timingSafeEqual` for HMAC comparison to prevent timing-oracle attacks.

### Documentation

- `apps/backend/README.md` — backend architecture, route catalogue, and
  environment variable reference.
- `docs/ARCHITECTURE.md` — system architecture diagram.
- `docs/PIPELINE.md` — CI/CD pipeline setup (semantic-release, Chromatic,
  backend uptime check).
- `docs/COMPLIANCE_NOTES.md` — regulatory compliance notes.
- `docs/TICKET_VERIFICATION_DESIGN.md` — ticket-transfer verification design.
- `docs/DATABASE.md` — schema and migration strategy.
- `docs/RUNBOOKS.md` — on-call runbooks for escrow incidents.
- `SECURITY.md` — vulnerability disclosure policy.
- `CONTRIBUTING.md` — contributor guide.
