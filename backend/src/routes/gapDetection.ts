import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import GapDetectionService from '../services/GapDetectionService';

const router = Router();

router.post('/detect/:businessId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const issues = await GapDetectionService.detectGaps(req.params.businessId);
    res.status(200).json({ issues, total: issues.length });
  } catch (error) {
    throw error;
  }
});

router.get('/:businessId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const issues = await GapDetectionService.getGaps(req.params.businessId);
    res.status(200).json({ issues, total: issues.length });
  } catch (error) {
    throw error;
  }
});

export default router;
