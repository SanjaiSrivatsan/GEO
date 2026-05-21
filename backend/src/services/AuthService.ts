import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { config } from '../config/environment.js';
import { AuthenticationError, ValidationError } from '../utils/errors.js';

export class AuthService {
  static async createUser(email: string, password: string) {
    // Validate email and password
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 12);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      hashedPassword,
    });

    return user;
  }

  static async authenticateUser(email: string, password: string) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new AuthenticationError('Incorrect email or password');
    }

    const isPasswordValid = await bcryptjs.compare(password, user.hashedPassword);

    if (!isPasswordValid) {
      throw new AuthenticationError('Incorrect email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('User account is inactive');
    }

    return user;
  }

  static async getUserById(userId: string) {
    const user = await User.findById(userId).select('-hashedPassword');
    return user;
  }

  static async getUserByEmail(email: string) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('-hashedPassword');
    return user;
  }

  static createAccessToken(userId: string): string {
    const token = jwt.sign({ sub: userId }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRE_IN,
    });
    return token;
  }

  static verifyToken(token: string): { sub: string } {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { sub: string };
    return decoded;
  }

  static async changePassword(userId: string, oldPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const isOldPasswordValid = await bcryptjs.compare(oldPassword, user.hashedPassword);
    if (!isOldPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 12);
    user.hashedPassword = hashedPassword;
    await user.save();

    return user;
  }
}

export default AuthService;
