import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/analyze/:businessId', authMiddleware, (req: any, res) => {
  res.status(200).json({ analyses: [] });
});

router.get('/:businessId', authMiddleware, (req: any, res) => {
  res.status(200).json({ analyses: [] });
});

router.get('/drift/:businessId', authMiddleware, (req: any, res) => {
  res.status(200).json({ drift: {} });
});

export default router;
