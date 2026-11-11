/**
 * Response-time middleware (#450).
 *
 * Adds an `X-Response-Time` header to every response so clients and load
 * balancers can track latency without parsing log lines.
 */
import type { Request, Response, NextFunction } from "express";

export function responseTimeMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const diff = process.hrtime.bigint() - start;
    const ms = Number(diff / 1000000n);
    res.setHeader("X-Response-Time", `${ms} ms`);
  });
  next();
}
