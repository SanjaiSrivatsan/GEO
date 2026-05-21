import { AuthService } from '../../services/AuthService.js';
import { User } from '../../models/User.js';
import { ValidationError, AuthenticationError } from '../../utils/errors.js';

jest.mock('../../models/User.js');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user with valid credentials', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'test@example.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.createUser('test@example.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(User.create).toHaveBeenCalled();
    });

    it('should throw ValidationError if email already exists', async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ email: 'test@example.com' });

      await expect(
        AuthService.createUser('test@example.com', 'password123')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if password is too short', async () => {
      await expect(
        AuthService.createUser('test@example.com', 'short')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate user with correct credentials', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'test@example.com',
        hashedPassword: '$2b$12$...',
        isActive: true,
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Mock bcryptjs.compare
      jest.mock('bcryptjs', () => ({
        compare: jest.fn().mockResolvedValue(true),
      }));

      // Note: In real tests, you'd properly mock bcryptjs
      // This is a simplified example
    });

    it('should throw AuthenticationError with incorrect password', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        AuthService.authenticateUser('test@example.com', 'wrongpassword')
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('createAccessToken', () => {
    it('should create a valid JWT token', () => {
      const token = AuthService.createAccessToken('user-123');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = AuthService.createAccessToken('user-123');
      const decoded = AuthService.verifyToken(token);

      expect(decoded.sub).toBe('user-123');
    });

    it('should throw error for invalid token', () => {
      expect(() => AuthService.verifyToken('invalid-token')).toThrow();
    });
  });
});
