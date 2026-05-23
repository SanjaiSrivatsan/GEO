import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import CanonicalEntityService from '../services/CanonicalEntityService';

const router = Router();

router.post('/build/:businessId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const entity = await CanonicalEntityService.buildCanonicalEntity(req.params.businessId);
    res.status(200).json({ entity });
  } catch (error) {
    throw error;
  }
});

router.get('/:businessId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const entity = await CanonicalEntityService.getCanonicalEntity(req.params.businessId);
    res.status(200).json({ entity });
  } catch (error) {
    throw error;
  }
});

export default router;
