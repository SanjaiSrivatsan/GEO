import logger from '../config/logger.js';
import { GeoScore, GeoPromptResult, BrandMention, GoogleReview } from '../models/index.js';

export class GeoScoringService {
  /**
   * Main formula: GEO_SCORE = (Presence × 0.35) + (Accuracy × 0.35) + (Trust × 0.20) + HallucinationPenalty
   */
  static async computeGeoScore(businessId: string, userId: string) {
    logger.info(`Computing GEO score for business: ${businessId}`);

    try {
      // Fetch all prompt results
      const promptResults = await GeoPromptResult.find({
        businessProfileId: businessId,
        executionStatus: 'completed',
      }).lean();

      // Fetch brand mentions
      const mentions = await BrandMention.find({ businessProfileId: businessId }).lean();

      // Fetch Google reviews
      const reviews = await GoogleReview.find({ businessProfileId: businessId }).lean();

      // Calculate dimension scores
      const presenceScore = this.calculatePresenceScore(promptResults, mentions);
      const accuracyScore = this.calculateAccuracyScore(promptResults, mentions);
      const trustScore = this.calculateTrustScore(reviews, mentions, promptResults);
      const hallucinationPenalty = this.calculateHallucinationPenalty(promptResults);

      // Apply formula
      const finalGeoScore = this.applyFormula(presenceScore, accuracyScore, trustScore, hallucinationPenalty);

      // Create breakdowns
      const presenceBreakdown = this.generatePresenceBreakdown(promptResults, mentions);
      const accuracyBreakdown = this.generateAccuracyBreakdown(promptResults);
      const trustBreakdown = this.generateTrustBreakdown(reviews, mentions);
      const hallucinationBreakdown = { penalty: hallucinationPenalty };

      // Save to database
      const geoScore = new GeoScore({
        businessProfileId: businessId,
        userId,
        presenceScore,
        accuracyScore,
        trustScore,
        hallucinationPenalty,
        finalGeoScore,
        presenceBreakdown,
        accuracyBreakdown,
        trustBreakdown,
        hallucinationBreakdown,
        promptResultsCount: promptResults.length,
        computationMethod: 'v1.0',
        computedAt: new Date(),
      });

      await geoScore.save();

      logger.info(`GEO score computed: ${finalGeoScore} for business ${businessId}`);

      return geoScore.toObject();
    } catch (error) {
      logger.error('Error computing GEO score:', error);
      throw error;
    }
  }

  private static calculatePresenceScore(promptResults: any[], mentions: any[]): number {
    // Presence: How visible is the business?
    // Based on: number of prompt results, number of mentions, mention sources diversity

    let score = 0;

    // Weight from prompt results (0-40 points)
    const resultCount = Math.min(promptResults.length / 22, 1) * 40; // Max 22 prompts
    score += resultCount;

    // Weight from mentions (0-30 points)
    const mentionCount = Math.min(mentions.length / 50, 1) * 30; // Normalize to 50 mentions
    score += mentionCount;

    // Weight from mention source diversity (0-30 points)
    const sourceDiversity = this.calculateSourceDiversity(mentions) * 30;
    score += sourceDiversity;

    return Math.min(Math.round(score * 100) / 100, 100);
  }

  private static calculateAccuracyScore(promptResults: any[], mentions: any[]): number {
    // Accuracy: How accurate/consistent is the data across sources?
    // Based on: consistency in prompt results, mention consistency

    let score = 50; // Base score

    // Check consistency in prompt results
    const consistentResults = promptResults.filter(r => r.result && typeof r.result === 'object').length;
    const consistencyBonus = (consistentResults / Math.max(promptResults.length, 1)) * 30;
    score += consistencyBonus;

    // Check mention consistency (same info across sources)
    const mentionConsistency = this.calculateMentionConsistency(mentions);
    score += mentionConsistency * 20;

    return Math.min(Math.round(score * 100) / 100, 100);
  }

