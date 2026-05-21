import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/generate/:businessId', authMiddleware, (req: any, res) => {
  res.status(200).json({ tasks: [] });
});

router.get('/:businessId', authMiddleware, (req: any, res) => {
  res.status(200).json({ tasks: [] });
});

router.patch('/task/:taskId', authMiddleware, (req: any, res) => {
  res.status(200).json({ task: {} });
});

export default router;
