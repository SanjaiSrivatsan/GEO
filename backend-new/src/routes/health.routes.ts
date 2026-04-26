import { Router, Response } from "express";
import { getIsConnected } from "../config/database.js";

const router = Router();

const healthHandler = (_req: unknown, res: Response) => {
  const isDbConnected = getIsConnected();

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: isDbConnected ? "connected" : "disconnected",
  });
};

// Support both `/api/health` and `/api/health/health` while mounted in app.ts.
router.get("/", healthHandler);
router.get("/health", healthHandler);

export default router;
