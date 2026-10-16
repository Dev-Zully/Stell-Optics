/**
 * Error tracking (#111).
 *
 * Thin wrapper around the Sentry SDK. `initSentry` is a no-op when
 * `SENTRY_DSN` isn't set, so local dev and CI run without a Sentry project
 * configured. Call `initSentry()` before the Express app is created.
 *
 * Also exposes `alertCriticalFailure` (#328): a dedicated, higher-urgency
 * alert channel for money/listing-critical failures (refunds, ownership
 * transfers) so they surface promptly instead of being buried in the general
 * error stream. The alert is delivered to `CRITICAL_ALERT_WEBHOOK_URL` when
 * configured, and always emitted to the logger with a distinct tag.
 */
import * as Sentry from "@sentry/node";
import { env } from "../config/env";
import { logger } from "./logger";

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 0,
  });
}

/**
 * Dedicated alert for refund/transfer failure paths (#328).
 *
 * Distinct from the general Sentry error stream: it is tagged as a critical
 * alert, logged at `error` level with a stable `[CRITICAL_ALERT]` prefix, and
 * pushed to the operational alert webhook (Slack/PagerDuty/etc.) when
 * `CRITICAL_ALERT_WEBHOOK_URL` is set. Never throws — alerting must not mask
 * the original failure.
 */
export async function alertCriticalFailure(
  kind: "refund" | "transfer",
  message: string,
  context: Record<string, unknown> = {},
): Promise<void> {
  const payload = {
    kind,
    message,
    context,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  logger.error(`[CRITICAL_ALERT] ${kind} failure: ${message}`, payload);

  Sentry.captureMessage(`[CRITICAL_ALERT] ${kind} failure: ${message}`, {
    level: "fatal",
    tags: { alert: "critical", kind },
    extra: context,
  });

  const webhookUrl = env.CRITICAL_ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `:rotating_light: CRITICAL ${kind} failure: ${message}`,
        ...payload,
      }),
    });
  } catch (err) {
    logger.error("[CRITICAL_ALERT] failed to deliver alert", { err, payload });
  }
}

/**
 * Low-balance alert for the dispute-resolver wallet (#420).
 *
 * Emitted by the periodic balance monitor when the wallet's on-chain balance
 * drops below the configured threshold, so operators are warned *before* a
 * refund fails. Follows the same conventions as `alertCriticalFailure`: a
 * stable `[LOW_BALANCE_ALERT]` tag, a Sentry message, and delivery to the
 * operational alert webhook when configured. Never throws.
 */
export async function alertLowDisputeResolverBalance(
  address: string,
  balance: string,
  threshold: string,
  context: Record<string, unknown> = {},
): Promise<void> {
  const message = `dispute-resolver wallet ${address} balance ${balance} is below threshold ${threshold}`;
  const payload = {
    kind: "low_balance",
    address,
    balance,
    threshold,
    message,
    context,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  logger.warn(`[LOW_BALANCE_ALERT] ${message}`, payload);

  Sentry.captureMessage(`[LOW_BALANCE_ALERT] ${message}`, {
    level: "warning",
    tags: { alert: "low_balance", kind: "low_balance" },
    extra: { address, balance, threshold, ...context },
  });

  const webhookUrl = env.CRITICAL_ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `:warning: LOW BALANCE dispute-resolver wallet ${address}: ${balance} (threshold ${threshold})`,
        ...payload,
      }),
    });
  } catch (err) {
    logger.error("[LOW_BALANCE_ALERT] failed to deliver alert", { err, payload });
  }
}

export { Sentry };
