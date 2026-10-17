import { Router } from "express";
import { checkDisputeResolverBalance } from "../services/disputeResolverBalance";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", service: "truestub-backend" });
});

healthRouter.get("/dispute-resolver-balance", async (_req, res) => {
  try {
    const result = await checkDisputeResolverBalance();
    res.json({
      status: result.ok ? "ok" : "low",
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
</｜｜DSML｜｜ parameter>
