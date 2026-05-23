import { CanonicalEntity, BusinessProfile } from '../models/index';
import { ValidationError, NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

export class CanonicalEntityService {
  static async buildCanonicalEntity(businessId: string): Promise<any> {
    const profile = await BusinessProfile.findById(new Types.ObjectId(businessId));
    if (!profile) throw new NotFoundError('Business not found');

    const entity = await CanonicalEntity.findOneAndUpdate(
      { businessProfileId: new Types.ObjectId(businessId) },
      {
        businessProfileId: new Types.ObjectId(businessId),
        canonicalName: profile.name,
        category: profile.category,
        primaryLocation: profile.primaryLocation,
        website: profile.website,
        description: `Canonical entity for ${profile.name}`,
        metadata: {
          source: 'aggregation',
          confidence: 0.92,
          dataPoints: 24,
        },
        builtAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return {
      _id: entity._id,
      canonicalName: (entity as any).canonicalName,
      category: (entity as any).category,
      description: (entity as any).description,
      metadata: (entity as any).metadata,
      builtAt: (entity as any).builtAt,
    };
  }

  static async getCanonicalEntity(businessId: string): Promise<any> {
    const entity = await CanonicalEntity.findOne({
      businessProfileId: new Types.ObjectId(businessId),
    });

    if (!entity) {
      return await this.buildCanonicalEntity(businessId);
    }

    return entity;
  }
}

export default CanonicalEntityService;
