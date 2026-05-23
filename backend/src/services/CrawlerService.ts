import { WebsiteContent, BusinessProfile } from '../models/index';
import { ValidationError, NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

export class CrawlerService {
  /**
   * Start website crawl for a business profile
   * In production, this would use Playwright/Puppeteer for actual crawling
   */
  static async startCrawl(profileId: string, websiteUrl: string): Promise<{ status: string; jobId: string }> {
    if (!profileId || !websiteUrl) {
      throw new ValidationError('profileId and websiteUrl are required');
    }

    // Validate URL format
    try {
      new URL(websiteUrl);
    } catch {
      throw new ValidationError('Invalid website URL format');
    }

    // Update business profile crawl status
    const profile = await BusinessProfile.findByIdAndUpdate(
      new Types.ObjectId(profileId),
      {
        crawlStatus: 'IN_PROGRESS',
        crawlStartedAt: new Date(),
        crawlError: null,
      },
      { new: true }
    );

    if (!profile) {
      throw new NotFoundError('Business profile not found');
    }

    // Generate job ID
    const jobId = `job-${this.generateRandomString(16)}`;

    // Simulate crawl processing (in production, this would queue a job with Bull/Redis)
    // For now, we'll schedule a mock crawl to complete in a few seconds
    this.simulateCrawl(profileId, websiteUrl, jobId);

    return {
      status: 'PENDING',
      jobId,
    };
  }

  /**
   * Get crawl status for a profile
   */
  static async getCrawlStatus(
    profileId: string
  ): Promise<{
    status: string;
    totalPages: number;
    currentPage: number;
    progress: number;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
  }> {
    const profile = await BusinessProfile.findById(new Types.ObjectId(profileId));

    if (!profile) {
      throw new NotFoundError('Business profile not found');
    }

    const pageCount = await WebsiteContent.countDocuments({
      businessProfileId: new Types.ObjectId(profileId),
    });

    const progress = profile.crawlStatus === 'IN_PROGRESS' ? 75 : profile.crawlStatus === 'COMPLETED' ? 100 : 0;

    return {
      status: profile.crawlStatus || 'NOT_STARTED',
      totalPages: pageCount,
      currentPage: Math.ceil(pageCount * 0.75), // Mock current progress
      progress,
      error: profile.crawlError || undefined,
      startedAt: profile.crawlStartedAt,
      completedAt: profile.crawlCompletedAt,
    };
  }

  /**
   * Get crawled content for a profile
   */
  static async getCrawledContent(profileId: string): Promise<any[]> {
    const pages = await WebsiteContent.find({
      businessProfileId: new Types.ObjectId(profileId),
    }).limit(100);

    return pages.map((page: any) => ({
      _id: page._id,
      url: page.url,
      title: page.title,
      description: page.metaDescription,
      content: page.cleanedText?.substring(0, 500), // Return first 500 chars
      headings: [page.h1Tags, page.h2Tags].filter(Boolean), // Use actual h1/h2 tags
      metadata: { wordCount: page.wordCount }, // Use actual metadata
      crawledAt: page.crawledAt,
    }));
  }

  /**
   * Extract metadata from HTML content
   */
  static async extractMetadata(
    html: string
  ): Promise<{
    title?: string;
    description?: string;
    keywords?: string;
    ogImage?: string;
  }> {
    // Mock metadata extraction
    // In production, use cheerio or similar HTML parser
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const keywordsMatch = html.match(/<meta\s+name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

    return {
      title: titleMatch ? titleMatch[1] : undefined,
      description: descMatch ? descMatch[1] : undefined,
      keywords: keywordsMatch ? keywordsMatch[1] : undefined,
      ogImage: ogImageMatch ? ogImageMatch[1] : undefined,
    };
  }

  /**
   * Simulate crawl completion (mock implementation)
   * In production, this would be handled by a separate job queue worker
   */
  private static simulateCrawl(profileId: string, websiteUrl: string, jobId: string): void {
    // Simulate crawl delay and then store mock pages
    setTimeout(async () => {
      try {
        // Create mock crawled pages
        const mockPages = [
          {
            url: websiteUrl,
            title: 'Home Page',
            metaDescription: 'Welcome to our business website',
            cleanedText: 'This is the main landing page with information about our services and products.',
            h1Tags: 'Welcome to Our Business',
            pageType: 'homepage',
          },
          {
            url: `${websiteUrl}/about`,
            title: 'About Us',
            metaDescription: 'Learn more about our company',
            cleanedText: 'We are a leading company in our industry with over 10 years of experience.',
            h1Tags: 'About Our Company',
            pageType: 'about',
          },
          {
            url: `${websiteUrl}/services`,
            title: 'Our Services',
            metaDescription: 'Explore our comprehensive service offerings',
            cleanedText: 'We offer a wide range of services tailored to meet your business needs.',
            h1Tags: 'Service Offerings',
            pageType: 'services',
          },
          {
            url: `${websiteUrl}/contact`,
            title: 'Contact Us',
            metaDescription: 'Get in touch with our team',
            cleanedText: 'Have questions? Contact our team for more information and support.',
            h1Tags: 'Contact Information',
            pageType: 'contact',
          },
        ];

        // Store crawled pages
        for (const mockPage of mockPages) {
          await WebsiteContent.create({
            businessProfileId: new Types.ObjectId(profileId),
            ...mockPage,
            crawledAt: new Date(),
          });
        }

        // Update profile crawl status
        await BusinessProfile.findByIdAndUpdate(new Types.ObjectId(profileId), {
          crawlStatus: 'COMPLETED',
          crawlCompletedAt: new Date(),
          totalPagesCrawled: mockPages.length,
          crawlError: null,
        });
      } catch (error) {
        // Update profile with error
        await BusinessProfile.findByIdAndUpdate(new Types.ObjectId(profileId), {
          crawlStatus: 'FAILED',
          crawlError: error instanceof Error ? error.message : 'Crawl failed',
        }).catch(() => {
          // Ignore update errors
        });
      }
    }, 3000); // Simulate 3-second crawl delay
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

export default CrawlerService;
