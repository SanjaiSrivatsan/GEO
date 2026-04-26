import logger from '../config/logger.js';
import { GapIssue, CanonicalEntity, BrandMention, GapSeverity } from '../models/index.js';

export class GapDetectionService {
  static async detectAllGaps(businessId: string) {
    logger.info(`Detecting gaps for business ${businessId}`);

    try {
      const canonical = await CanonicalEntity.findOne({ businessProfileId: businessId }).lean();
      const mentions = await BrandMention.find({ businessProfileId: businessId }).lean();

      const gaps: typeof GapIssue.prototype[] = [];

      // Detect each gap type
      const categoryMismatchGap = await this.detectCategoryMismatch(businessId, canonical);
      if (categoryMismatchGap) gaps.push(categoryMismatchGap);

      const serviceDriftGap = await this.detectServiceDrift(businessId, canonical, mentions);
      if (serviceDriftGap) gaps.push(serviceDriftGap);

      const geoBindingGap = await this.detectWeakGeoBinding(businessId, canonical);
      if (geoBindingGap) gaps.push(geoBindingGap);

      const vocabularyGap = await this.detectInconsistentVocabulary(businessId, canonical, mentions);
      if (vocabularyGap) gaps.push(vocabularyGap);

      logger.info(`Detected ${gaps.length} gaps for business ${businessId}`);

      return gaps;
    } catch (error) {
      logger.error('Gap detection error:', error);
      throw error;
    }
  }

  private static async detectCategoryMismatch(businessId: string, canonical: any) {
    // Simulate category mismatch detection
    if (!canonical || !canonical.primaryCategory) {
      const gap = new GapIssue({
        businessProfileId: businessId,
        gapType: 'CATEGORY_MISMATCH',
        severity: GapSeverity.HIGH,
        title: 'Category Not Defined',
        description: 'Primary business category is not defined in canonical entity',
        evidence: { missing: 'primaryCategory' },
        affectedDimensions: ['accuracy'],
      });
      await gap.save();
      return gap;
    }
    return null;
  }

  private static async detectServiceDrift(businessId: string, canonical: any, mentions: any[]) {
    // Service drift: services listed in one place but not others
    if (canonical && canonical.services && canonical.services.length > 0 && mentions.length > 0) {
      const mentionTexts = mentions.map(m => m.mentionText.toLowerCase()).join(' ');
      const canonicalServices = canonical.services.map((s: any) => s.name.toLowerCase());

      const missingServices = canonicalServices.filter((service: string) => !mentionTexts.includes(service));

      if (missingServices.length > 0) {
        const gap = new GapIssue({
          businessProfileId: businessId,
          gapType: 'SERVICE_DRIFT',
          severity: GapSeverity.MEDIUM,
          title: 'Service Drift Detected',
          description: `Services listed in canonical entity are not mentioned in brand mentions: ${missingServices.join(', ')}`,
          evidence: {
            canonical_services: canonicalServices,
            missing_in_mentions: missingServices,
          },
          affectedDimensions: ['presence', 'accuracy'],
        });
        await gap.save();
        return gap;
      }
    }
    return null;
  }

  private static async detectWeakGeoBinding(businessId: string, canonical: any) {
    // Weak geo binding: location not clearly associated
    if (!canonical || !canonical.geoScope) {
      const gap = new GapIssue({
        businessProfileId: businessId,
        gapType: 'WEAK_GEO_BINDING',
        severity: GapSeverity.MEDIUM,
        title: 'Weak Geographic Binding',
        description: 'Geographic scope is not clearly defined in canonical entity',
        evidence: { missing: 'geoScope' },
        affectedDimensions: ['presence', 'trust'],
      });
      await gap.save();
      return gap;
    }
    return null;
  }

  private static async detectInconsistentVocabulary(businessId: string, canonical: any, mentions: any[]) {
    // Inconsistent vocabulary: different terms used
    if (canonical && canonical.approvedTerms && canonical.approvedTerms.length > 0) {
      const terminologyScore = this.calculateTerminologyConsistency(canonical.approvedTerms, mentions);

      if (terminologyScore < 0.6) {
        const gap = new GapIssue({
          businessProfileId: businessId,
          gapType: 'INCONSISTENT_VOCABULARY',
          severity: GapSeverity.LOW,
          title: 'Inconsistent Vocabulary Usage',
          description: `Approved terms are not consistently used across mentions (consistency: ${(terminologyScore * 100).toFixed(1)}%)`,
          evidence: {
            consistency_score: terminologyScore,
            approved_terms: canonical.approvedTerms,
          },
          affectedDimensions: ['accuracy'],
        });
        await gap.save();
        return gap;
      }
    }
    return null;
  }

  private static calculateTerminologyConsistency(approvedTerms: string[], mentions: any[]): number {
    if (mentions.length === 0) return 0.5;

    const mentionTexts = mentions.map(m => m.mentionText.toLowerCase());
    let matchCount = 0;

    approvedTerms.forEach(term => {
      const termLower = term.toLowerCase();
      mentionTexts.forEach(text => {
        if (text.includes(termLower)) {
          matchCount++;
        }
      });
    });

    return Math.min(matchCount / (approvedTerms.length * mentions.length), 1);
  }

  static async getGaps(businessId: string, severity?: string) {
    let query: any = { businessProfileId: businessId };

    if (severity) {
      query.severity = severity;
    }

    const gaps = await GapIssue.find(query).sort({ createdAt: -1 }).lean();

    return {
      businessId,
      gapCount: gaps.length,
      gaps,
    };
  }

  static async updateGapStatus(gapId: string, status: 'open' | 'acknowledged' | 'resolved') {
    const gap = await GapIssue.findByIdAndUpdate(gapId, { $set: { status } }, { new: true }).lean();

    if (!gap) {
      throw new Error('Gap issue not found');
    }

    logger.info(`Gap ${gapId} status updated to ${status}`);

    return gap;
  }
}
