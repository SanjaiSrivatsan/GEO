import { GoogleConnection, GoogleLocation, GoogleReview } from '../models/index';
import { ValidationError, NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

export class GoogleService {
  // Mock OAuth state storage (in production, use Redis or session store)
  private static oauthStates = new Map<string, { userId: string; expiresAt: number }>();

  /**
   * Generate Google OAuth authorization URL
   * In production, this would use google-auth-library
   */
  static async getAuthorizationUrl(userId: string): Promise<{ authorizationUrl: string; state: string }> {
    // Generate state token for CSRF protection
    const state = this.generateRandomString(32);

    // Store state with expiry (10 minutes)
    this.oauthStates.set(state, {
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Mock Google OAuth URL (production would use actual OAuth endpoint)
    const authorizationUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8002/api/google/oauth/callback')}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/business.manage')}&` +
      `state=${state}&` +
      `access_type=offline`;

    return { authorizationUrl, state };
  }

  /**
   * Handle OAuth callback and exchange auth code for tokens
   */
  static async handleOAuthCallback(code: string, state: string): Promise<any> {
    // Verify state token
    const stateData = this.oauthStates.get(state);
    if (!stateData || stateData.expiresAt < Date.now()) {
      throw new ValidationError('Invalid or expired state token');
    }

    const userId = stateData.userId;
    this.oauthStates.delete(state);

    // Mock token exchange (production would call Google OAuth endpoint)
    const accessToken = this.generateMockToken();
    const refreshToken = this.generateMockToken();

    // Store connection
    const connection = await GoogleConnection.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        userId: new Types.ObjectId(userId),
        googleAccountEmail: `user-${userId}@gmail.com`,
        accessToken,
        refreshToken,
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        isActive: true,
        connectedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return connection as any;
  }

  /**
   * Get connection status for a user
   */
  static async getConnectionStatus(userId: string): Promise<boolean> {
    const connection = await GoogleConnection.findOne({
      userId: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!connection) return false;

    // Check if token is expired
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      await GoogleConnection.updateOne(
        { _id: connection._id },
        { isActive: false }
      );
      return false;
    }

    return true;
  }

  /**
   * Get user's Google Business Profile locations
   */
  static async getLocations(userId: string): Promise<any[]> {
    const connection = await GoogleConnection.findOne({
      userId: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!connection) {
      throw new ValidationError('Google account not connected');
    }

    // Check for existing locations
    const existingLocations = await GoogleLocation.find({
      connectionId: connection._id,
    });

    if (existingLocations.length > 0) {
      return existingLocations.map((loc: any) => ({
        _id: loc._id,
        locationId: loc.locationId,
        name: loc.name,
        address: loc.address,
        category: loc.category,
        phoneNumber: loc.phoneNumber,
        website: loc.website,
        verificationStatus: loc.verificationStatus,
      }));
    }

    // Mock locations for demo (production would fetch from Google API)
    const mockLocations = [
      {
        locationId: `loc-${this.generateRandomString(8)}`,
        name: 'Main Office',
        address: '123 Business St, New York, NY 10001',
        category: 'Technology Company',
        phoneNumber: '+1-212-555-0100',
        website: 'https://business.example.com',
        verificationStatus: 'VERIFIED',
      },
      {
        locationId: `loc-${this.generateRandomString(8)}`,
        name: 'Tech Hub',
        address: '456 Innovation Ave, San Francisco, CA 94107',
        category: 'Technology Company',
        phoneNumber: '+1-415-555-0200',
        website: 'https://tech-hub.example.com',
        verificationStatus: 'VERIFIED',
      },
    ];

    // Store mock locations
    for (const mockLoc of mockLocations) {
      await GoogleLocation.create({
        connectionId: connection._id,
        ...mockLoc,
      });
    }

    return mockLocations;
  }

  /**
   * Select and link a Google location to business profile
   */
  static async selectLocation(
    userId: string,
    locationId: string,
    profileId: string
  ): Promise<any> {
    const connection = await GoogleConnection.findOne({
      userId: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!connection) {
      throw new ValidationError('Google account not connected');
    }

    const location = await GoogleLocation.findOneAndUpdate(
      { connectionId: connection._id, locationId },
      { businessProfileId: new Types.ObjectId(profileId) },
      { new: true }
    );

    if (!location) {
      throw new NotFoundError('Location not found');
    }

    return location;
  }

  /**
   * Sync Google reviews for a location
   */
  static async syncReviews(locationId: string): Promise<any[]> {
    const location = await GoogleLocation.findOne({ locationId });

    if (!location) {
      throw new NotFoundError('Location not found');
    }

    // Mock reviews (production would fetch from Google API)
    const mockReviews = [
      {
        reviewId: `rev-${this.generateRandomString(8)}`,
        authorName: 'John Smith',
        rating: 5,
        text: 'Excellent service and great quality. Highly recommended!',
        publishedAtTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        reviewerLanguage: 'en',
      },
      {
        reviewId: `rev-${this.generateRandomString(8)}`,
        authorName: 'Jane Doe',
        rating: 4,
        text: 'Good experience overall. Would suggest some improvements.',
        publishedAtTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        reviewerLanguage: 'en',
      },
      {
        reviewId: `rev-${this.generateRandomString(8)}`,
        authorName: 'Business User',
        rating: 5,
        text: 'Professional and reliable. We use them for all our needs.',
        publishedAtTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        reviewerLanguage: 'en',
      },
    ];

    // Store reviews
    for (const mockReview of mockReviews) {
      await GoogleReview.findOneAndUpdate(
        { locationId, reviewId: mockReview.reviewId },
        {
          locationId,
          ...mockReview,
        },
        { upsert: true }
      );
    }

    return mockReviews;
  }

  /**
   * Disconnect Google OAuth connection
   */
  static async disconnect(userId: string): Promise<void> {
    await GoogleConnection.updateOne(
      { userId: new Types.ObjectId(userId) },
      { isActive: false, disconnectedAt: new Date() }
    );
  }

  /**
   * Helper: Generate random string for tokens and state
   */
  private static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Helper: Generate mock JWT-like token
   */
  private static generateMockToken(): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        iss: 'https://accounts.google.com',
        aud: process.env.GOOGLE_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      })
    ).toString('base64');
    const signature = Buffer.from(this.generateRandomString(32)).toString('base64');
    return `${header}.${payload}.${signature}`;
  }
}

export default GoogleService;
