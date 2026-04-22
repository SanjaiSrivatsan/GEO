import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import logger from '../config/logger.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Access token required',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: [config.jwtAlgorithm as jwt.Algorithm],
    }) as { userId: string };

    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    logger.warn('Invalid token:', error instanceof Error ? error.message : String(error));
    res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret, {
        algorithms: [config.jwtAlgorithm as jwt.Algorithm],
      }) as { userId: string };
      req.user = { userId: decoded.userId };
    } catch (error) {
      logger.debug('Invalid optional token:', error instanceof Error ? error.message : String(error));
    }
  }

  next();
}
