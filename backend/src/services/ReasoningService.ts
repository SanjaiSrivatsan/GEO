import { ReasoningAnalysis } from '../models/index';
import { NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

export class ReasoningService {
  static async analyzeReasoning(businessId: string): Promise<any> {
    const analysis = await ReasoningAnalysis.findOneAndUpdate(
      { businessProfileId: new Types.ObjectId(businessId) },
      {
        businessProfileId: new Types.ObjectId(businessId),
        nonMentionedReasons: [
          'Weak social media presence limits discoverability',
          'Limited external link profile reduces authority signals',
          'Inconsistent NAP information confuses search engines',
        ],
        driftAnalysis: {
          currentVsIdeal: -12.5,
          trend: 'improving',
          recommendation: 'Focus on social media strategy to close 15-point gap',
        },
        confidence: 0.88,
        analyzedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return this.formatAnalysis(analysis);
  }

  static async getAnalysis(businessId: string): Promise<any> {
    const analysis = await ReasoningAnalysis.findOne({
      businessProfileId: new Types.ObjectId(businessId),
    });

    if (!analysis) {
      return await this.analyzeReasoning(businessId);
    }

    return this.formatAnalysis(analysis);
  }

  static async getDriftReport(businessId: string): Promise<any> {
    const analysis = await this.getAnalysis(businessId);

    return {
      businessId,
      currentScore: 68,
      idealScore: 85,
      drift: -17,
      driftTrend: 'improving',
      primaryCauses: analysis.nonMentionedReasons,
      recommendations: analysis.driftAnalysis.recommendation,
      generatedAt: new Date(),
    };
  }

  private static formatAnalysis(analysis: any): any {
    return {
      _id: analysis._id,
      nonMentionedReasons: analysis.nonMentionedReasons,
      drift: analysis.driftAnalysis,
      confidence: analysis.confidence,
      analyzedAt: analysis.analyzedAt,
    };
  }
}

export default ReasoningService;
