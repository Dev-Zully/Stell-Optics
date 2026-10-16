import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  const commit =
    process.env.GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    "unknown";

  res.json({
    status: "ok",
    service: "truestub-backend",
    commit,
  });
});