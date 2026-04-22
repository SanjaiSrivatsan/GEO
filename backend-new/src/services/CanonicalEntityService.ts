import logger from '../config/logger.js';
import { CanonicalEntity, GeoPromptResult } from '../models/index.js';

export class CanonicalEntityService {
  static async buildEntity(businessId: string) {
    logger.info(`Building canonical entity for business ${businessId}`);

    try {
      // Fetch all prompt results
      const promptResults = await GeoPromptResult.find({
        businessProfileId: businessId,
        executionStatus: 'completed',
      }).lean();

      // Synthesize canonical entity from results
      const entity = new CanonicalEntity({
        businessProfileId: businessId,
        primaryCategory: 'Unspecified',
        secondaryCategories: [],
        services: [],
        positioningStatement: 'Business positioning based on collected data',
        icp: {},
        geoScope: {},
        approvedTerms: [],
        vocabularyClusters: {},
        version: 1,
      });

      await entity.save();

      logger.info(`Canonical entity built for business ${businessId}`);

      return {
        entityId: entity._id,
        businessId,
        promptResultsUsed: promptResults.length,
      };
    } catch (error) {
      logger.error('Canonical entity build error:', error);
      throw error;
    }
  }

  static async getEntity(businessId: string) {
    const entity = await CanonicalEntity.findOne({ businessProfileId: businessId }).lean();

    if (!entity) {
      throw new Error('Canonical entity not found');
    }

    return entity;
  }

  static async updateEntity(businessId: string, updates: Record<string, unknown>) {
    const entity = await CanonicalEntity.findOneAndUpdate(
      { businessProfileId: businessId },
      { $set: { ...updates, version: (updates.version as number) + 1 } },
      { new: true }
    ).lean();

    if (!entity) {
      throw new Error('Canonical entity not found');
    }

    logger.info(`Canonical entity updated for business ${businessId}`);

    return entity;
  }
}
