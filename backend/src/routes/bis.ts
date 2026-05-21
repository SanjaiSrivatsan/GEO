import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/scan/:businessId', authMiddleware, (req: any, res) => {
  res.status(202).json({ status: 'pending' });
});

router.get('/results/:businessId', authMiddleware, (req: any, res) => {
  res.status(200).json({ results: {} });
});

router.get('/brands', authMiddleware, (req: any, res) => {
  res.status(200).json({ brands: [] });
});

router.get('/brand/:brandId/mentions', authMiddleware, (req: any, res) => {
  res.status(200).json({ mentions: [], total: 0 });
});

router.get('/brand/:brandId/stats', authMiddleware, (req: any, res) => {
  res.status(200).json({ stats: {} });
});

router.get('/brand/:brandId/logs', authMiddleware, (req: any, res) => {
  res.status(200).json({ logs: [] });
});

export default router;
