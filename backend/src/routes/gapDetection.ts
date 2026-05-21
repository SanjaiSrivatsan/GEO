import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/detect/:businessId', authMiddleware, (req: any, res) => {
  res.status(200).json({ issues: [], total: 0 });
});

router.get('/:businessId', authMiddleware, (req: any, res) => {
  res.status(200).json({ issues: [], total: 0 });
});

export default router;
