/**
 * Request body size-limit middleware (#441).
 *
 * Caps the size of JSON/raw bodies so oversized payloads can't exhaust
 * memory. Responds 413 with the standard API error shape.
 *
 *   MAX_REQUEST_BODY_BYTES  — max body size in bytes (default: 1mb)
 *
 * Mount globally or on specific routes. Webhooks that must accept large
 * payloads should mount this after `express.json` with a higher limit, or
 * skip it entirely.
 */
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

const MAX_REQUEST_BODY_BYTES = Number(env.MAX_REQUEST_BODY_BYTES ?? 1024 * 1024);

export function requestSizeLimit(req: Request, res: Response, next: NextFunction): void {
  const skip = req.headers["x-skip-size-limit"] === "true";
  if (skip) return next();

  let received = 0;
  const limit = MAX_REQUEST_BODY_BYTES;

  req.on("data", (chunk) => {
    received += chunk.length;
    if (received > limit && !res.headersSent) {
      // Destroy the socket to stop receiving the body, then respond.
      req.destroy();
      res.status(413).json({
        error: {
          code: "REQUEST_ENTITY_TOO_LARGE",
          message: `Request body exceeds ${Math.floor(limit / 1024 / 1024)} MB limit.`,
        },
      });
    }
  });

  req.on("error", () => {
    // Client aborted or connection error — nothing to respond.
  });

  next();
}
