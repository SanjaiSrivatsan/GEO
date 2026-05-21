import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  PORT: parseInt(process.env.PORT || '8000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/geo_db',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRE_IN: process.env.JWT_EXPIRE_IN || '1440m',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379/0',

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/google/oauth/callback',

  // Google APIs
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
  GOOGLE_CSE_API_KEY: process.env.GOOGLE_CSE_API_KEY || '',
  GOOGLE_CSE_ID: process.env.GOOGLE_CSE_ID || '',

  // External APIs
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  NEWS_API_KEY: process.env.NEWS_API_KEY || '',
  REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID || '',
  REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET || '',

  // Groq LLM
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',

  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

export default config;
