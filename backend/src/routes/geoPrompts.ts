import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import GeoPromptService from '../services/GeoPromptService';

const router = Router();

// POST /api/geo/prompts/run - Execute all GEO prompts
router.post('/run', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, businessName, website, category, location } = req.body;

    if (!businessId) {
      return res.status(400).json({
        error: 'businessId is required',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    const result = await GeoPromptService.executeAllPrompts(businessId, {
      businessName,
      website,
      category,
      location,
    });

    res.status(200).json(result);
  } catch (error) {
    throw error;
  }
});

// GET /api/geo/prompts/results/:entityId - Get prompt execution results
router.get('/results/:entityId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { entityId } = req.params;

    const results = await GeoPromptService.getPromptResults(entityId);

    res.status(200).json({ results });
  } catch (error) {
    throw error;
  }
});

// GET /api/geo/prompts/library - Get GEO prompt library
router.get('/library', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const library = await GeoPromptService.getPromptLibrary();

    res.status(200).json(library);
  } catch (error) {
    throw error;
  }
});

export default router;
