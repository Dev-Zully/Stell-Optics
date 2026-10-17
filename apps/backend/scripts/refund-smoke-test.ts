#!/usr/bin/env ts-node
/**
 * Refund smoke test against real Trustless Work testnet infrastructure.
 *
 * This script exercises the full refund flow end-to-end against the real
 * Trustless Work API (testnet). It is intended to be run on a schedule
 * (not per-PR) to catch breaking changes in Trustless Work's API contract
 * that mocked unit tests cannot detect.
 *
 * Required environment variables:
 *   TRUSTLESS_WORK_API_KEY                  - API key for Trustless Work
 *   TRUSTLESS_WORK_DISPUTE_RESOLVER_SECRET  - Secret key of the dispute-resolver wallet
 *   TRUSTLESS_WORK_BASE_URL                 - Base URL of the Trustless Work API (testnet)
 *   TRUSTLESS_WORK_TESTNET_ESCROW_ID        - Escrow/contract id to refund against
 *
 * Optional environment variables:
 *   TRUSTLESS_WORK_TESTNET_REFUND_AMOUNT    - Amount to refund (defaults to "1")
 *   TRUSTLESS_WORK_TESTNET_REFUND_RECEIVER  - Receiver address for the refund
 *   REFUND_SMOKE_TIMEOUT_MS                 - Timeout for the refund call (defaults to 60000)
 *
 * Exits with a non-zero status code on any failure.
 */

import { refundService } from '../src/services/refund.service';
import { trustlessWork } from '../src/lib/trustless-work';

interface SmokeTestConfig {
  apiKey: string;
  disputeResolverSecret: string;
  baseUrl: string;
  escrowId: string;
  refundAmount: string;
  refundReceiver?: string;
  timeoutMs: number;
}

function readConfig(): SmokeTestConfig {
  const required = [
    'TRUSTLESS_WORK_API_KEY',
    'TRUSTLESS_WORK_DISPUTE_RESOLVER_SECRET',
    'TRUSTLESS_WORK_BASE_URL',
    'TRUSTLESS_WORK_TESTNET_ESCROW_ID',
  ] as const;

  const missing = required.filter((name) => {
    const value = process.env[name];
    return value === undefined || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}`,
    );
  }

  const timeoutRaw = process.env.REFUND_SMOKE_TIMEOUT_MS;
  const timeoutMs = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : 60_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(
      `Invalid REFUND_SMOKE_TIMEOUT_MS value: ${String(timeoutRaw)}`,
    );
  }

  return {
    apiKey: process.env.TRUSTLESS_WORK_API_KEY as string,
    disputeResolverSecret: process.env
      .TRUSTLESS_WORK_DISPUTE_RESOLVER_SECRET as string,
    baseUrl: process.env.TRUSTLESS_WORK_BASE_URL as string,
    escrowId: process.env.TRUSTLESS_WORK_TESTNET_ESCROW_ID as string,
    refundAmount: process.env.TRUSTLESS_WORK_TESTNET_REFUND_AMOUNT ?? '1',
    refundReceiver: process.env.TRUSTLESS_WORK_TESTNET_REFUND_RECEIVER,
    timeoutMs,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Refund smoke test timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function assertSuccessfulRefund(result: unknown): void {
  if (result === null || result === undefined) {
    throw new Error('Refund returned an empty response');
  }

  if (typeof result !== 'object') {
    throw new Error(
      `Refund returned an unexpected response type: ${typeof result}`,
    );
  }

  const response = result as Record<string, unknown>;

  if (response.success === false) {
    throw new Error(
      `Refund reported failure: ${JSON.stringify(response)}`,
    );
  }

  if (response.error !== undefined && response.error !== null) {
    throw new Error(
      `Refund returned an error: ${JSON.stringify(response.error)}`,
    );
  }

  const status = response.status;
  if (typeof status === 'string') {
    const normalized = status.toLowerCase();
    if (
      normalized !== 'success' &&
      normalized !== 'succeeded' &&
      normalized !== 'ok' &&
      normalized !== 'completed'
    ) {
      throw new Error(`Refund returned non-success status: ${status}`);
    }
  }

  if (response.success !== true && typeof status !== 'string') {
    throw new Error(
      `Refund response did not indicate success: ${JSON.stringify(response)}`,
    );
  }
}

async function run(): Promise<void> {
  const config = readConfig();

  // Configure the Trustless Work client for the testnet environment.
  if (typeof (trustlessWork as { configure?: unknown }).configure === 'function') {
    (trustlessWork as {
      configure: (options: Record<string, unknown>) => void;
    }).configure({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
    });
  }

  const refundServiceAny = refundService as unknown as Record<string, unknown>;
  const executeRefund =
    (refundServiceAny.executeRefund as
      | ((input: Record<string, unknown>) => Promise<unknown>)
      | undefined) ??
    (refundServiceAny.refund as
      | ((input: Record<string, unknown>) => Promise<unknown>)
      | undefined);

  if (typeof executeRefund !== 'function') {
    throw new Error(
      'refundService does not expose an executeRefund/refund method',
    );
  }

  const payload: Record<string, unknown> = {
    escrowId: config.escrowId,
    contractId: config.escrowId,
    amount: config.refundAmount,
    disputeResolverSecret: config.disputeResolverSecret,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  };

  if (config.refundReceiver) {
    payload.receiver = config.refundReceiver;
    payload.destination = config.refundReceiver;
  }

  const result = await withTimeout(
    executeRefund.call(refundService, payload),
    config.timeoutMs,
  );

  assertSuccessfulRefund(result);
}

run()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Refund smoke test passed against Trustless Work testnet.');
    process.exit(0);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error('Refund smoke test failed:', message);
    process.exit(1);
  });