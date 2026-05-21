import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/discover', authMiddleware, (req: any, res) => {
  res.status(202).json({ status: 'pending' });
});

router.get('/:entityId', authMiddleware, (req: any, res) => {
  res.status(200).json({ mentions: [], total: 0 });
});

router.get('/:entityId/stats', authMiddleware, (req: any, res) => {
  res.status(200).json({ total: 0, byType: {}, bySentiment: {} });
});

export default router;
