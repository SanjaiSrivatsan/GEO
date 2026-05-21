import { Router, Response } from 'express';
import AuthService from '../services/AuthService.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { ValidationError } from '../utils/errors.js';
import { AuthResponse, UserResponse, TokenResponse } from '../types/index.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: any, res: Response<AuthResponse>) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await AuthService.createUser(email, password);
    const token = AuthService.createAccessToken(user._id.toString());

    const userResponse: UserResponse = {
      _id: user._id.toString(),
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const tokenResponse: TokenResponse = {
      accessToken: token,
      tokenType: 'bearer',
      expiresIn: 86400, // 24 hours in seconds
    };

    res.status(201).json({
      user: userResponse,
      token: tokenResponse,
    });
  } catch (error) {
    throw error;
  }
});

// POST /api/auth/login
router.post('/login', async (req: any, res: Response<AuthResponse>) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await AuthService.authenticateUser(email, password);
    const token = AuthService.createAccessToken(user._id.toString());

    const userResponse: UserResponse = {
      _id: user._id.toString(),
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const tokenResponse: TokenResponse = {
      accessToken: token,
      tokenType: 'bearer',
      expiresIn: 86400,
    };

    res.status(200).json({
      user: userResponse,
      token: tokenResponse,
    });
  } catch (error) {
    throw error;
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response<UserResponse>) => {
  try {
    const user = await AuthService.getUserById(req.userId!);

    if (!user) {
      throw new ValidationError('User not found');
    }

    const userResponse: UserResponse = {
      _id: user._id.toString(),
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json(userResponse);
  } catch (error) {
    throw error;
  }
});

export default router;
