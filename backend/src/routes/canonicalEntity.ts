import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/build/:businessId', authMiddleware, (req: any, res) => {
  res.status(200).json({ entity: {} });
});

router.get('/:businessId', authMiddleware, (req: any, res) => {
  res.status(200).json({ entity: {} });
});

export default router;
