import { GeoScore, GeoPromptResult, BusinessProfile } from '../models/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { Types } from 'mongoose';
import { GEO_SCORE_WEIGHTS } from '../utils/constants.js';

export class GeoScoringService {
  static async computeScore(
    businessProfileId: string,
    userId: string
  ) {
    // Get all prompt results for this business
    const promptResults = await GeoPromptResult.find({
      businessProfileId: new Types.ObjectId(businessProfileId),
      userId: new Types.ObjectId(userId),
      executionStatus: 'COMPLETED',
    });

    if (promptResults.length === 0) {
      throw new ValidationError('No completed prompt results found. Run GEO prompts first.');
    }

    // Calculate component scores based on prompt results
    const presenceScore = this.calculatePresenceScore(promptResults);
    const accuracyScore = this.calculateAccuracyScore(promptResults);
    const trustScore = this.calculateTrustScore(promptResults);
    const hallucinationPenalty = this.calculateHallucinationPenalty(promptResults);

    // GEO Formula: (Presence × 0.35) + (Accuracy × 0.35) + (Trust × 0.20) + HallucinationPenalty
    const finalGeoScore = Math.max(
      0,
      Math.min(
        100,
        presenceScore * GEO_SCORE_WEIGHTS.PRESENCE +
          accuracyScore * GEO_SCORE_WEIGHTS.ACCURACY +
          trustScore * GEO_SCORE_WEIGHTS.TRUST +
          hallucinationPenalty
      )
    );

    // Store or update score
    let geoScore = await GeoScore.findOne({
      businessProfileId: new Types.ObjectId(businessProfileId),
      userId: new Types.ObjectId(userId),
    });

    const scoreData = {
      businessProfileId: new Types.ObjectId(businessProfileId),
      userId: new Types.ObjectId(userId),
      presenceScore,
      accuracyScore,
      trustScore,
      hallucinationPenalty,
      finalGeoScore,
      presenceBreakdown: { mentions: 50, citations: 30, directories: 20 },
      accuracyBreakdown: { napConsistency: 60, dataAccuracy: 40 },
      trustBreakdown: { sentiment: 50, reviews: 30, trustSignals: 20 },
      hallucinationBreakdown: { uncitedClaims: -5, contradictions: -3 },
      promptResultsCount: promptResults.length,
      computationMethod: 'v1.0',
      computedAt: new Date(),
    };

    if (geoScore) {
      geoScore = await GeoScore.findByIdAndUpdate(geoScore._id, scoreData, { new: true });
    } else {
      geoScore = await GeoScore.create(scoreData);
    }

    return geoScore;
  }

  static async getScore(businessProfileId: string) {
    const score = await GeoScore.findOne({
      businessProfileId: new Types.ObjectId(businessProfileId),
    });

    if (!score) {
      throw new NotFoundError('GEO score not found');
    }

    return score;
  }

  static async getScoreBreakdown(businessProfileId: string) {
    const score = await this.getScore(businessProfileId);

    return {
      finalGeoScore: score.finalGeoScore,
      components: {
        presence: {
          score: score.presenceScore,
          weight: GEO_SCORE_WEIGHTS.PRESENCE,
          contribution: score.presenceScore * GEO_SCORE_WEIGHTS.PRESENCE,
          breakdown: score.presenceBreakdown,
        },
        accuracy: {
          score: score.accuracyScore,
          weight: GEO_SCORE_WEIGHTS.ACCURACY,
          contribution: score.accuracyScore * GEO_SCORE_WEIGHTS.ACCURACY,
          breakdown: score.accuracyBreakdown,
        },
        trust: {
          score: score.trustScore,
          weight: GEO_SCORE_WEIGHTS.TRUST,
          contribution: score.trustScore * GEO_SCORE_WEIGHTS.TRUST,
          breakdown: score.trustBreakdown,
        },
        hallucinationPenalty: {
          score: score.hallucinationPenalty,
          weight: 1,
          contribution: score.hallucinationPenalty,
          breakdown: score.hallucinationBreakdown,
        },
      },
      formula: 'GEO_SCORE = (Presence × 0.35) + (Accuracy × 0.35) + (Trust × 0.20) + HallucinationPenalty',
      computedAt: score.computedAt,
      promptResultsCount: score.promptResultsCount,
    };
  }

  private static calculatePresenceScore(promptResults: any[]): number {
    // Extract presence signals from prompt results
    // In production, this would parse actual LLM responses
    const mentioned = promptResults.filter(r => 
      r.structuredResponse?.mentioned === true
    ).length;
    const presenceScore = (mentioned / promptResults.length) * 100;
    return Math.min(100, presenceScore);
  }

  private static calculateAccuracyScore(promptResults: any[]): number {
    // Extract accuracy signals (NAP consistency, data accuracy, etc.)
    const accurate = promptResults.filter(r => 
      r.validationPassed === 'true'
    ).length;
    const accuracyScore = (accurate / promptResults.length) * 100;
    return Math.min(100, accuracyScore);
  }

  private static calculateTrustScore(promptResults: any[]): number {
    // Extract trust signals (sentiment, reviews, trust signals)
    const avgConfidence = promptResults.reduce((sum, r) => 
      sum + (r.confidenceScore || 0), 0) / promptResults.length;
    return Math.min(100, avgConfidence * 100);
  }

  private static calculateHallucinationPenalty(promptResults: any[]): number {
    // Calculate hallucination penalty based on unvalidated claims
    const unvalidated = promptResults.filter(r => 
      r.validationPassed !== 'true'
    ).length;
    const penalty = -(unvalidated / promptResults.length) * 10;
    return Math.max(-10, Math.min(0, penalty));
  }
}

export default GeoScoringService;
