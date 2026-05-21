import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/run', authMiddleware, (req: any, res) => {
  res.status(200).json({ total: 0, succeeded: 0, failed: 0, duration_ms: 0, results: [] });
});

router.get('/results/:entityId', authMiddleware, (req: any, res) => {
  res.status(200).json({ results: [] });
});

router.get('/library', authMiddleware, (req: any, res) => {
  res.status(200).json([]);
});

export default router;
