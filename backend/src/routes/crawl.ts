import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import CrawlerService from '../services/CrawlerService';

const router = Router();

// POST /api/crawl/start - Start website crawl
router.post('/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { businessProfileId, websiteUrl } = req.body;

    if (!businessProfileId || !websiteUrl) {
      return res.status(400).json({
        error: 'businessProfileId and websiteUrl are required',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    const result = await CrawlerService.startCrawl(businessProfileId, websiteUrl);

    res.status(202).json(result);
  } catch (error) {
    throw error;
  }
});

// GET /api/crawl/status/:entityId - Get crawl status
router.get('/status/:entityId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { entityId } = req.params;

    const status = await CrawlerService.getCrawlStatus(entityId);

    res.status(200).json(status);
  } catch (error) {
    throw error;
  }
});

// GET /api/crawl/content/:entityId - Get crawled content
router.get('/content/:entityId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { entityId } = req.params;

    const pages = await CrawlerService.getCrawledContent(entityId);

    res.status(200).json({ pages });
  } catch (error) {
    throw error;
  }
});

export default router;
