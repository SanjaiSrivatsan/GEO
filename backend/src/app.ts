import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import 'express-async-errors';

import { config } from './config/environment';
import logger from './config/logger';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import businessRouter from './routes/business';
import geoScoreRouter from './routes/geoScore';
import crawlRouter from './routes/crawl';
import googleRouter from './routes/google';
import mentionsRouter from './routes/mentions';
import geoPromptsRouter from './routes/geoPrompts';
import canonicalEntityRouter from './routes/canonicalEntity';
import gapDetectionRouter from './routes/gapDetection';
import reinforcementRouter from './routes/reinforcement';
import simulationRouter from './routes/simulation';
import reasoningRouter from './routes/reasoning';
import bisRouter from './routes/bis';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
const corsOrigins = config.CORS_ORIGINS.split(',').map(origin => origin.trim());
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    app: 'GEO Engine API',
    version: '1.0.0',
    environment: config.NODE_ENV,
    docs: '/docs',
    health: '/api/health',
  });
});

// Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/business', businessRouter);
app.use('/api/geo/score', geoScoreRouter);
app.use('/api/crawl', crawlRouter);
app.use('/api/google', googleRouter);
app.use('/api/mentions', mentionsRouter);
app.use('/api/geo/prompts', geoPromptsRouter);
app.use('/api/intelligence/canonical', canonicalEntityRouter);
app.use('/api/intelligence/gaps', gapDetectionRouter);
app.use('/api/intelligence/reinforce', reinforcementRouter);
app.use('/api/intelligence/simulate', simulationRouter);
app.use('/api/intelligence/reasoning', reasoningRouter);
app.use('/api/bis', bisRouter);

// Health check endpoint (legacy compatibility)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    app: 'GEO Engine API',
    version: '1.0.0',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    code: 'NOT_FOUND',
    statusCode: 404,
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize and start server
export async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('✅ Database connected');

    // Start server
    const server = app.listen(config.PORT, '0.0.0.0', () => {
      logger.info(`✅ Server running on http://0.0.0.0:${config.PORT}`);
      logger.info(`📚 Health check: http://localhost:${config.PORT}/api/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    logger.error(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

export default app;
