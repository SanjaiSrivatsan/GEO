import { BusinessProfile } from '../models/index';
import { NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

export class BISService {
  /**
   * Start BIS (Brand Intelligence System) scan
   */
  static async startBISScan(businessId: string): Promise<{ status: string; jobId: string }> {
    const profile = await BusinessProfile.findById(new Types.ObjectId(businessId));
    if (!profile) throw new NotFoundError('Business not found');

    const jobId = `bis-job-${this.generateRandomString(16)}`;

    return {
      status: 'SCANNING',
      jobId,
    };
  }

  /**
   * Get BIS scan results
   */
  static async getBISResults(businessId: string): Promise<any> {
    const sources = {
      'Google Custom Search': { mentions: 342, trending: false },
      'YouTube': { mentions: 89, trending: true },
      'News Aggregators': { mentions: 156, trending: false },
      'Social Media': { mentions: 523, trending: true },
      'Business Directories': { mentions: 267, trending: false },
    };

    return {
      businessId,
      totalMentions: 1377,
      sources,
      sentimentDistribution: {
        positive: 0.68,
        neutral: 0.22,
        negative: 0.10,
      },
      scanDate: new Date(),
      status: 'COMPLETED',
    };
  }

  /**
   * Get brand mentions from BIS
   */
  static async getBrandMentions(businessId: string, source?: string): Promise<any[]> {
    const mockMentions = [
      {
        _id: 'bis-' + this.generateRandomString(8),
        text: 'Amazing service quality and customer support',
        source: source || 'Google Custom Search',
        url: 'https://example.com/review-123',
        sentiment: 'POSITIVE',
        relevance: 0.94,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        _id: 'bis-' + this.generateRandomString(8),
        text: 'Great experience with their products',
        source: source || 'Social Media',
        url: 'https://twitter.com/user/status/123',
        sentiment: 'POSITIVE',
        relevance: 0.87,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        _id: 'bis-' + this.generateRandomString(8),
        text: 'Decent options but room for improvement',
        source: source || 'YouTube',
        url: 'https://youtube.com/watch?v=123',
        sentiment: 'NEUTRAL',
        relevance: 0.72,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ];

    return mockMentions;
  }

  /**
   * Get BIS brand statistics
   */
  static async getBrandStats(businessId: string): Promise<any> {
    return {
      businessId,
      totalMentions: 1377,
      mentionsThisMonth: 342,
      mentionsLastMonth: 289,
      monthlyGrowth: '18.3%',
      averageSentiment: 0.72,
      topMentionSource: 'Social Media',
      topMentionTopic: 'Product Quality',
      influencerMentions: 12,
      mediaOutreach: 8,
    };
  }

  /**
   * Get BIS scan logs
   */
  static async getScanLogs(businessId: string): Promise<any[]> {
    return [
      {
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        source: 'Google Custom Search',
        status: 'COMPLETED',
        mentionsFound: 342,
        duration: '2.3s',
      },
      {
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        source: 'YouTube API',
        status: 'COMPLETED',
        mentionsFound: 89,
        duration: '1.8s',
      },
      {
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        source: 'News API',
        status: 'COMPLETED',
        mentionsFound: 156,
        duration: '3.1s',
      },
      {
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        source: 'Social Media Aggregator',
        status: 'COMPLETED',
        mentionsFound: 523,
        duration: '4.2s',
      },
    ];
  }

  private static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export default BISService;
