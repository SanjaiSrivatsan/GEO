import axios from 'axios';
import config from '../config/index.js';
import logger from '../config/logger.js';
import { BrandMention } from '../models/index.js';

export interface BISMention {
  text: string;
  sourceType: 'google_search' | 'youtube' | 'news' | 'reddit' | 'social' | 'other';
  sourceUrl: string;
  mentionType: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  postedDate: Date;
}

export class BISService {
  static async runBISScan(businessId: string, businessName: string) {
    logger.info(`Starting BIS scan for business ${businessId}: ${businessName}`);

    try {
      const mentions: BISMention[] = [];

      // Query Google CSE if configured
      if (config.googleCseApiKey && config.googleCseId) {
        logger.info('Querying Google CSE...');
        const gseMentions = await this.queryGoogleCSE(businessName);
        mentions.push(...gseMentions);
      }

      // Query YouTube if configured
      if (config.youtubeApiKey) {
        logger.info('Querying YouTube...');
        const ytMentions = await this.queryYouTube(businessName);
        mentions.push(...ytMentions);
      }

      // Query NewsAPI if configured
      if (config.newsApiKey) {
        logger.info('Querying NewsAPI...');
        const newsMentions = await this.queryNewsAPI(businessName);
        mentions.push(...newsMentions);
      }

      // Simulate Reddit mentions (requires PRAW library)
      logger.info('Simulating Reddit mentions...');
      const redditMentions = await this.simulateRedditMentions(businessName);
      mentions.push(...redditMentions);

      // Save mentions and calculate stats
      for (const mention of mentions) {
        const newMention = new BrandMention({
          businessProfileId: businessId,
          mentionText: mention.text,
          sourceType: mention.sourceType,
          sourceUrl: mention.sourceUrl,
          mentionType: mention.mentionType,
          sentiment: mention.sentiment,
          postedDate: mention.postedDate,
        });
        await newMention.save();
      }

      const stats = this.calculateStats(mentions);

      logger.info(`BIS scan completed for business ${businessId}: ${mentions.length} mentions found`);

      return {
        businessId,
        mentionsCount: mentions.length,
        stats,
      };
    } catch (error) {
      logger.error('BIS scan error:', error);
      throw error;
    }
  }

  private static async queryGoogleCSE(businessName: string): Promise<BISMention[]> {
    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          q: businessName,
          key: config.googleCseApiKey,
          cx: config.googleCseId,
          num: 10,
        },
      });

      return (response.data.items || []).map((item: any) => ({
        text: item.snippet,
        sourceType: 'google_search',
        sourceUrl: item.link,
        mentionType: 'search_result',
        sentiment: 'neutral',
        postedDate: new Date(),
      }));
    } catch (error) {
      logger.warn('Google CSE query failed:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private static async queryYouTube(businessName: string): Promise<BISMention[]> {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          q: businessName,
          key: config.youtubeApiKey,
          part: 'snippet',
          maxResults: 10,
        },
      });

      return (response.data.items || []).map((item: any) => ({
        text: item.snippet.title,
        sourceType: 'youtube',
        sourceUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        mentionType: 'video',
        sentiment: 'neutral',
        postedDate: new Date(item.snippet.publishedAt),
      }));
    } catch (error) {
      logger.warn('YouTube query failed:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private static async queryNewsAPI(businessName: string): Promise<BISMention[]> {
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: businessName,
          apiKey: config.newsApiKey,
          pageSize: 10,
          sortBy: 'publishedAt',
        },
      });

      return (response.data.articles || []).map((article: any) => ({
        text: article.title,
        sourceType: 'news',
        sourceUrl: article.url,
        mentionType: 'news_article',
        sentiment: 'neutral',
        postedDate: new Date(article.publishedAt),
      }));
    } catch (error) {
      logger.warn('NewsAPI query failed:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private static async simulateRedditMentions(businessName: string): Promise<BISMention[]> {
    // Placeholder for Reddit API integration using PRAW library
    // For now, return simulated data
    return [
      {
        text: `Discussion about ${businessName}`,
        sourceType: 'reddit',
        sourceUrl: 'https://reddit.com/r/business',
        mentionType: 'discussion',
        sentiment: 'neutral',
        postedDate: new Date(),
      },
    ];
  }

  private static calculateStats(mentions: BISMention[]) {
    if (mentions.length === 0) {
      return {
        totalMentions: 0,
        bySource: {},
        sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
        avgSentimentScore: 0,
      };
    }

    // Calculate by source
    const bySource: Record<string, number> = {};
    mentions.forEach(m => {
      bySource[m.sourceType] = (bySource[m.sourceType] || 0) + 1;
    });

    // Calculate sentiment breakdown
    const sentimentBreakdown = {
      positive: mentions.filter(m => m.sentiment === 'positive').length,
      negative: mentions.filter(m => m.sentiment === 'negative').length,
      neutral: mentions.filter(m => m.sentiment === 'neutral').length,
    };

    // Calculate average sentiment score
    const sentimentScore =
      (sentimentBreakdown.positive * 1 + sentimentBreakdown.negative * -1 + sentimentBreakdown.neutral * 0) /
      mentions.length;

    return {
      totalMentions: mentions.length,
      bySource,
      sentimentBreakdown,
      avgSentimentScore: Math.round(sentimentScore * 100) / 100,
    };
  }

  static async getMentions(businessId: string, limit = 50, skip = 0) {
    const mentions = await BrandMention.find({ businessProfileId: businessId })
      .sort({ postedDate: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await BrandMention.countDocuments({ businessProfileId: businessId });

    return {
      businessId,
      mentions,
      pagination: {
        total,
        limit,
        skip,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getMentionStats(businessId: string) {
    const mentions = await BrandMention.find({ businessProfileId: businessId }).lean();
    return this.calculateStats(mentions.map(m => ({
      text: m.mentionText,
      sourceType: m.sourceType as any,
      sourceUrl: m.sourceUrl || '',
      mentionType: m.mentionType || '',
      sentiment: m.sentiment,
      postedDate: m.postedDate || new Date(),
    })));
  }
}
