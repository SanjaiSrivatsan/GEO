import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';

import config from './config/index.js';
import logger from './config/logger.js';

import { errorHandler, requestLogging } from './middleware/index.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import businessRoutes from './routes/business.routes.js';
import { crawlRouter, geoScoreRouter, geoPromptRouter, bisRouter, gapRouter } from './routes/index.routes.js';

const app: Application = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(requestLogging);

// Rate limiting
if (config.rateLimitEnabled) {
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: config.rateLimitPerMinute,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
}

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    app: config.appName,
    version: config.appVersion,
    environment: config.nodeEnv,
    docs: config.debug ? '/docs' : 'disabled',
    health: '/api/health',
  });
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/crawl', crawlRouter);
app.use('/api/geo/score', geoScoreRouter);
app.use('/api/geo', geoPromptRouter);
app.use('/api/bis', bisRouter);
app.use('/api/gap-detection', gapRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Route not found',
    statusCode: 404,
  });
});

// Error handler (must be last)
app.use(errorHandler);

logger.info('Express app initialized successfully');

export default app;