  private static calculateTrustScore(reviews: any[], mentions: any[], promptResults: any[]): number {
    // Trust: How trustworthy is the information?
    // Based on: review ratings, mention sentiment, prompt confidence

    let score = 50; // Base score

    // Reviews contribution (0-30 points)
    if (reviews.length > 0) {
      const avgRating = (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) / 5;
      score += avgRating * 30;
    }

    // Mention sentiment contribution (0-35 points)
    const positiveCount = mentions.filter(m => m.sentiment === 'positive').length;
    const sentimentScore = (positiveCount / Math.max(mentions.length, 1)) * 35;
    score += sentimentScore;

    // Prompt confidence contribution (0-35 points)
    const avgConfidence = this.calculateAverageConfidence(promptResults);
    score += avgConfidence * 35;

    return Math.min(Math.round(score * 100) / 100, 100);
  }

  private static calculateHallucinationPenalty(promptResults: any[]): number {
    // Hallucination penalty: 0 to -10
    // Based on: number of failed/error prompt results
    const failedResults = promptResults.filter(r => r.executionStatus === 'failed').length;
    const failureRate = failedResults / Math.max(promptResults.length, 1);

    // Max 10 points penalty for 100% failure rate
    const penalty = Math.min(failureRate * 10, 10);
    return Math.round(-penalty * 100) / 100;
  }

  private static applyFormula(
    presence: number,
    accuracy: number,
    trust: number,
    hallucinationPenalty: number
  ): number {
    const score = presence * 0.35 + accuracy * 0.35 + trust * 0.2 + hallucinationPenalty;
    return Math.max(Math.min(Math.round(score * 100) / 100, 100), 0);
  }

  private static calculateSourceDiversity(mentions: any[]): number {
    if (mentions.length === 0) return 0;

    const sources = new Set(mentions.map(m => m.sourceType)).size;
    const totalSources = 5; // Estimated: Google, YouTube, News, Reddit, Social

    return Math.min(sources / totalSources, 1);
  }

  private static calculateMentionConsistency(mentions: any[]): number {
    if (mentions.length < 2) return 0.5;

    // Very simple: if most mentions have consistent type/source
    const sourceFreq: Record<string, number> = {};

    mentions.forEach(m => {
      sourceFreq[m.sourceType] = (sourceFreq[m.sourceType] || 0) + 1;
    });

    const maxFreq = Math.max(...Object.values(sourceFreq));
    return maxFreq / mentions.length;
  }

  private static calculateAverageConfidence(promptResults: any[]): number {
    if (promptResults.length === 0) return 0.5;

    const totalConfidence = promptResults
      .filter(r => r.result && typeof r.result === 'object')
      .reduce((sum, r) => {
        const confidence = r.result.confidence || 0.5;
        return sum + (typeof confidence === 'number' ? confidence : 0.5);
      }, 0);

    return totalConfidence / promptResults.length || 0.5;
  }

  private static generatePresenceBreakdown(promptResults: any[], mentions: any[]): Record<string, unknown> {
    return {
      promptResultsCount: promptResults.length,
      mentionsCount: mentions.length,
      sourceDiversity: this.calculateSourceDiversity(mentions),
      componentsCount: (promptResults.length + mentions.length) / 2,
    };
  }

  private static generateAccuracyBreakdown(promptResults: any[]): Record<string, unknown> {
    const consistentResults = promptResults.filter(r => r.result && typeof r.result === 'object').length;
    return {
      totalResults: promptResults.length,
      consistentResults,
      consistencyRate: promptResults.length > 0 ? (consistentResults / promptResults.length) * 100 : 0,
    };
  }

  private static generateTrustBreakdown(reviews: any[], mentions: any[]): Record<string, unknown> {
    const positiveCount = mentions.filter(m => m.sentiment === 'positive').length;
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 0;

    return {
      reviewsCount: reviews.length,
      avgRating: Math.round(avgRating * 100) / 100,
      mentionsCount: mentions.length,
      positiveMentions: positiveCount,
      positivePercentage: mentions.length > 0 ? (positiveCount / mentions.length) * 100 : 0,
    };
  }
}
