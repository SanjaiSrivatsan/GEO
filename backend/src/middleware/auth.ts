import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { AuthenticationError } from '../utils/errors';

export interface AuthRequest extends Request {
  userId?: string;
  token?: string;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, config.JWT_SECRET) as { sub: string };

    req.userId = decoded.sub;
    req.token = token;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof AuthenticationError) {
      next(error);
    } else {
      next(new AuthenticationError('Token verification failed'));
    }
  }
}

export function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, config.JWT_SECRET) as { sub: string };
      req.userId = decoded.sub;
      req.token = token;
    }

    next();
  } catch {
    next();
  }
}
