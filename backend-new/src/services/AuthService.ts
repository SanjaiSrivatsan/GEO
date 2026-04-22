import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import logger from '../config/logger.js';
import { User } from '../models/index.js';

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    // Generate salt with 10 rounds (optimal balance between security and performance)
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static createAccessToken(userId: string, expiresIn?: string): string {
    const payload = { userId };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      algorithm: config.jwtAlgorithm,
      expiresIn: expiresIn || `${config.accessTokenExpireMinutes}m`,
    };

    return jwt.sign(payload, config.jwtSecret, options);
  }

  static verifyAccessToken(token: string): { userId: string } | null {
    try {
      const payload = jwt.verify(token, config.jwtSecret, {
        algorithms: [config.jwtAlgorithm as jwt.Algorithm],
      }) as { userId: string };
      return payload;
    } catch (error) {
      logger.debug('Token verification failed:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  static async createUser(email: string, password: string) {
    logger.info(`Creating new user with email: ${email}`);

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await this.hashPassword(password);

    const user = new User({
      email: email.toLowerCase(),
      hashedPassword,
      isActive: true,
    });

    await user.save();
    logger.info(`User created successfully: ${user.id}`);

    // Return without password
    const userObj = user.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashedPassword: _password, ...userWithoutPassword } = userObj;
    return userWithoutPassword;
  }

  static async getUserByEmail(email: string) {
    return User.findOne({ email: email.toLowerCase() }).lean();
  }

  static async getUserById(userId: string) {
    return User.findById(userId).lean();
  }

  static async authenticateUser(email: string, password: string) {
    logger.info(`Authenticating user: ${email}`);

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      logger.warn(`User not found: ${email}`);
      return null;
    }

    const isPasswordValid = await this.verifyPassword(password, user.hashedPassword);

    if (!isPasswordValid) {
      logger.warn(`Invalid password for user: ${email}`);
      return null;
    }

    if (!user.isActive) {
      logger.warn(`User is inactive: ${email}`);
      return null;
    }

    logger.info(`User authenticated successfully: ${user.id}`);

    // Return without password
    const userObj = user.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashedPassword: _password, ...userWithoutPassword } = userObj;
    return userWithoutPassword;
  }
}
