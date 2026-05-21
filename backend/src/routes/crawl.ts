import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/start', authMiddleware, (req: any, res) => {
  res.status(202).json({ status: 'pending', businessProfileId: req.body.businessProfileId });
});

router.get('/status/:entityId', authMiddleware, (req: any, res) => {
  res.status(200).json({ status: 'completed', pageCount: 0 });
});

router.get('/content/:entityId', authMiddleware, (req: any, res) => {
  res.status(200).json({ pages: [] });
});

export default router;
