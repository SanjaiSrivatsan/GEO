import logger from '../config/logger.js';
import { GeoPrompt, GeoPromptResult } from '../models/index.js';
import { GroqService } from './GroqService.js';

export class GeoPromptService {
  static async getPromptLibrary(category?: string) {
    let query: any = { isActive: true };

    if (category) {
      query.category = category;
    }

    const prompts = await GeoPrompt.find(query).sort({ category: 1 }).lean();

    return {
      promptCount: prompts.length,
      prompts,
    };
  }

  static async executeAllPrompts(businessId: string) {
    logger.info(`Executing all prompts for business ${businessId}`);

    try {
      const prompts = await GeoPrompt.find({ isActive: true }).lean();

      const results = [];

      for (const prompt of prompts) {
        try {
          const result = await this.executePrompt(businessId, String(prompt._id));
          results.push(result);
        } catch (error) {
          logger.warn(`Failed to execute prompt ${prompt._id}:`, error instanceof Error ? error.message : String(error));
        }
      }

      logger.info(`Executed ${results.length} prompts for business ${businessId}`);

      return {
        businessId,
        executedCount: results.length,
        results,
      };
    } catch (error) {
      logger.error('Prompt execution error:', error);
      throw error;
    }
  }

  static async executePrompt(businessId: string, promptId: string) {
    try {
      const prompt = await GeoPrompt.findById(promptId).lean();

      if (!prompt) {
        throw new Error('Prompt not found');
      }

      // Call Groq LLM
      let output = '';
      try {
        output = await GroqService.callLLM(
          prompt.promptText,
          prompt.systemMessage,
          prompt.temperature,
          prompt.maxTokens
        );
      } catch (error) {
        logger.warn('Groq call failed, using placeholder:', error instanceof Error ? error.message : String(error));
        output = JSON.stringify({
          result: 'placeholder',
          confidence: 0.5,
          note: 'Groq API not configured or failed',
        });
      }

      // Parse and validate output
      let parsedOutput: Record<string, unknown> = {};
      try {
        parsedOutput = JSON.parse(output);
      } catch {
        parsedOutput = { raw_output: output };
      }

      // Save result
      const result = new GeoPromptResult({
        businessProfileId: businessId,
        geoPromptId: promptId,
        executionStatus: 'completed',
        result: parsedOutput,
      });

      await result.save();

      return {
        resultId: result._id,
        promptId,
        status: 'completed',
        result: parsedOutput,
      };
    } catch (error) {
      logger.error('Prompt execution failed:', error);

      const result = new GeoPromptResult({
        businessProfileId: businessId,
        geoPromptId: promptId,
        executionStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      await result.save();

      throw error;
    }
  }

  static async getResults(businessId: string) {
    const results = await GeoPromptResult.find({ businessProfileId: businessId })
      .sort({ executedAt: -1 })
      .lean();

    return {
      businessId,
      resultCount: results.length,
      results,
    };
  }
}
