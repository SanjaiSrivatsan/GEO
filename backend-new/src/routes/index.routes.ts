import { Router } from 'express';
import { CrawlController } from '../controllers/crawlController.js';
import { GeoScoreController } from '../controllers/geoScoreController.js';
import { GeoPromptController, BISController, GapDetectionController } from '../controllers/miscControllers.js';
import { authenticateToken, asyncHandler, validateRequest } from '../middleware/index.js';
import { CrawlSchema, GeoScoreSchema, BISScanSchema } from '../utils/validators.js';

const crawlRouter = Router();
const geoScoreRouter = Router();
const geoPromptRouter = Router();
const bisRouter = Router();
const gapRouter = Router();

// CRAWL ROUTES
crawlRouter.post(
  '/start',
  authenticateToken,
  validateRequest({ body: CrawlSchema }),
  asyncHandler(async (req, res) => await CrawlController.startCrawl(req, res))
);

crawlRouter.get(
  '/:businessId/status',
  authenticateToken,
  asyncHandler(async (req, res) => await CrawlController.getCrawlStatus(req, res))
);

crawlRouter.get(
  '/:businessId/content',
  authenticateToken,
  asyncHandler(async (req, res) => await CrawlController.getCrawlContent(req, res))
);

// GEO SCORE ROUTES
geoScoreRouter.post(
  '/compute',
  authenticateToken,
  validateRequest({ body: GeoScoreSchema }),
  asyncHandler(async (req, res) => await GeoScoreController.computeScore(req, res))
);

geoScoreRouter.get(
  '/:businessId',
  authenticateToken,
  asyncHandler(async (req, res) => await GeoScoreController.getScore(req, res))
);

geoScoreRouter.get(
  '/:businessId/breakdown',
  authenticateToken,
  asyncHandler(async (req, res) => await GeoScoreController.getScoreBreakdown(req, res))
);

// GEO PROMPT ROUTES
geoPromptRouter.get(
  '/prompts',
  authenticateToken,
  asyncHandler(async (req, res) => await GeoPromptController.getPrompts(req, res))
);

geoPromptRouter.post(
  '/prompts/run/:businessId',
  authenticateToken,
  asyncHandler(async (req, res) => await GeoPromptController.runPrompts(req, res))
);

geoPromptRouter.get(
  '/prompts/:businessId/results',
  authenticateToken,
  asyncHandler(async (req, res) => await GeoPromptController.getResults(req, res))
);

// BIS ROUTES
bisRouter.post(
  '/scan/:businessId',
  authenticateToken,
  validateRequest({ body: BISScanSchema }),
  asyncHandler(async (req, res) => await BISController.startScan(req, res))
);

bisRouter.get(
  '/results/:businessId',
  authenticateToken,
  asyncHandler(async (req, res) => await BISController.getResults(req, res))
);

// GAP DETECTION ROUTES
gapRouter.post(
  '/:businessId',
  authenticateToken,
  asyncHandler(async (req, res) => await GapDetectionController.detectGaps(req, res))
);

gapRouter.get(
  '/:businessId',
  authenticateToken,
  asyncHandler(async (req, res) => await GapDetectionController.getGaps(req, res))
);

gapRouter.patch(
  '/:gapId/status',
  authenticateToken,
  asyncHandler(async (req, res) => await GapDetectionController.updateGapStatus(req, res))
);

export { crawlRouter, geoScoreRouter, geoPromptRouter, bisRouter, gapRouter };
