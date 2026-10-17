# Dispute-Resolver Wallet Key Rotation

`TRUSTLESS_WORK_DISPUTE_RESOLVER_SECRET` is the long-lived Stellar secret key for the
platform's dispute-resolver wallet. The dispute-resolver wallet signs and submits refund
transactions when a dispute is resolved in favor of the buyer. Because this key can move
funds, it is a high-value secret and must have a documented, tested rotation procedure.

This document describes how to rotate the key safely, how to confirm that in-flight
refunds are unaffected, how to verify the rotation, and how to roll back if something
goes wrong.

---

## 1. When to rotate

Rotate the dispute-resolver key when:

- The secret is suspected or confirmed to be compromised (leaked in logs, CI output,
  a developer machine, a third-party service, etc.).
- A person with access to the secret leaves the team or changes roles.
- Routine rotation is required by your organization's key-management policy.
- You are migrating the secret to a new secret manager or deployment environment.

If the key is **compromised**, treat the rotation as an incident: rotate immediately,
then audit all refund transactions signed by the old key for the period during which it
may have been exposed.

---

## 2. Prerequisites

- Access to the deployment environment's secret manager (or the environment's
  configuration store) where `TRUSTLESS_WORK_DISPUTE_RESOLVER_SECRET` is defined.
- Access to the Stellar network the platform uses (testnet or mainnet) to fund and
  inspect the new account.
- Ability to trigger the `refund-smoke-test` workflow (see
  `.github/workflows/refund-smoke-test.yml` or the equivalent CI job in your
  deployment pipeline).
- A maintenance window is **not** required: the procedure is designed so that in-flight
  refunds are not affected. However, avoid rotating during a large batch of pending
  refunds if you want the simplest possible audit trail.

---

## 3. Procedure

### Step 1 — Generate a new Stellar keypair

Generate a new keypair using the Stellar SDK, the Stellar CLI, or any trusted offline
tool. Do this on a trusted machine, and never paste the secret into a chat, ticket, or
log.

Using the Stellar CLI:

```bash
stellar keys generate dispute-resolver-<date> --network <testnet|mainnet>
stellar keys address dispute-resolver-<date>   # the new public key (G...)
stellar keys show dispute-resolver-<date>      # the new secret key (S...)
```

Or with the JavaScript SDK:

```js
const { Keypair } = require("@stellar/stellar-sdk");
const kp = Keypair.random();
console.log("public:", kp.publicKey());
console.log("secret:", kp.secret());
```

Record the new **public key** in your runbook/incident notes. Handle the **secret key**
only through the secret manager.

### Step 2 — Fund the new account

The dispute-resolver wallet must hold enough of the refund asset (and enough XLM for
transaction fees and, if applicable, account reserves) to service refunds.

- On testnet, fund the account with Friendbot or your testnet faucet.
- On mainnet, transfer the required working balance from the old dispute-resolver
  account (or from treasury) to the new account's public key.

Confirm the new account exists and has a non-zero balance before proceeding:

```bash
stellar account show <NEW_PUBLIC_KEY> --network <testnet|mainnet>
```

> Note: if the refund asset requires a trustline, establish it on the new account
> before funding it. Refunds will fail if the new account cannot hold the asset.

### Step 3 — Update the secret in the deployment environment / secret manager

Update `TRUSTLESS_WORK_DISPUTE_RESOLVER_SECRET` in the environment that the backend
reads at runtime. Depending on your setup this is one of:

- The secret manager entry (AWS Secrets Manager, GCP Secret Manager, Vault, etc.) that
  the deployment injects as an environment variable.
- The environment's configuration store (e.g. Kubernetes Secret, Render/Fly/Heroku
  config var, `.env` in a self-hosted deployment).

Set the value to the **new secret key** (`S...`) generated in Step 1. Do not commit the
secret to the repository.

### Step 4 — Redeploy the backend

Redeploy (or restart) the backend so it picks up the new secret. The backend reads
`TRUSTLESS_WORK_DISPUTE_RESOLVER_SECRET` at startup, so a rolling restart is sufficient.

