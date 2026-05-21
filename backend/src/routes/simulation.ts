import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/run/:businessId', authMiddleware, (req: any, res) => {
  res.status(200).json({ run: {} });
});

router.get('/runs/:businessId', authMiddleware, (req: any, res) => {
  res.status(200).json({ runs: [] });
});

router.get('/run/:runId', authMiddleware, (req: any, res) => {
  res.status(200).json({ run: {} });
});

export default router;
