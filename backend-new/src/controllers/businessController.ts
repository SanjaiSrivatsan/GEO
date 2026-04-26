import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { BusinessProfile } from '../models/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

export class BusinessController {
  static async createProfile(req: AuthRequest, res: Response): Promise<void> {
    const { name, category, primaryLocation, website, brandVoice, mainGoal } = req.body;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      logger.info(`Creating business profile for user ${req.user.userId}: ${name}`);

      const profile = new BusinessProfile({
        userId: req.user.userId,
        name,
        category,
        primaryLocation,
        website,
        brandVoice,
        mainGoal,
        crawlStatus: 'not_started',
      });

      await profile.save();

      res.status(201).json({
        profile: {
          id: profile._id,
          user_id: profile.userId,
          name: profile.name,
          category: profile.category,
          primary_location: profile.primaryLocation,
          website: profile.website,
          brand_voice: profile.brandVoice,
          main_goal: profile.mainGoal,
          created_at: profile.createdAt,
          updated_at: profile.updatedAt,
        },
        message: 'Business profile created successfully',
      });
    } catch (error) {
      logger.error('Error creating business profile:', error);
      throw error;
    }
  }

  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const profile = await BusinessProfile.findOne({
        _id: id,
        userId: req.user.userId,
      }).lean();

      if (!profile) {
        throw new ApiError(404, 'NOT_FOUND', 'Business profile not found');
      }

      res.json({
        id: profile._id,
        user_id: profile.userId,
        name: profile.name,
        category: profile.category,
        primary_location: profile.primaryLocation,
        website: profile.website,
        brand_voice: profile.brandVoice,
        main_goal: profile.mainGoal,
        crawl_status: profile.crawlStatus,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
      });
    } catch (error) {
      logger.error('Error fetching business profile:', error);
      throw error;
    }
  }

  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const updates = req.body;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const profile = await BusinessProfile.findOneAndUpdate(
        { _id: id, userId: req.user.userId },
        { $set: updates },
        { new: true }
      ).lean();

      if (!profile) {
        throw new ApiError(404, 'NOT_FOUND', 'Business profile not found');
      }

      res.json(profile);
    } catch (error) {
      logger.error('Error updating business profile:', error);
      throw error;
    }
  }

  static async listProfiles(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '10');
      const skip = (page - 1) * limit;

      const profiles = await BusinessProfile.find({ userId: req.user.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await BusinessProfile.countDocuments({ userId: req.user.userId });

      res.json({
        profiles: profiles.map(p => ({
          id: p._id,
          user_id: p.userId,
          name: p.name,
          category: p.category,
          primary_location: p.primaryLocation,
          website: p.website,
          brand_voice: p.brandVoice,
          main_goal: p.mainGoal,
          crawl_status: p.crawlStatus,
          created_at: p.createdAt,
          updated_at: p.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error listing business profiles:', error);
      throw error;
    }
  }

  static async deleteProfile(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const profile = await BusinessProfile.findOneAndDelete({
        _id: id,
        userId: req.user.userId,
      }).lean();

      if (!profile) {
        throw new ApiError(404, 'NOT_FOUND', 'Business profile not found');
      }

      res.json({ message: 'Business profile deleted successfully', id });
    } catch (error) {
      logger.error('Error deleting business profile:', error);
      throw error;
    }
  }
}
