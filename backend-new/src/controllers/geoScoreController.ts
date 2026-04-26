import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { GeoScoringService } from '../services/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

export class GeoScoreController {
  static async computeScore(req: AuthRequest, res: Response): Promise<void> {
    const { businessId } = req.body;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      logger.info(`Computing GEO score for business ${businessId}`);

      const score = await GeoScoringService.computeGeoScore(businessId, req.user.userId);

      res.json(score);
    } catch (error) {
      logger.error('Error computing GEO score:', error);
      throw error;
    }
  }

  static async getScore(req: AuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      // Placeholder: In production, fetch from database
      res.json({
        businessId,
        message: 'Fetch GEO score from latest computation',
      });
    } catch (error) {
      logger.error('Error fetching GEO score:', error);
      throw error;
    }
  }

  static async getScoreBreakdown(req: AuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      // Placeholder: In production, fetch detailed breakdown
      res.json({
        businessId,
        presenceScore: 78,
        accuracyScore: 85,
        trustScore: 72,
        hallucinationPenalty: -3,
        finalGeoScore: 78.45,
      });
    } catch (error) {
      logger.error('Error fetching GEO score breakdown:', error);
      throw error;
    }
  }
}
