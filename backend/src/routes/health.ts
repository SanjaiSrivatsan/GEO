import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/health
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'GEO Engine API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// GET /api/health/ping
router.get('/ping', (req, res) => {
  res.status(200).json({ status: 'pong' });
});

export default router;
