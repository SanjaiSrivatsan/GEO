import dotenv from 'dotenv';

dotenv.config();

interface Config {
  // Application
  nodeEnv: 'development' | 'production' | 'test';
  appName: string;
  appVersion: string;
  debug: boolean;

  // Server
  host: string;
  port: number;

  // Database
  mongodbUrl: string;

  // JWT
  jwtSecret: string;
  jwtAlgorithm: string;
  accessTokenExpireMinutes: number;

  // CORS
  corsOrigins: string[];

  // Google OAuth
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;

  // Google APIs
  googleApiKey: string;
  googleCseApiKey: string;
  googleCseId: string;
  youtubeApiKey: string;
  newsApiKey: string;

  // Groq LLM
  groqApiKey: string;
  groqModel: string;

  // Reddit API
  redditClientId: string;
  redditClientSecret: string;
  redditUserAgent: string;

  // Redis
  redisUrl: string;

  // Rate Limiting
  rateLimitEnabled: boolean;
  rateLimitPerMinute: number;

  // Logging
  logLevel: string;
  logFile: string;

  // Web Scraping
  userAgent: string;
  headlessBrowser: boolean;
}

function validateConfig(): Config {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const mongodbUrl = process.env.MONGODB_URL;
  const jwtSecret = process.env.JWT_SECRET;

  if (!mongodbUrl) {
    throw new Error('MONGODB_URL environment variable is required');
  }

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return {
    nodeEnv,
    appName: process.env.APP_NAME || 'GEO Backend API',
    appVersion: process.env.APP_VERSION || '1.0.0',
    debug: process.env.DEBUG === 'true',

    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '8000', 10),

    mongodbUrl,

    jwtSecret,
    jwtAlgorithm: process.env.JWT_ALGORITHM || 'HS256',
    accessTokenExpireMinutes: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '1440', 10),

    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',').map((origin) => origin.trim()),

    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/google/oauth/callback',

    googleApiKey: process.env.GOOGLE_API_KEY || '',
    googleCseApiKey: process.env.GOOGLE_CSE_API_KEY || '',
    googleCseId: process.env.GOOGLE_CSE_ID || '',
    youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
    newsApiKey: process.env.NEWS_API_KEY || '',

    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',

    redditClientId: process.env.REDDIT_CLIENT_ID || '',
    redditClientSecret: process.env.REDDIT_CLIENT_SECRET || '',
    redditUserAgent: process.env.REDDIT_USER_AGENT || 'GEO/1.0',

    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379/0',

    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60', 10),

    logLevel: process.env.LOG_LEVEL || 'info',
    logFile: process.env.LOG_FILE || 'logs/app.log',

    userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    headlessBrowser: process.env.HEADLESS_BROWSER !== 'false',
  };
}

const config = validateConfig();

export default config;
