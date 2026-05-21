import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors.js';
import logger from '../config/logger.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof ApiError) {
    logger.error(`API Error: ${err.message}`, {
      statusCode: err.statusCode,
      code: err.code,
    });

    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      statusCode: err.statusCode,
    });
  }

  if (err instanceof Error) {
    logger.error(`Unexpected error: ${err.message}`, { stack: err.stack });

    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  logger.error('Unknown error', { error: err });

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  });
}
