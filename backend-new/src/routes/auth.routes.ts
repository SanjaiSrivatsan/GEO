import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateToken, asyncHandler } from '../middleware/index.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { RegisterSchema, LoginSchema } from '../utils/validators.js';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  validateRequest({ body: RegisterSchema }),
  asyncHandler(async (req, res) => {
    await AuthController.register(req, res);
  })
);

// POST /api/auth/login
router.post(
  '/login',
  validateRequest({ body: LoginSchema }),
  asyncHandler(async (req, res) => {
    await AuthController.login(req, res);
  })
);

// GET /api/auth/me
router.get(
  '/me',
  authenticateToken,
  asyncHandler(async (req, res) => {
    await AuthController.getMe(req, res);
  })
);

export default router;
