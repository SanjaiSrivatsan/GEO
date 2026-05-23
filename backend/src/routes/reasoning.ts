import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import ReasoningService from '../services/ReasoningService';

const router = Router();

router.post('/analyze/:businessId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const analysis = await ReasoningService.analyzeReasoning(req.params.businessId);
    res.status(200).json({ analysis });
  } catch (error) {
    throw error;
  }
});

router.get('/:businessId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const analysis = await ReasoningService.getAnalysis(req.params.businessId);
    res.status(200).json({ analysis });
  } catch (error) {
    throw error;
  }
});

router.get('/drift/:businessId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const drift = await ReasoningService.getDriftReport(req.params.businessId);
    res.status(200).json({ drift });
  } catch (error) {
    throw error;
  }
});

export default router;
