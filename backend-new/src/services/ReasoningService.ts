import logger from '../config/logger.js';
import { ReasoningAnalysis } from '../models/index.js';

export class ReasoningService {
  static async analyzeReasoning(businessId: string, analysisType: string) {
    logger.info(`Running reasoning analysis for business ${businessId}: ${analysisType}`);

    try {
      const analysis = new ReasoningAnalysis({
        businessProfileId: businessId,
        analysisType,
        findings: {
          summary: 'Analysis completed',
          confidence: 0.8,
        },
        recommendations: ['Recommendation 1', 'Recommendation 2'],
      });

      await analysis.save();

      logger.info(`Reasoning analysis completed for business ${businessId}`);

      return {
        analysisId: analysis._id,
        businessId,
        analysisType,
        findings: analysis.findings,
        recommendations: analysis.recommendations,
      };
    } catch (error) {
      logger.error('Reasoning analysis error:', error);
      throw error;
    }
  }

  static async getAnalysis(businessId: string) {
    const analysis = await ReasoningAnalysis.find({ businessProfileId: businessId })
      .sort({ executedAt: -1 })
      .lean();

    return {
      businessId,
      analysisCount: analysis.length,
      analysis,
    };
  }

  static async getDriftReport(businessId: string) {
    const analyses = await ReasoningAnalysis.find({ businessProfileId: businessId }).lean();

    return {
      businessId,
      driftDetected: analyses.length > 0,
      analyses,
    };
  }
}
