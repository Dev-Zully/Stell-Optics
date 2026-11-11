/**
 * API version middleware (#442).
 *
 * Injects `X-API-Version` on every response so clients can detect which
 * backend version they're talking to and gracefully handle drift.
 *
 *   API_VERSION  — version string (default: "1.0.0")
 */
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export const API_VERSION = env.API_VERSION ?? "1.0.0";

export function apiVersionMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-API-Version", API_VERSION);
  next();
}
