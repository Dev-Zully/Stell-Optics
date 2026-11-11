import { Router } from "express";
import { checkDisputeResolverBalance } from "../services/dispute-resolver-balance.service";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", service: "truestub-backend" });
});

healthRouter.get("/db", async (_req, res) => {
  try {
    // Lightweight readiness probe: confirm the Postgres pool can execute a
    // trivial statement. Falls back gracefully when DATABASE_URL isn't set.
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", service: "truestub-backend", checks: { database: "up" } });
    } finally {
      await pool.end();
    }
  } catch (err) {
    res.status(503).json({
      status: "degraded",
      service: "truestub-backend",
      checks: { database: "down", message: err instanceof Error ? err.message : "unknown error" },
    });
  }
});

healthRouter.get("/dispute-resolver-balance", async (_req, res) => {
  try {
    const result = await checkDisputeResolverBalance();
    res.json({
      status: result.low ? "low" : "ok",
      balance: result.balance,
      threshold: result.threshold,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "unknown error",
    });
  }
});
