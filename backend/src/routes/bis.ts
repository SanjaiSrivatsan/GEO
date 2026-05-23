import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import BISService from '../services/BISService';

const router = Router();

router.post('/scan/:businessId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await BISService.startBISScan(req.params.businessId);
    res.status(202).json(result);
  } catch (error) {
    throw error;
  }
});

router.get('/results/:businessId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const results = await BISService.getBISResults(req.params.businessId);
    res.status(200).json({ results });
  } catch (error) {
    throw error;
  }
});

router.get('/brands', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Mock brands list
    const brands = [
      { _id: '1', name: 'Brand A', mentions: 342 },
      { _id: '2', name: 'Brand B', mentions: 289 },
      { _id: '3', name: 'Brand C', mentions: 156 },
    ];
    res.status(200).json({ brands });
  } catch (error) {
    throw error;
  }
});

router.get('/brand/:brandId/mentions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const mentions = await BISService.getBrandMentions(req.params.brandId);
    res.status(200).json({ mentions, total: mentions.length });
  } catch (error) {
    throw error;
  }
});

router.get('/brand/:brandId/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await BISService.getBrandStats(req.params.brandId);
    res.status(200).json({ stats });
  } catch (error) {
    throw error;
  }
});

router.get('/brand/:brandId/logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await BISService.getScanLogs(req.params.brandId);
    res.status(200).json({ logs });
  } catch (error) {
    throw error;
  }
});

export default router;
