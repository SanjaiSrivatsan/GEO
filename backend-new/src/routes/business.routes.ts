import { Router } from 'express';
import { BusinessController } from '../controllers/businessController.js';
import { authenticateToken, asyncHandler, validateRequest } from '../middleware/index.js';
import { CreateBusinessProfileSchema, UpdateBusinessProfileSchema, MongoIdSchema } from '../utils/validators.js';

const router = Router();

// POST /api/business/profiles - Create business profile
router.post(
  '/profiles',
  authenticateToken,
  validateRequest({ body: CreateBusinessProfileSchema }),
  asyncHandler(async (req, res) => {
    await BusinessController.createProfile(req, res);
  })
);

// GET /api/business/profiles/:id - Get business profile
router.get(
  '/profiles/:id',
  authenticateToken,
  validateRequest({ params: MongoIdSchema }),
  asyncHandler(async (req, res) => {
    await BusinessController.getProfile(req, res);
  })
);

// PUT /api/business/profiles/:id - Update business profile
router.put(
  '/profiles/:id',
  authenticateToken,
  validateRequest({ params: MongoIdSchema, body: UpdateBusinessProfileSchema }),
  asyncHandler(async (req, res) => {
    await BusinessController.updateProfile(req, res);
  })
);

// GET /api/business/profiles - List all business profiles for user
router.get(
  '/profiles',
  authenticateToken,
  asyncHandler(async (req, res) => {
    await BusinessController.listProfiles(req, res);
  })
);

// DELETE /api/business/profiles/:id - Delete business profile
router.delete(
  '/profiles/:id',
  authenticateToken,
  validateRequest({ params: MongoIdSchema }),
  asyncHandler(async (req, res) => {
    await BusinessController.deleteProfile(req, res);
  })
);

export default router;
