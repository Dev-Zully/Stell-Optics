/**
 * Metrics routes (#273).
 *
 * Exposes aggregate, read-only metrics for the analytics dashboard. All
 * endpoints are read-only and gated behind the admin API key so operational
 * data isn't exposed to unauthenticated callers.
 *
 *   GET /api/metrics              → aggregate totals
 *   GET /api/metrics/disputes     → dispute state breakdown
 *   GET /api/metrics/refunds      → refund success/failure counts
 *   GET /api/metrics/transfers    → transfer state breakdown
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import { apiKeyMiddleware } from "../middleware/apiKey";
import { disputeService } from "../services/dispute.service";
import { refundService } from "../services/refund.service";
import { ownershipTransferService } from "../services/ownership-transfer.service";

export const metricsRouter = Router();

// Apply the admin API key to every metric endpoint.
metricsRouter.use(apiKeyMiddleware);

const metricsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

metricsRouter.get("/", async (_req: Request, res: Response) => {
  const [disputeMetrics, refundMetrics, transferMetrics] = await Promise.all([
    disputeService.getMetrics({}, {}).catch(() => ({})),
    refundService.getMetrics?.({}).catch(() => ({})),
    ownershipTransferService.getMetrics?.({}).catch(() => ({})),
  ]);

  return res.json({
    data: {
      disputes: disputeMetrics,
      refunds: refundMetrics,
      transfers: transferMetrics,
      generatedAt: new Date().toISOString(),
    },
  });
});

metricsRouter.get("/disputes", async (req: Request, res: Response) => {
  const parsed = metricsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: "INVALID_QUERY", message: "from/to must be valid dates" },
    });
  }
  const metrics = await disputeService.getMetrics(parsed.data, {}).catch(() => ({}));
  return res.json({ data: metrics });
});

metricsRouter.get("/refunds", async (_req: Request, res: Response) => {
  const metrics = await refundService.getMetrics?.({}).catch(() => ({}));
  return res.json({ data: metrics });
});

metricsRouter.get("/transfers", async (_req: Request, res: Response) => {
  const metrics = await ownershipTransferService.getMetrics?.({}).catch(() => ({}));
  return res.json({ data: metrics });
});
