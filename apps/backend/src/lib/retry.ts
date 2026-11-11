/**
 * Exponential backoff retry helper (#443).
 *
 * Wraps idempotent external calls (Trustless Work API, Hasura, Firebase)
 * so transient failures are retried with jittered backoff instead of
 * failing the request on the first hiccup.
 *
 *   maxAttempts — total attempts including the first try (default: 3)
 *   baseDelayMs — initial backoff in ms (default: 200)
 *   maxDelayMs  — ceiling for any single delay (default: 10000)
 *   retryable   — predicate classifying which errors deserve a retry
 *   onRetry     — optional hook invoked before each retry (attempt, error)
 *
 * Non-retryable errors, or exhausting the budget, rethrow the last error.
 * Never retries on AppError instances so operational failures (e.g. 409
 * REFUND_ALREADY_CLAIMED) aren't blindly repeated.
 */
import { AppError } from "../middleware/errorHandler";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryable?: (err: unknown) => boolean;
  onRetry?: (attempt: number, err: unknown) => void;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 200;
const DEFAULT_MAX_DELAY_MS = 10_000;

function isRetryable(err: unknown): boolean {
  // Never retry operational/application errors.
  if (err instanceof AppError) return false;
  // Retry network-ish failures by default; callers can override.
  if (err instanceof Error) {
    const message = err.message.toLowerCase();
    return (
      message.includes("econnrefused") ||
      message.includes("econnreset") ||
      message.includes("etimedout") ||
      message.includes("eai_again") ||
      message.includes("503") ||
      message.includes("429")
    );
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `fn`, retrying with jittered exponential backoff on retryable errors.
 * Returns the first successful result, or throws the last error.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    retryable = isRetryable,
    onRetry,
  }: RetryOptions = {},
): Promise<T> {
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      if (attempt === maxAttempts || !retryable(err)) {
        throw err;
      }

      const backoff = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const jitter = Math.floor(Math.random() * backoff * 0.25);
      const delayMs = backoff + jitter;

      onRetry?.(attempt, err);
      await sleep(delayMs);
    }
  }

  throw lastErr;
}
