import { BrandMention, BusinessProfile } from '../models/index';
import { ValidationError, NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

export class MentionService {
  /**
   * Start brand mention discovery
   * In production, this would query Google Custom Search API, web search engines, etc.
   */
  static async discoverMentions(businessId: string): Promise<{ status: string; jobId: string }> {
    if (!businessId) {
      throw new ValidationError('businessId is required');
    }

    const profile = await BusinessProfile.findById(new Types.ObjectId(businessId));
    if (!profile) {
      throw new NotFoundError('Business profile not found');
    }

    const jobId = `mention-job-${this.generateRandomString(16)}`;

    // Simulate mention discovery (in production, queue a job)
    this.simulateMentionDiscovery(businessId, profile.name);

    return {
      status: 'PENDING',
      jobId,
    };
  }

  /**
   * Get brand mentions for a business
   */
  static async getMentions(
    businessId: string,
    filters?: {
      type?: string;
      sentiment?: string;
      source?: string;
    }
  ): Promise<any[]> {
    const query: any = { businessProfileId: new Types.ObjectId(businessId) };

    if (filters?.type) {
      query.mentionType = filters.type;
    }
    if (filters?.sentiment) {
      query.sentiment = filters.sentiment;
    }
    if (filters?.source) {
      query.source = filters.source;
    }

    const mentions = await BrandMention.find(query).limit(100).sort({ discoveredAt: -1 });

    return mentions.map((mention: any) => ({
      _id: mention._id,
      domain: mention.domain,
      snippet: mention.snippet,
      url: mention.url,
      mentionType: mention.mentionType,
      sentiment: mention.sentiment,
      relevanceScore: mention.relevanceScore,
      source: mention.source,
      discoveredAt: mention.discoveredAt,
    }));
  }

  /**
   * Get brand mention statistics
   */
  static async getMentionStats(
    businessId: string
  ): Promise<{
    total: number;
    byType: Record<string, number>;
    bySentiment: Record<string, number>;
    bySource: Record<string, number>;
    avgRelevanceScore: number;
  }> {
    const mentions = await BrandMention.find({ businessProfileId: new Types.ObjectId(businessId) });

    const stats = {
      total: mentions.length,
      byType: {} as Record<string, number>,
      bySentiment: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      avgRelevanceScore: 0,
    };

    let totalRelevance = 0;

    for (const mention of mentions) {
      // Count by type
      const mentionType = (mention as any).mentionType || 'UNKNOWN';
      stats.byType[mentionType] = (stats.byType[mentionType] || 0) + 1;

      // Count by sentiment
      const sentiment = (mention as any).sentiment || 'NEUTRAL';
      stats.bySentiment[sentiment] = (stats.bySentiment[sentiment] || 0) + 1;

      // Count by source
      const source = (mention as any).source || 'UNKNOWN';
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;

      // Sum relevance
      totalRelevance += (mention as any).relevanceScore || 0;
    }

    if (mentions.length > 0) {
      stats.avgRelevanceScore = totalRelevance / mentions.length;
    }

    return stats;
  }

  /**
   * Validate a mention
   */
  static async validateMention(mention: any): Promise<boolean> {
    // Basic validation logic
    if (!mention.domain || !mention.snippet) {
      return false;
    }

    // Check if snippet contains business-related keywords
    const hasKeywords = mention.snippet.toLowerCase().includes('business') ||
      mention.snippet.toLowerCase().includes('company') ||
      mention.snippet.toLowerCase().includes('service');

    return hasKeywords;
  }

  /**
   * Simulate mention discovery
   */
  private static simulateMentionDiscovery(businessId: string, businessName: string): void {
    // Delay to simulate discovery process
    setTimeout(async () => {
      try {
        // Mock mentions data
        const mockMentions = [
          {
            domain: 'example-review-site.com',
            snippet: `${businessName} is an excellent business providing top-notch services.`,
            url: 'https://example-review-site.com/reviews/business-123',
            mentionType: 'DIRECT',
            sentiment: 'POSITIVE',
            relevanceScore: 0.95,
            source: 'Google Custom Search',
          },
          {
            domain: 'industry-blog.com',
            snippet: `The latest growth statistics show ${businessName} among top performers.`,
            url: 'https://industry-blog.com/growth-analysis/2024',
            mentionType: 'INDIRECT',
            sentiment: 'POSITIVE',
            relevanceScore: 0.85,
            source: 'Industry News',
          },
          {
            domain: 'social-media-tracker.com',
            snippet: `Users discussing ${businessName} on social platforms.`,
            url: 'https://social-media-tracker.com/trends',
            mentionType: 'SOCIAL',
            sentiment: 'NEUTRAL',
            relevanceScore: 0.72,
            source: 'Social Media',
          },
          {
            domain: 'business-directory.com',
            snippet: `${businessName} - Listed in business directory with verified details.`,
            url: 'https://business-directory.com/company/business-123',
            mentionType: 'DIRECTORY',
            sentiment: 'NEUTRAL',
            relevanceScore: 0.88,
            source: 'Business Directory',
          },
          {
            domain: 'news-aggregator.com',
            snippet: `Press release: ${businessName} announces new product launch.`,
            url: 'https://news-aggregator.com/press-releases/2024',
            mentionType: 'PRESS',
            sentiment: 'POSITIVE',
            relevanceScore: 0.92,
            source: 'News Aggregator',
          },
        ];

        // Store mentions
        for (const mockMention of mockMentions) {
          await BrandMention.findOneAndUpdate(
            {
              businessProfileId: new Types.ObjectId(businessId),
              url: mockMention.url,
            },
            {
              businessProfileId: new Types.ObjectId(businessId),
              ...mockMention,
              discoveredAt: new Date(),
            },
            { upsert: true }
          );
        }
      } catch (error) {
        // Handle error silently
        console.error('Error in mention discovery:', error);
      }
    }, 2000); // 2-second delay to simulate discovery
  }

  /**
   * Helper: Generate random string
   */
  private static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export default MentionService;
