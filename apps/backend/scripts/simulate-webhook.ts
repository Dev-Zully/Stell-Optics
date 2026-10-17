#!/usr/bin/env tsx
/**
 * simulate-webhook.ts
 *
 * Builds a correctly HMAC-SHA256-signed Trustless Work escrow-status webhook
 * payload and POSTs it to a locally running backend instance, making manual
 * end-to-end testing of the webhook flow fast and repeatable during
 * development without needing a real Trustless Work testnet event.
 *
 * Usage:
 *
 *   # Against the default local backend (http://localhost:4000):
 *   yarn tsx apps/backend/scripts/simulate-webhook.ts
 *
 *   # Override any field via flags:
 *   yarn tsx apps/backend/scripts/simulate-webhook.ts \
 *     --status completed \
 *     --contractId CAABC123... \
 *     --engagementId eng-001 \
 *     --url http://localhost:4000/webhooks/escrow-status \
 *     --secret mysecret
 *
 *   # Simulate a duplicate delivery (should be acknowledged with 200 + duplicate:true):
 *   yarn tsx apps/backend/scripts/simulate-webhook.ts --status funded --duplicate
 *
 * Environment variables (all optional — flags take precedence):
 *   TRUSTLESS_WORK_WEBHOOK_SECRET   HMAC signing key (falls back to "dev-secret")
 *   PORT                            Backend port    (falls back to 4000)
 *   SIMULATE_WEBHOOK_URL            Override the full URL
 *
 * Exit codes:
 *   0  The backend returned 200.
 *   1  The backend returned a non-200 status, or the request failed entirely.
 */

import { createHmac, randomBytes } from "crypto";
import { parseArgs } from "util";

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const { values: flags } = parseArgs({
  allowPositionals: false,
  options: {
    /** The escrow status to simulate. Must be one of the STATUS_MAP keys. */
    status: { type: "string", default: "completed" },
    /** Escrow contract ID — a Stellar contract address or a readable stub. */
    contractId: { type: "string", default: `sim-contract-${randomBytes(4).toString("hex")}` },
    /** Engagement / escrow ID (optional; falls back to contractId inside the handler). */
    engagementId: { type: "string", default: "" },
    /** USD amount for the escrow (as a string, matching real payloads). */
    amount: { type: "string", default: "150.00" },
    /** Currency code. */
    currency: { type: "string", default: "USDC" },
    /** Recipient e-mail address (for notification side-effect path). */
    recipientEmail: { type: "string", default: "buyer@example.com" },
    /** Recipient display name. */
    recipientName: { type: "string", default: "Alice Buyer" },
    /** Role perspective for the notification ("buyer" | "seller"). */
    role: { type: "string", default: "buyer" },
    /** Full URL of the webhook endpoint. */
    url: { type: "string", default: "" },
    /** HMAC signing secret. Overrides TRUSTLESS_WORK_WEBHOOK_SECRET. */
    secret: { type: "string", default: "" },
    /**
     * Send the same payload twice to exercise the duplicate-delivery guard.
     * The second request should return { success: true, duplicate: true }.
     */
    duplicate: { type: "boolean", default: false },
    /** Pretty-print the response body. */
    pretty: { type: "boolean", default: true },
  },
});

// ---------------------------------------------------------------------------
// Resolve config
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET =
  (flags.secret as string) ||
  process.env["TRUSTLESS_WORK_WEBHOOK_SECRET"] ||
  "dev-secret";

const PORT = process.env["PORT"] ?? "4000";
const BASE_URL = process.env["SIMULATE_WEBHOOK_URL"] || "";

const endpointUrl =
  (flags.url as string) ||
  BASE_URL ||
  `http://localhost:${PORT}/webhooks/escrow-status`;

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

/**
 * A deterministic event ID lets the dedup guard recognise the second delivery
 * as a replay when --duplicate is used. Use a fresh random ID per invocation
 * for normal single-delivery runs so each script execution is independent.
 */
const eventId = flags.duplicate
  ? `sim-event-fixed-dedup-key`
  : `sim-event-${randomBytes(8).toString("hex")}`;

const payload = {
  eventId,
  contractId: flags.contractId as string,
  ...(flags.engagementId ? { engagementId: flags.engagementId as string } : {}),
  status: flags.status as string,
  amount: flags.amount as string,
  currency: flags.currency as string,
  recipientEmail: flags.recipientEmail as string,
  recipientName: flags.recipientName as string,
  role: flags.role as string,
};

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

/**
 * Produces the same HMAC the real Trustless Work platform attaches to every
 * delivery. The backend's verifySignature() accepts both the bare hex digest
 * and the `sha256=<hex>` prefixed form; we use the prefixed form here to
 * exercise the normaliseSignature() path.
 */
function sign(body: string, secret: string): string {
  const hex = createHmac("sha256", secret).update(Buffer.from(body)).digest("hex");
  return `sha256=${hex}`;
}

// ---------------------------------------------------------------------------
// HTTP delivery
// ---------------------------------------------------------------------------

async function deliver(body: string): Promise<{ status: number; json: unknown }> {
  const signature = sign(body, WEBHOOK_SECRET);

  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-trustless-work-signature": signature,
    },
    body,
  });

  const json: unknown = await response.json().catch(() => null);
  return { status: response.status, json };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const body = JSON.stringify(payload);
  const prettyBody = JSON.stringify(payload, null, 2);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  TrueStub webhook simulator");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Endpoint : ${endpointUrl}`);
  console.log(`  Secret   : ${"*".repeat(Math.min(WEBHOOK_SECRET.length, 8))}… (${WEBHOOK_SECRET.length} chars)`);
  console.log(`  Payload  :\n${prettyBody.replace(/^/gm, "    ")}`);

  // ── First delivery ────────────────────────────────────────────────────────
  console.log("\n▶  Sending delivery #1 …");
  const first = await deliver(body);
  const prettyFirst =
    flags.pretty && first.json !== null
      ? JSON.stringify(first.json, null, 2).replace(/^/gm, "    ")
      : String(first.json);

  const firstOk = first.status === 200;
  console.log(`   HTTP ${first.status}${firstOk ? " ✓" : " ✗"}`);
  console.log(`   Body:\n${prettyFirst}`);

  if (!firstOk) {
    console.error("\n✗  Delivery #1 failed — check the backend logs.\n");
    process.exit(1);
  }

  // ── Optional duplicate delivery ──────────────────────────────────────────
  if (flags.duplicate) {
    console.log("\n▶  Sending duplicate delivery #2 (same eventId) …");
    const second = await deliver(body);
    const prettySecond =
      flags.pretty && second.json !== null
        ? JSON.stringify(second.json, null, 2).replace(/^/gm, "    ")
        : String(second.json);

    const secondOk = second.status === 200;
    console.log(`   HTTP ${second.status}${secondOk ? " ✓" : " ✗"}`);
    console.log(`   Body:\n${prettySecond}`);

    const isDup =
      second.json !== null &&
      typeof second.json === "object" &&
      (second.json as Record<string, unknown>)["duplicate"] === true;

    if (!secondOk) {
      console.error("\n✗  Duplicate delivery #2 was rejected (expected 200).\n");
      process.exit(1);
    }

    if (isDup) {
      console.log("\n✓  Duplicate guard worked — second delivery acknowledged without side effects.\n");
    } else {
      console.warn("\n⚠  Second delivery was processed again (duplicate field not set). Check dedup logic.\n");
    }
  } else {
    console.log("\n✓  Done.\n");
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n✗  Unexpected error: ${message}\n`);
  process.exit(1);
});
