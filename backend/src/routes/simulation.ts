import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import SimulationService from '../services/SimulationService';

const router = Router();

router.post('/run/:businessId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const run = await SimulationService.runSimulation(req.params.businessId, req.body.config);
    res.status(200).json({ run });
  } catch (error) {
    throw error;
  }
});

router.get('/runs/:businessId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const runs = await SimulationService.getSimulationRuns(req.params.businessId);
    res.status(200).json({ runs });
  } catch (error) {
    throw error;
  }
});

router.get('/run/:runId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const run = await SimulationService.getSimulationRun(req.params.runId);
    res.status(200).json({ run });
  } catch (error) {
    throw error;
  }
});

export default router;
