import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { GeoPromptService, BISService, GapDetectionService } from '../services/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

// GEO Prompts Controller
export class GeoPromptController {
  static async getPrompts(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const result = await GeoPromptService.getPromptLibrary();
      res.json(result);
    } catch (error) {
      logger.error('Error fetching prompts:', error);
      throw error;
    }
  }

  static async runPrompts(req: AuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const result = await GeoPromptService.executeAllPrompts(businessId);
      res.json(result);
    } catch (error) {
      logger.error('Error running prompts:', error);
      throw error;
    }
  }

  static async getResults(req: AuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const result = await GeoPromptService.getResults(businessId);
      res.json(result);
    } catch (error) {
      logger.error('Error fetching prompt results:', error);
      throw error;
    }
  }
}

// BIS Controller
export class BISController {
  static async startScan(req: AuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { businessName } = req.body;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const result = await BISService.runBISScan(businessId, businessName);
      res.json(result);
    } catch (error) {
      logger.error('Error running BIS scan:', error);
      throw error;
    }
  }

  static async getResults(req: AuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const result = await BISService.getMentions(businessId);
      res.json(result);
    } catch (error) {
      logger.error('Error fetching BIS results:', error);
      throw error;
    }
  }
}

// Gap Detection Controller
export class GapDetectionController {
  static async detectGaps(req: AuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const gaps = await GapDetectionService.detectAllGaps(businessId);
      res.json({ businessId, gapCount: gaps.length, gaps });
    } catch (error) {
      logger.error('Error detecting gaps:', error);
      throw error;
    }
  }

  static async getGaps(req: AuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { severity } = req.query;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const result = await GapDetectionService.getGaps(businessId, severity as string);
      res.json(result);
    } catch (error) {
      logger.error('Error fetching gaps:', error);
      throw error;
    }
  }

  static async updateGapStatus(req: AuthRequest, res: Response): Promise<void> {
    const { gapId } = req.params;
    const { status } = req.body;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const gap = await GapDetectionService.updateGapStatus(gapId, status);
      res.json(gap);
    } catch (error) {
      logger.error('Error updating gap status:', error);
      throw error;
    }
  }
}
