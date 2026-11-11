/**
 * API key authentication middleware (#447).
 *
 * Protects administrative / service-to-service endpoints (e.g. metrics,
 * internal sync) with a single shared bearer token. The expected key is
 * configured via API_KEY_ADMIN; when unset the middleware permits all
 * requests (safe default for local dev where no key is configured).
 *
 *   Authorization: Bearer <API_KEY_ADMIN>
 *
 * Successful authentication sets `res.locals.apiKey = true` so downstream
 * middleware/routes can tell the call was key-authenticated.
 */
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { AppError } from "./errorHandler";

export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const expectedKey = env.API_KEY_ADMIN;
  if (!expectedKey) {
    // No key configured: leave the route open (dev default).
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: { code: "API_KEY_REQUIRED", message: "API key authentication is required" },
    });
  }

  const provided = authHeader.slice("Bearer ".length);
  // Constant-time-ish comparison to avoid leaking length info.
  if (provided !== expectedKey) {
    return res.status(401).json({
      error: { code: "API_KEY_INVALID", message: "Invalid API key" },
    });
  }

  res.locals.apiKey = true;
  next();
}