After the redeploy:

- Confirm the service is healthy and the refund worker/endpoint is running.
- Confirm the process is using the new key by checking startup logs for the
  dispute-resolver **public key** (the backend should log the public key, never the
  secret). It must match the new public key from Step 1.

### Step 5 — Confirm in-flight refunds are not affected

Refunds that were already signed and submitted by the old key are unaffected by the
rotation:

- **Already-submitted refunds** are ordinary Stellar transactions. Once submitted to
  the network they are validated and settled independently of which key signed them;
  rotating the secret does not invalidate them.
- **Refunds signed but not yet submitted** (e.g. queued in the backend) must be
  re-signed by the new key. If your refund flow persists signed-but-unsubmitted
  transactions, drain or re-sign that queue as part of the rotation. The default flow
  signs and submits in one step, so this is normally a no-op.
- **New refunds** are signed by the new key after the redeploy.

Verify by inspecting recent refund transactions on the network: transactions submitted
before the rotation should still show the old public key as the source/signer, and new
refunds should show the new public key.

### Step 6 — Verify with the refund smoke test

The `refund-smoke-test` workflow is the tested confirmation that the rotation worked.
Trigger it manually against the environment that now uses the rotated key:

```bash
gh workflow run refund-smoke-test.yml -f environment=<environment>
```

(or use the "Run workflow" button in the GitHub Actions UI, selecting the target
environment).

The smoke test exercises the full refund path end-to-end against the freshly rotated
key: it creates a dispute, resolves it in the buyer's favor, and asserts that the refund
transaction is signed by the dispute-resolver wallet and settles successfully. A green
run is the acceptance criterion for the rotation.

If the smoke test fails, see **Rollback** below.

### Step 7 — Retire the old key

Once the smoke test passes and you have confirmed no further refunds need the old key:

- Remove the old secret from the secret manager (or move it to a break-glass archive if
  your policy requires retaining it for audit).
- Sweep any remaining balance from the old dispute-resolver account to treasury or to
  the new account, as appropriate.
- Record the rotation in the incident/change log: date, operator, old public key, new
  public key, and the smoke-test run URL.

---

## 4. Rollback

If the smoke test fails, or refunds start failing after the rotation, roll back to the
previous key:

1. Restore the previous value of `TRUSTLESS_WORK_DISPUTE_RESOLVER_SECRET` in the secret
   manager.
2. Redeploy/restart the backend so it picks up the old secret.
3. Re-run the `refund-smoke-test` workflow to confirm refunds work again with the old
   key.
4. Investigate the failure before retrying the rotation. Common causes:
   - The new account was not funded, or lacks a trustline for the refund asset.
   - The new secret was copied incorrectly (wrong key, stray whitespace/newline).
   - The redeploy did not actually pick up the new secret (stale environment).

Rollback is safe because the old key remains valid until you explicitly retire it in
Step 7. Do not retire the old key until the smoke test passes.

---

## 5. Tested confirmation

The rotation procedure is verified by the `refund-smoke-test` workflow. Running it
against the environment after the redeploy confirms that:

- The backend loaded the rotated secret.
- The dispute-resolver wallet can sign refund transactions with the new key.
- A refund settles successfully end-to-end.

A passing smoke-test run is the required evidence that a rotation is complete. Attach
the run URL to the change/incident record.

---

## 6. Checklist

- [ ] New Stellar keypair generated on a trusted machine.
- [ ] New account funded (and trustline established, if required).
- [ ] `TRUSTLESS_WORK_DISPUTE_RESOLVER_SECRET` updated in the secret manager.
- [ ] Backend redeployed; startup logs show the new public key.
- [ ] In-flight refunds confirmed unaffected; any signed-but-unsubmitted queue drained.
- [ ] `refund-smoke-test` workflow run manually and passing.
- [ ] Old key retired and rotation recorded in the change/incident log.
- [ ] Rollback steps understood and old key retained until smoke test passes.