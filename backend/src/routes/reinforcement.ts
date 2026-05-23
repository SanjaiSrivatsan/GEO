import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import ReinforcementService from '../services/ReinforcementService';

const router = Router();

router.post('/generate/:businessId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await ReinforcementService.generateReinforcementPlan(req.params.businessId);
    res.status(200).json({ tasks });
  } catch (error) {
    throw error;
  }
});

router.get('/:businessId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await ReinforcementService.getTasks(req.params.businessId);
    res.status(200).json({ tasks });
  } catch (error) {
    throw error;
  }
});

router.patch('/task/:taskId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'status is required',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    const task = await ReinforcementService.updateTaskStatus(req.params.taskId, status);
    res.status(200).json({ task });
  } catch (error) {
    throw error;
  }
});

export default router;
