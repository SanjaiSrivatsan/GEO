import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AuthService } from '../services/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

export class AuthController {
  static async register(req: AuthRequest, res: Response): Promise<void> {
    const { email, password } = req.body;

    try {
      logger.info(`User registration attempt: ${email}`);

      const user = await AuthService.createUser(email, password);
      const accessToken = AuthService.createAccessToken(user._id);

      res.status(201).json({
        user: {
          id: user._id,
          email: user.email,
          is_active: user.isActive,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
        },
        token: {
          access_token: accessToken,
          token_type: 'bearer',
          expires_in: 86400, // 1 day in seconds
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);

      if (error instanceof Error && error.message.includes('already registered')) {
        throw new ApiError(400, 'EMAIL_ALREADY_EXISTS', 'Email already registered');
      }

      throw error;
    }
  }

  static async login(req: AuthRequest, res: Response): Promise<void> {
    const { email, password } = req.body;

    try {
      logger.info(`User login attempt: ${email}`);

      const user = await AuthService.authenticateUser(email, password);

      if (!user) {
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      const accessToken = AuthService.createAccessToken(user._id);

      res.json({
        user: {
          id: user._id,
          email: user.email,
          is_active: user.isActive,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
        },
        token: {
          access_token: accessToken,
          token_type: 'bearer',
          expires_in: 86400,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  static async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const user = await AuthService.getUserById(req.user.userId);

      if (!user) {
        throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
      }

      res.json({
        id: user._id,
        email: user.email,
        is_active: user.isActive,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      });
    } catch (error) {
      logger.error('Get me error:', error);
      throw error;
    }
  }
}
