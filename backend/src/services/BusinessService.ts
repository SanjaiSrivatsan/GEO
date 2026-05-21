import { BusinessProfile } from '../models/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { Types } from 'mongoose';

export class BusinessService {
  static async createProfile(userId: string, data: {
    name: string;
    category: string;
    primaryLocation: string;
    website?: string;
    brandVoice?: string;
    mainGoal?: string;
  }) {
    if (!data.name || !data.category || !data.primaryLocation) {
      throw new ValidationError('Name, category, and primaryLocation are required');
    }

    const profile = await BusinessProfile.create({
      userId: new Types.ObjectId(userId),
      ...data,
    });

    return profile;
  }

  static async getProfile(profileId: string) {
    const profile = await BusinessProfile.findById(profileId).populate('userId', 'email');
    if (!profile) {
      throw new NotFoundError('Business profile not found');
    }
    return profile;
  }

  static async getProfilesByUser(userId: string) {
    const profiles = await BusinessProfile.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
    return profiles;
  }

  static async getCurrentProfile(userId: string) {
    const profile = await BusinessProfile.findOne({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
    return profile;
  }

  static async updateProfile(profileId: string, data: Partial<{
    name: string;
    category: string;
    primaryLocation: string;
    website: string;
    brandVoice: string;
    mainGoal: string;
  }>) {
    const profile = await BusinessProfile.findByIdAndUpdate(profileId, data, { new: true });
    if (!profile) {
      throw new NotFoundError('Business profile not found');
    }
    return profile;
  }

  static async updateCrawlStatus(profileId: string, status: string, error?: string) {
    const updateData: any = { crawlStatus: status };

    if (status === 'IN_PROGRESS') {
      updateData.crawlStartedAt = new Date();
    } else if (status === 'COMPLETED') {
      updateData.crawlCompletedAt = new Date();
    } else if (status === 'FAILED') {
      updateData.crawlError = error;
    }

    const profile = await BusinessProfile.findByIdAndUpdate(profileId, updateData, { new: true });
    if (!profile) {
      throw new NotFoundError('Business profile not found');
    }
    return profile;
  }

  static async deleteProfile(profileId: string) {
    const profile = await BusinessProfile.findByIdAndDelete(profileId);
    if (!profile) {
      throw new NotFoundError('Business profile not found');
    }
    return profile;
  }
}

export default BusinessService;
