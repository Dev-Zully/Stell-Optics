# Dependency Version Differences Across Workspaces

This document is the **allowlist** of intentional cross-workspace dependency version differences between `apps/frontend` and `apps/backend`.

Any version mismatch between the two workspaces that is **not** listed below is considered **accidental drift** and must be reconciled (aligned to a single version, or added here with a justification if the difference is genuinely intentional).

_Last verified: 2026-10-18._

## Audit

An earlier version of this page described a `yarn audit:versions` script.
**That script does not exist.** Neither the root nor any workspace
`package.json` defines it. Until someone adds it, compare the shared
dependencies by hand:

```sh
node -e '
const f = require("./apps/frontend/package.json"), b = require("./apps/backend/package.json");
const all = p => ({ ...p.dependencies, ...p.devDependencies });
const fa = all(f), ba = all(b);
for (const d of Object.keys(fa).filter(d => d in ba).sort())
  console.log((fa[d] === ba[d] ? "  same " : "  DIFF ") + d.padEnd(30) + fa[d].padEnd(14) + ba[d]);
'
```

Any `DIFF` line that is not in the table below is accidental drift.

## Intentional differences

| Dependency | `apps/frontend` | `apps/backend` | Justification |
| --- | --- | --- | --- |
| `typescript` | `5.8.2` | `5.8.2` | No intentional difference. Kept in sync. |
| `zod` | `^3.25.76` | `^3.25.76` | No intentional difference. Kept in sync. |
| `@types/node` | `20.17.25` | `20.17.25` | No intentional difference. Kept in sync. |

> At present there are **no** intentional cross-workspace version differences. Every shared dependency is expected to resolve to the same version in both workspaces. This table exists so that, if a difference is ever required, it is recorded here with a justification rather than left as silent drift.

## Adding an intentional difference

1. Confirm the difference is genuinely required (e.g. a runtime constraint, a peer-dependency conflict, or a platform-specific requirement).
2. Add a row to the table above with the dependency name, the version in each workspace, and a short justification.
3. Reference the reason in the relevant `package.json` (e.g. a comment in the PR description or a note in the workspace README).

## Reconciling accidental drift

If the audit flags a mismatch that is not in the table:

1. Determine which workspace is out of date.
2. Align both workspaces to the same version (prefer the newer compatible version).
3. Re-run the comparison above to confirm the mismatch is resolved.

## Maintenance

- Re-run the audit whenever a shared dependency is added, removed, or upgraded in either workspace.
- Review this document during dependency upgrade PRs to ensure the allowlist stays accurate.