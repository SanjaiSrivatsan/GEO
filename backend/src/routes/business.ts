import { Router, Response } from 'express';
import BusinessService from '../services/BusinessService.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { ValidationError } from '../utils/errors.js';
import { CreateBusinessProfileRequest, BusinessProfileResponse } from '../types/index.js';

const router = Router();

// POST /api/business/profiles
router.post(
  '/profiles',
  authMiddleware,
  async (req: AuthRequest, res: Response<BusinessProfileResponse>) => {
    try {
      const { name, category, primaryLocation, website, brandVoice, mainGoal } = req.body;

      const profile = await BusinessService.createProfile(req.userId!, {
        name,
        category,
        primaryLocation,
        website,
        brandVoice,
        mainGoal,
      });

      const response: BusinessProfileResponse = {
        _id: profile._id.toString(),
        userId: profile.userId.toString(),
        name: profile.name,
        category: profile.category,
        primaryLocation: profile.primaryLocation,
        website: profile.website,
        brandVoice: profile.brandVoice,
        mainGoal: profile.mainGoal,
        crawlStatus: profile.crawlStatus,
        crawlStartedAt: profile.crawlStartedAt,
        crawlCompletedAt: profile.crawlCompletedAt,
        crawlError: profile.crawlError,
        totalPagesCrawled: profile.totalPagesCrawled,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };

      res.status(201).json(response);
    } catch (error) {
      throw error;
    }
  }
);

// GET /api/business/profiles
router.get(
  '/profiles',
  authMiddleware,
  async (req: AuthRequest, res: Response<{ profiles: BusinessProfileResponse[] }>) => {
    try {
      const profiles = await BusinessService.getProfilesByUser(req.userId!);

      const response = {
        profiles: profiles.map(p => ({
          _id: p._id.toString(),
          userId: p.userId.toString(),
          name: p.name,
          category: p.category,
          primaryLocation: p.primaryLocation,
          website: p.website,
          brandVoice: p.brandVoice,
          mainGoal: p.mainGoal,
          crawlStatus: p.crawlStatus,
          crawlStartedAt: p.crawlStartedAt,
          crawlCompletedAt: p.crawlCompletedAt,
          crawlError: p.crawlError,
          totalPagesCrawled: p.totalPagesCrawled,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      throw error;
    }
  }
);

// GET /api/business/profiles/current
router.get(
  '/profiles/current',
  authMiddleware,
  async (req: AuthRequest, res: Response<BusinessProfileResponse | null>) => {
    try {
      const profile = await BusinessService.getCurrentProfile(req.userId!);

      if (!profile) {
        return res.status(200).json(null);
      }

      const response: BusinessProfileResponse = {
        _id: profile._id.toString(),
        userId: profile.userId.toString(),
        name: profile.name,
        category: profile.category,
        primaryLocation: profile.primaryLocation,
        website: profile.website,
        brandVoice: profile.brandVoice,
        mainGoal: profile.mainGoal,
        crawlStatus: profile.crawlStatus,
        crawlStartedAt: profile.crawlStartedAt,
        crawlCompletedAt: profile.crawlCompletedAt,
        crawlError: profile.crawlError,
        totalPagesCrawled: profile.totalPagesCrawled,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };

      res.status(200).json(response);
    } catch (error) {
      throw error;
    }
  }
);

// GET /api/business/profiles/:profileId
router.get(
  '/profiles/:profileId',
  authMiddleware,
  async (req: AuthRequest, res: Response<BusinessProfileResponse>) => {
    try {
      const profile = await BusinessService.getProfile(req.params.profileId);

      const response: BusinessProfileResponse = {
        _id: profile._id.toString(),
        userId: profile.userId.toString(),
        name: profile.name,
        category: profile.category,
        primaryLocation: profile.primaryLocation,
        website: profile.website,
        brandVoice: profile.brandVoice,
        mainGoal: profile.mainGoal,
        crawlStatus: profile.crawlStatus,
        crawlStartedAt: profile.crawlStartedAt,
        crawlCompletedAt: profile.crawlCompletedAt,
        crawlError: profile.crawlError,
        totalPagesCrawled: profile.totalPagesCrawled,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };

      res.status(200).json(response);
    } catch (error) {
      throw error;
    }
  }
);

export default router;
