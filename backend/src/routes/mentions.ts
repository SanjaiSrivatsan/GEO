import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import MentionService from '../services/MentionService';

const router = Router();

// POST /api/mentions/discover - Start brand mention discovery
router.post('/discover', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({
        error: 'businessId is required',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    const result = await MentionService.discoverMentions(businessId);

    res.status(202).json(result);
  } catch (error) {
    throw error;
  }
});

// GET /api/mentions/:entityId - Get brand mentions
router.get('/:entityId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { entityId } = req.params;
    const { type, sentiment, source } = req.query;

    const mentions = await MentionService.getMentions(entityId, {
      type: type as string,
      sentiment: sentiment as string,
      source: source as string,
    });

    res.status(200).json({
      mentions,
      total: mentions.length,
    });
  } catch (error) {
    throw error;
  }
});

// GET /api/mentions/:entityId/stats - Get mention statistics
router.get('/:entityId/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { entityId } = req.params;

    const stats = await MentionService.getMentionStats(entityId);

    res.status(200).json(stats);
  } catch (error) {
    throw error;
  }
});

export default router;
