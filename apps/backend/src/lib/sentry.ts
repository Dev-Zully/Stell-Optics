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
import { getRequestId } from "./requestLogger";

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 0,
    // Attach the current request correlation ID (from AsyncLocalStorage) to
    // every event so Sentry events share the same ID as the log lines across
    // the refund→dispute→changelog chain (#425).
    beforeSend(event) {
      const requestId = getRequestId();
      if (requestId) {
        event.tags = { ...event.tags, requestId };
        event.extra = { ...event.extra, requestId };
      }
      return event;
    },
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
  const requestId = getRequestId();

  const payload = {
    kind,
    message,
    context,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    ...(requestId ? { requestId } : {}),
  };

  logger.error(`[CRITICAL_ALERT] ${kind} failure: ${message}`, payload);

  Sentry.captureMessage(`[CRITICAL_ALERT] ${kind} failure: ${message}`, {
    level: "fatal",
    tags: { alert: "critical", kind, ...(requestId ? { requestId } : {}) },
    extra: { ...context, ...(requestId ? { requestId } : {}) },
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

export { Sentry };

/**
 * Correlation-aware Sentry helpers (#425).
 *
 * These wrap the SDK capture calls so the current request correlation ID is
 * always attached as a tag/extra, even when `beforeSend` isn't invoked (e.g.
 * when Sentry is not initialized). Prefer these over calling `Sentry.*`
 * directly on the refund→dispute→changelog path.
 */
export function captureException(
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  const requestId = getRequestId();
  Sentry.captureException(error, {
    tags: requestId ? { requestId } : undefined,
    extra: { ...context, ...(requestId ? { requestId } : {}) },
  });
}

export function captureMessage(
  message: string,
  context: Record<string, unknown> = {},
): void {
  const requestId = getRequestId();
  Sentry.captureMessage(message, {
    tags: requestId ? { requestId } : undefined,
    extra: { ...context, ...(requestId ? { requestId } : {}) },
  });
}
