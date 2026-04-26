import { Router, Response } from 'express';
import { getIsConnected } from '../config/database.js';

const router = Router();

router.get('/health', (_req, res: Response) => {
  const isDbConnected = getIsConnected();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: isDbConnected ? 'connected' : 'disconnected',
  });
});

export default router;
