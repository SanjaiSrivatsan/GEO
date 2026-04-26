import axios from 'axios';
import config from '../config/index.js';
import logger from '../config/logger.js';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class GroqService {
  private static readonly RETRY_DELAY = 1000; // 1 second
  private static readonly MAX_RETRIES = 3;

  static async callLLM(
    prompt: string,
    systemMessage?: string,
    temperature = 0.2,
    maxTokens = 500
  ): Promise<string> {
    if (!config.groqApiKey) {
      throw new Error('GROQ_API_KEY not configured');
    }

    const messages: GroqMessage[] = [];

    if (systemMessage) {
      messages.push({
        role: 'system',
        content: systemMessage,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    return this.retryOnRateLimit(async () => {
      logger.info('Calling Groq LLM...');

      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: config.groqModel,
          messages,
          temperature,
          max_tokens: maxTokens,
        },
        {
          headers: {
            Authorization: `Bearer ${config.groqApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response from Groq API');
      }

      logger.info('Groq LLM response received successfully');
      return content;
    });
  }

  private static async retryOnRateLimit<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const isRateLimited = error instanceof Error && error.message.includes('rate');

      if (isRateLimited && attempt < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY * Math.pow(2, attempt); // Exponential backoff
        logger.warn(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${this.MAX_RETRIES})`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryOnRateLimit(fn, attempt + 1);
      }

      throw error;
    }
  }
}
