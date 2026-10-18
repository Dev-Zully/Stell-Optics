# Storybook / Chromatic coverage audit

Chromatic only catches visual regressions in components that have a story.
This audit compares `src/components/**` against existing `*.stories.tsx`
files (issue #387).

**Snapshot (2026-10-18):** 8 of 225 component files have a story (~4%).

## Covered

| Component | Story |
| --- | --- |
| `ui/badge` | `UI/Badge` |
| `ui/button` | `UI/Button` |
| `ui/table` | `UI/Table` (added in #387) |
| `dashboard/EscrowStatusBadge` | `Dashboard/EscrowStatusBadge` (added in #387) |
| `dashboard/EscrowsByStatus` | `Dashboard/EscrowsByStatus` (added in #387) |
| `escrow/RealTimeEscrowStatus` | `Escrow/RealTimeEscrowStatus` (added in #387) |
| `auth/ResetPasswordForm` | `Auth/ResetPasswordForm` (added in #387) |
| `auth/InvalidResetToken` | `Auth/InvalidResetToken` (added in #387) |

## Gaps by area

| Area | Files without a story |
| --- | --- |
| `dashboard/` | 35 |
| `events/` | 28 |
| `ui/` | 24 |
| `tw-blocks/` | 21 |
| `ticket-listing/` | 21 |
| `escrow/` | 21 |
| `auth/` | 21 |
| `ticket-events/` | 15 |
| `ratings/`, `dev/` | 4 each |
| `ticket-purchase/`, `notifications/`, `navigation/`, `layouts/`, `dispute/`, root | 3 each |
| `performance/` | 2 |
| `ticket-listing-mobile/`, `language/`, `__dev__/` | 1 each |

To regenerate the full list:

```bash
cd apps/frontend
find src/components -name "*.tsx" ! -name "*.stories.tsx" ! -name "*.test.tsx" \
  | while read f; do [ -f "${f%.tsx}.stories.tsx" ] || echo "$f"; done
```

## Priority backlog

### P1: high-traffic dashboard, escrow and auth views

- **Dashboard tables:** `dashboard/EscrowTable`, `dashboard/WalletAddressTable`,
  `dashboard/listings/MyListingsTable`, `dashboard/listings/InterestedPeopleTable`,
  `dashboard/profile/AccountOverviewTable`, `dispute/DisputeHistoryTable`,
  `escrow/views/PaymentBatchTable`.
  - **Blocked:** `EscrowTable` and `WalletAddressTable` don't currently compile
    on `main`. A merge of the sorting and pagination branches dropped the
    `SortKey`/`SortDirection` types, the `useMemo` import and the sort state,
    and left an unbalanced JSX fragment in `EscrowTable`'s action menu. Fix
    those before adding stories.
  - `EscrowTable` also formats amounts with `Intl.NumberFormat` currency style,
    which throws `RangeError` for `USDC`/`EURC` and shows `XLM` as `$`. Switch
    it to `lib/formatEscrowAmount`.
- **Escrow status views:** `escrow/views/EscrowPaidView`, `EscrowReleasedView`,
  `EscrowDisputedView`, `EscrowBlockedView`, `EscrowProcessStepper`,
  `escrow/ProcessStepper`, `escrow/EscrowCard`, `escrow/TransactionPreview`,
  `dashboard/EscrowStatusCard`, `dashboard/milestone-progress`.
  `escrow/EscrowStatusBadge` polls on-chain status, so its hook needs to be
  mocked.
- **Auth forms:** `auth/Login`, `auth/Register`, `auth/ForgotPasswordForm`,
  `auth/NewPassword`, `auth/TwoFactorSettings`, `auth/ui/PasswordStrengthMeter`.
  These call Firebase or the auth context directly, so they need a provider
  decorator or a module mock.

### P2: shared primitives and wallet UI

- The remaining `ui/*` primitives (card, alert, input, select, dialog, tabs,
  empty-state, skeleton, and others). They are cheap to cover and every
  feature view depends on them.
- `auth/wallet/*` modals and banners (`NetworkMismatchBanner`,
  `WalletReconnectPrompt`, `ConnectionStatus`).
- `ratings/*` and `dispute/*` (tracked separately in this batch).

### P3: lower traffic or non-visual

- `ticket-listing/*`, `ticket-events/*`, `events/*` detail and gallery views.
- Skip: `dev/*`, `__dev__/*`, `ErrorSuppressor`, `tw-blocks/providers/*`,
  `performance/ErrorBoundaryWithCache`. These are non-visual or dev-only.

## Story conventions

- `.storybook/preview.tsx` initialises i18next, so `useTranslation` renders
  real copy. It also enables the Next.js App Router mock, so `useRouter` works.
- Components that read Apollo context need an `ApolloProvider` decorator. See
  `escrow/RealTimeEscrowStatus.stories.tsx`.
- Pass fixed fixtures, not live data, so Chromatic snapshots stay stable.
