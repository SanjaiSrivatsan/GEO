import { GapIssue, BusinessProfile } from '../models/index';
import { NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

export class GapDetectionService {
  static async detectGaps(businessId: string): Promise<any> {
    const profile = await BusinessProfile.findById(new Types.ObjectId(businessId));
    if (!profile) throw new NotFoundError('Business not found');

    const mockGaps = [
      {
        title: 'Missing Social Media Presence',
        description: 'Business lacks active social media accounts',
        severity: 'HIGH',
        impact: 'Reduces online visibility and customer engagement',
        impactScore: 8.5,
      },
      {
        title: 'Incomplete Business Information',
        description: 'Business hours, phone number not consistent across platforms',
        severity: 'MEDIUM',
        impact: 'Causes confusion for potential customers',
        impactScore: 6.2,
      },
      {
        title: 'No Customer Reviews Strategy',
        description: 'Limited review management and customer feedback collection',
        severity: 'MEDIUM',
        impact: 'Affects credibility and ranking',
        impactScore: 7.1,
      },
      {
        title: 'Weak Local SEO Optimization',
        description: 'Missing location-specific keywords and structured data',
        severity: 'HIGH',
        impact: 'Poor local search visibility',
        impactScore: 8.8,
      },
    ];

    const gaps = [];
    for (const gap of mockGaps) {
      const created = await GapIssue.findOneAndUpdate(
        {
          businessProfileId: new Types.ObjectId(businessId),
          title: gap.title,
        },
        {
          businessProfileId: new Types.ObjectId(businessId),
          ...gap,
          detectedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      gaps.push(created);
    }

    return gaps;
  }

  static async getGaps(businessId: string): Promise<any[]> {
    const gaps = await GapIssue.find({
      businessProfileId: new Types.ObjectId(businessId),
    }).sort({ impactScore: -1 });

    return gaps;
  }
}

export default GapDetectionService;
