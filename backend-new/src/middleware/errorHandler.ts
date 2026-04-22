import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger.js';
import config from '../config/index.js';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ErrorResponse {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error | ApiError, _req: Request, res: Response, _next: NextFunction): void {
  logger.error('Error handled:', err);

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      details: config.debug ? err.details : undefined,
    } as ErrorResponse);
    return;
  }

  // Handle other known error types
  if (err instanceof SyntaxError) {
    res.status(400).json({
      code: 'INVALID_REQUEST',
      message: 'Invalid JSON in request body',
      statusCode: 400,
    } as ErrorResponse);
    return;
  }

  // Fallback to generic error
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
    details: config.debug ? err.message : undefined,
  } as ErrorResponse);
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
