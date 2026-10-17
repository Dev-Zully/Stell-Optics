# Changelog

All notable changes to this project are documented in this file.

This file is maintained automatically by [semantic-release](https://semantic-release.gitbook.io/)
(see [`release.config.js`](release.config.js)) from
[conventional commit](docs/GIT_GUIDELINE.md) messages merged to `main`. Entries
below this point are added automatically on release — do not hand-edit them.

## Migration audit trail

Production deploys now record a human-readable migration history, separate from
`node-pg-migrate`'s internal `pgmigrations` table. Each deploy logs which
migrations ran, when they ran, and as part of which deploy/release, so there is
an auditable record of "who deployed which schema change when" that is distinct
from the migration tool's own bookkeeping.

This was motivated by the earlier migration-history confusion caused by the
duplicate rename migrations (`002`/`003`), where the tool's internal state alone
made it hard to reconstruct what had actually been applied in production.