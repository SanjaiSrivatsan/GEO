import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { CrawlerService } from '../services/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

export class CrawlController {
  static async startCrawl(req: AuthRequest, res: Response): Promise<void> {
    const { businessId, url } = req.body;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      logger.info(`Starting crawl for business ${businessId}`);

      const result = await CrawlerService.crawlWebsite(businessId, url);

      res.json(result);
    } catch (error) {
      logger.error('Error starting crawl:', error);
      throw error;
    }
  }

  static async getCrawlStatus(req: AuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const status = await CrawlerService.getCrawlStatus(businessId);

      res.json(status);
    } catch (error) {
      logger.error('Error getting crawl status:', error);
      throw error;
    }
  }

  static async getCrawlContent(req: AuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const content = await CrawlerService.getCrawlContent(businessId);

      res.json(content);
    } catch (error) {
      logger.error('Error getting crawl content:', error);
      throw error;
    }
  }
}
