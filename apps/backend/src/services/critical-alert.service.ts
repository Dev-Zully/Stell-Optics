/**
 * Critical alert service (#446).
 *
 * Dedicated, higher-urgency alert channel for money-critical failures
 * (refunds, ownership transfers). Tagged as critical in Sentry and pushed
 * to the operational alert webhook when `CRITICAL_ALERT_WEBHOOK_URL` is set.
 * Never throws.
 *
 * Transfers routes import `sendCriticalAlert` from here (see routes/transfers.ts).
 */
import { logger } from "../lib/logger";
import { Sentry } from "../lib/sentry";
import { env } from "../config/env";

export interface CriticalAlertContext {
  kind: "refund" | "transfer";
  message: string;
  context?: Record<string, unknown>;
}

export async function sendCriticalAlert(payload: CriticalAlertContext): Promise<void> {
  const { kind, message, context = {} } = payload;

  logger.error(`[CRITICAL_ALERT] ${kind} failure: ${message}`, {
    kind,
    ...context,
    environment: env.NODE_ENV,
  });

  Sentry.captureMessage(`[CRITICAL_ALERT] ${kind} failure: ${message}`, {
    level: "fatal",
    tags: { alert: "critical", kind },
    extra: { ...context, environment: env.NODE_ENV },
  });

  const webhookUrl = env.CRITICAL_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `:rotating_light: CRITICAL ${kind} failure: ${message}`,
        ...payload,
        environment: env.NODE_ENV,
      }),
    });
  } catch (err) {
    logger.error("[CRITICAL_ALERT] failed to deliver webhook", { err, payload });
  }
}
