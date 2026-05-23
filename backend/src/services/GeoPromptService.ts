import { GeoPrompt, GeoPromptResult, GeoResponse } from '../models/index';
import { ValidationError, NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

export class GeoPromptService {
  private static readonly PROMPT_CATEGORIES = [
    'presence',
    'accuracy',
    'trust',
    'hallucination',
    'competitive',
    'sentiment',
    'authority',
    'consistency',
  ];

  /**
   * Get all GEO prompts from library
   */
  static async getPromptLibrary(): Promise<any[]> {
    let prompts = await GeoPrompt.find({ isActive: true });

    // If no prompts exist, seed with defaults
    if (prompts.length === 0) {
      prompts = await this.seedDefaultPrompts();
    }

    return prompts.map (p => ({
      _id: p._id,
      promptId: p.promptId,
      category: p.category,
      title: p.title,
      description: p.description,
      temperature: p.temperature,
      maxTokens: p.maxTokens,
      scoringWeight: p.scoringWeight,
    }));
  }

  /**
   * Execute a single prompt
   */
  static async executePrompt(
    promptId: string,
    context: {
      businessId: string;
      businessName: string;
      website?: string;
      category?: string;
      location?: string;
    }
  ): Promise<any> {
    const prompt = await GeoPrompt.findOne({ promptId });

    if (!prompt) {
      throw new NotFoundError(`Prompt ${promptId} not found`);
    }

    // Mock LLM response (in production, call OpenAI API)
    const mockResponse = this.generateMockResponse(prompt, context);

    // Store response
    const result = await GeoPromptResult.create({
      businessProfileId: new Types.ObjectId(context.businessId),
      promptId: prompt._id,
      geoPromptId: prompt._id,
      response: mockResponse,
      createdAt: new Date(),
    });

    return {
      _id: result._id,
      promptId: prompt.promptId,
      category: prompt.category,
      response: mockResponse,
      executedAt: (result as any).createdAt,
    };
  }

  /**
   * Execute all GEO prompts for a business
   */
  static async executeAllPrompts(
    businessId: string,
    context?: {
      businessName?: string;
      website?: string;
      category?: string;
      location?: string;
    }
  ): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    duration_ms: number;
    results: any[];
  }> {
    const startTime = Date.now();
    const prompts = await GeoPrompt.find({ isActive: true });

    if (prompts.length === 0) {
      await this.seedDefaultPrompts();
    }

    const results = [];
    let succeeded = 0;
    let failed = 0;

    for (const prompt of prompts) {
      try {
        const result = await this.executePrompt(prompt.promptId, {
          businessId,
          businessName: context?.businessName || 'Business',
          website: context?.website,
          category: context?.category,
          location: context?.location,
        });

        results.push(result);
        succeeded++;
      } catch (error) {
        failed++;
      }
    }

    const duration_ms = Date.now() - startTime;

    return {
      total: prompts.length,
      succeeded,
      failed,
      duration_ms,
      results,
    };
  }

  /**
   * Get prompt results for a business
   */
  static async getPromptResults(businessId: string): Promise<any[]> {
    const results = await GeoPromptResult.find({
      businessProfileId: new Types.ObjectId(businessId),
    })
      .populate('promptId')
      .sort({ createdAt: -1 });

    return results.map((r: any) => ({
      _id: r._id,
      promptId: r.promptId?.promptId,
      category: r.promptId?.category,
      response: r.response,
      executedAt: r.createdAt,
    }));
  }

  /**
   * Seed default GEO prompts
   */
  private static async seedDefaultPrompts(): Promise<any[]> {
    const defaultPrompts = [
      {
        promptId: 'presence-local-seo',
        category: 'presence',
        title: 'Local SEO Presence Check',
        description: 'Check visibility in local search results',
        promptText: 'Analyze the local SEO presence of {businessName}',
        temperature: 0.7,
        maxTokens: 500,
        scoringWeight: 0.35,
        isActive: true,
      },
      {
        promptId: 'accuracy-data-validation',
        category: 'accuracy',
        title: 'Data Accuracy Validation',
        description: 'Validate accuracy of business information',
        promptText: 'Check the accuracy of data for {businessName}',
        temperature: 0.3,
        maxTokens: 400,
        scoringWeight: 0.35,
        isActive: true,
      },
      {
        promptId: 'trust-reputation-analysis',
        category: 'trust',
        title: 'Trust & Reputation Analysis',
        description: 'Analyze trust signals and reputation',
        promptText: 'Evaluate the trust and reputation of {businessName}',
        temperature: 0.6,
        maxTokens: 450,
        scoringWeight: 0.20,
        isActive: true,
      },
      {
        promptId: 'hallucination-detection',
        category: 'hallucination',
        title: 'Hallucination Detection',
        description: 'Detect false or unverified claims',
        promptText: 'Identify potential hallucinations in information about {businessName}',
        temperature: 0.2,
        maxTokens: 300,
        scoringWeight: 0.10,
        isActive: true,
      },
      {
        promptId: 'competitive-analysis',
        category: 'competitive',
        title: 'Competitive Position Analysis',
        description: 'Analyze competitive positioning',
        promptText: 'Compare {businessName} with competitors in {category}',
        temperature: 0.7,
        maxTokens: 500,
        scoringWeight: 0.15,
        isActive: true,
      },
      {
        promptId: 'sentiment-analysis',
        category: 'sentiment',
        title: 'Sentiment Analysis',
        description: 'Analyze public sentiment about the business',
        promptText: 'Analyze public sentiment surrounding {businessName}',
        temperature: 0.8,
        maxTokens: 400,
        scoringWeight: 0.12,
        isActive: true,
      },
    ];

    const created = await GeoPrompt.insertMany(defaultPrompts);
    return created;
  }

  /**
   * Generate mock LLM response
   */
  private static generateMockResponse(
    prompt: any,
    context: any
  ): string {
    const mockResponses: Record<string, string> = {
      'presence-local-seo': `${context.businessName} shows strong local SEO presence with listings in major directories and NAP consistency across platforms.`,
      'accuracy-data-validation': `Data for ${context.businessName} is 94% accurate with minor inconsistencies in phone number formatting across platforms.`,
      'trust-reputation-analysis': `${context.businessName} has established trust through 4.8/5 average rating across review platforms with verified customer reviews.`,
      'hallucination-detection': `No significant hallucinations detected. All major claims about ${context.businessName} are supported by verifiable sources.`,
      'competitive-analysis': `${context.businessName} ranks in top 3 for ${context.category} in ${context.location} based on market share analysis.`,
      'sentiment-analysis': `Overall sentiment towards ${context.businessName} is positive (78%) based on social media and review analysis.`,
      'authority-assessment': `${context.businessName} demonstrates high authority with established industry presence and thought leadership content.`,
      'consistency-check': `Information consistency score: 92%. Minor variations found in business hours across platforms.`,
    };

    return mockResponses[prompt.promptId] ||
      `Analysis for ${context.businessName}: This business shows promising metrics across all evaluation categories.`;
  }
}

export default GeoPromptService;
