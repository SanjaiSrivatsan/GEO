import { Router, Response } from 'express';
import GeoScoringService from '../services/GeoScoringService';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { GeoScoreResponse } from '../types/index';

const router = Router();

// POST /api/geo/score/compute
router.post(
  '/compute',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { businessProfileId } = req.body;

      const score = await GeoScoringService.computeScore(businessProfileId, req.userId!);

      res.status(200).json({
        _id: score._id.toString(),
        businessProfileId: score.businessProfileId.toString(),
        userId: score.userId.toString(),
        presenceScore: score.presenceScore,
        accuracyScore: score.accuracyScore,
        trustScore: score.trustScore,
        hallucinationPenalty: score.hallucinationPenalty,
        finalGeoScore: score.finalGeoScore,
        presenceBreakdown: score.presenceBreakdown,
        accuracyBreakdown: score.accuracyBreakdown,
        trustBreakdown: score.trustBreakdown,
        hallucinationBreakdown: score.hallucinationBreakdown,
        promptResultsCount: score.promptResultsCount,
        computationMethod: score.computationMethod,
        computedAt: score.computedAt,
        createdAt: score.createdAt,
        updatedAt: score.updatedAt,
      });
    } catch (error) {
      throw error;
    }
  }
);

// GET /api/geo/score/:businessProfileId
router.get(
  '/:businessProfileId',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const score = await GeoScoringService.getScore(req.params.businessProfileId);

      res.status(200).json({
        _id: score._id.toString(),
        businessProfileId: score.businessProfileId.toString(),
        userId: score.userId.toString(),
        presenceScore: score.presenceScore,
        accuracyScore: score.accuracyScore,
        trustScore: score.trustScore,
        hallucinationPenalty: score.hallucinationPenalty,
        finalGeoScore: score.finalGeoScore,
        presenceBreakdown: score.presenceBreakdown,
        accuracyBreakdown: score.accuracyBreakdown,
        trustBreakdown: score.trustBreakdown,
        hallucinationBreakdown: score.hallucinationBreakdown,
        promptResultsCount: score.promptResultsCount,
        computationMethod: score.computationMethod,
        computedAt: score.computedAt,
        createdAt: score.createdAt,
        updatedAt: score.updatedAt,
      });
    } catch (error) {
      throw error;
    }
  }
);

// GET /api/geo/score/breakdown/:businessProfileId
router.get(
  '/breakdown/:businessProfileId',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const breakdown = await GeoScoringService.getScoreBreakdown(req.params.businessProfileId);
      res.status(200).json(breakdown);
    } catch (error) {
      throw error;
    }
  }
);

export default router;
