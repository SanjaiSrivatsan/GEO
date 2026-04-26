import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger.js';

export function requestLogging(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    logger[logLevel as 'info' | 'warn' | 'error']({
      method: req.method,
      path: req.path,
      status,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });
  });

  next();
}
