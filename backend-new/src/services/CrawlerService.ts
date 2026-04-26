import logger from '../config/logger.js';
import { WebsiteContent, BusinessProfile } from '../models/index.js';

export interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  timeout?: number;
}

export class CrawlerService {
  static async crawlWebsite(businessId: string, url: string, _options: CrawlOptions = {}) {
    // Note: maxDepth, maxPages, timeout will be used when implementing actual Puppeteer crawler
    // For now, keeping as parameters for future implementation

    logger.info(`Starting crawl for business ${businessId}: ${url}`);

    try {
      // Update business crawl status
      await BusinessProfile.updateOne(
        { _id: businessId },
        {
          $set: {
            crawlStatus: 'in_progress',
            crawlStartedAt: new Date(),
          },
        }
      );

      // For now, create a single WebsiteContent entry
      // In production, this would use Puppeteer to actually crawl
      const content = new WebsiteContent({
        businessProfileId: businessId,
        url,
        textContent: 'Crawled content placeholder - implement actual crawler with Puppeteer',
        title: 'Crawled Page',
        status: 'active',
      });

      await content.save();

      // Update business with completion
      await BusinessProfile.updateOne(
        { _id: businessId },
        {
          $set: {
            crawlStatus: 'completed',
            crawlCompletedAt: new Date(),
            totalPagesCrawled: '1',
          },
        }
      );

      logger.info(`Crawl completed for business ${businessId}`);

      return {
        businessId,
        url,
        pagesCrawled: 1,
        status: 'completed',
      };
    } catch (error) {
      logger.error('Crawl error:', error);

      await BusinessProfile.updateOne(
        { _id: businessId },
        {
          $set: {
            crawlStatus: 'failed',
            crawlError: error instanceof Error ? error.message : 'Unknown error',
          },
        }
      );

      throw error;
    }
  }

  static async getCrawlStatus(businessId: string) {
    const business = await BusinessProfile.findById(businessId).lean();

    if (!business) {
      throw new Error('Business profile not found');
    }

    return {
      businessId,
      status: business.crawlStatus,
      startedAt: business.crawlStartedAt,
      completedAt: business.crawlCompletedAt,
      error: business.crawlError,
      totalPagesCrawled: business.totalPagesCrawled,
    };
  }

  static async getCrawlContent(businessId: string) {
    const pages = await WebsiteContent.find({ businessProfileId: businessId }).lean();

    return {
      businessId,
      pageCount: pages.length,
      pages: pages.map(p => ({
        id: p._id,
        url: p.url,
        title: p.title,
        textLength: p.textContent?.length || 0,
        lastCrawled: p.lastCrawledAt,
      })),
    };
  }
}
