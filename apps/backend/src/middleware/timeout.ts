/**
 * Request timeout middleware (#440).
 *
 * Aborts requests that exceed a configurable deadline so slow or stalled
 * clients can't hold Express workers (and DB connections) indefinitely.
 * Responds 504 with the standard API error shape when the deadline passes.
 *
 *   REQUEST_TIMEOUT_MS  — per-request deadline in ms (default: 30000)
 *   SKIP_TIMEOUT_METHODS — comma-separated methods to skip (default: none)
 *
 * Mount per-route or globally. When mounted globally, long-running stream
 * endpoints (e.g. webhooks) should opt out via `x-skip-timeout: true`.
 */
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { AppError } from "./errorHandler";

const REQUEST_TIMEOUT_MS = Number(env.REQUEST_TIMEOUT_MS ?? 30000);

const SKIP_METHODS = new Set<string>(
  (env.SKIP_TIMEOUT_METHODS ?? "").split(",").map((m) => m.trim().toUpperCase()).filter(Boolean),
);

export function timeoutMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (SKIP_METHODS.has(req.method.toUpperCase()) || req.headers["x-skip-timeout"] === "true") {
    return next();
  }

  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        error: { code: "REQUEST_TIMEOUT", message: "Request timed out. Please try again." },
      });
    }
  }, REQUEST_TIMEOUT_MS);

  // Clear the timer once the response finishes so the process doesn't linger.
  res.on("finish", () => clearTimeout(timer));
  res.on("close", () => clearTimeout(timer));

  next();
}

/**
 * Route-scoped timeout helper. Wraps a handler so it rejects with a 504
 * AppError if the underlying promise doesn't settle within `ms`.
 */
export function withTimeout<T>(
  fn: () => Promise<T>,
  { ms = REQUEST_TIMEOUT_MS }: { ms?: number } = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AppError(504, "REQUEST_TIMEOUT", "Request timed out. Please try again."));
    }, ms);

    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  });
}
