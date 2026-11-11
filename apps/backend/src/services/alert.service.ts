/**
 * Alert service (#445).
 *
 * Central place for delivering operational alerts about refunds, transfers,
 * and other money-movement failures. Falls back to structured logging when
 * the webhook isn't configured, and never throws so alerting can't mask the
 * original failure.
 *
 * Refunds routes import `alertService` from here (see routes/refunds.ts).
 */
import { logger } from "../lib/logger";
import { env } from "../config/env";

export interface AlertPayload {
  kind: string;
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
}

export class AlertService {
  async send(payload: AlertPayload): Promise<void> {
    const { kind, message, context = {}, requestId } = payload;

    logger.error(`[ALERT] ${kind}: ${message}`, { kind, ...context, ...(requestId ? { requestId } : {}) });

    const webhookUrl = env.CRITICAL_ALERT_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `:rotating_light: ALERT ${kind}: ${message}`,
          ...payload,
        }),
      });
    } catch (err) {
      logger.error("[ALERT] failed to deliver webhook", { err, payload });
    }
  }

  /** Refund failure alert. Convenience wrapper used by routes/refunds.ts. */
  async refundFailure(message: string, context: Record<string, unknown> = {}): Promise<void> {
    return this.send({ kind: "refund_failure", message, context });
  }

  /** Transfer failure alert. Convenience wrapper used by routes/transfers.ts. */
  async transferFailure(message: string, context: Record<string, unknown> = {}): Promise<void> {
    return this.send({ kind: "transfer_failure", message, context });
  }
}

export const alertService = new AlertService();
