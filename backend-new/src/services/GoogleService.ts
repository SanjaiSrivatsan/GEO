import logger from '../config/logger.js';
import { GoogleConnection, GoogleLocation, GoogleReview } from '../models/index.js';

export class GoogleService {
  static async saveGoogleConnection(userId: string, tokens: {
    refreshToken: string;
    accessToken: string;
    scope: string;
  }) {
    logger.info(`Saving Google connection for user ${userId}`);

    try {
      let connection = await GoogleConnection.findOne({ userId });

      if (connection) {
        connection.refreshToken = tokens.refreshToken;
        connection.accessToken = tokens.accessToken;
        connection.scope = tokens.scope;
        connection.expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
        await connection.save();
      } else {
        connection = new GoogleConnection({
          userId,
          refreshToken: tokens.refreshToken,
          accessToken: tokens.accessToken,
          scope: tokens.scope,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        });
        await connection.save();
      }

      logger.info(`Google connection saved for user ${userId}`);

      return connection.toObject();
    } catch (error) {
      logger.error('Error saving Google connection:', error);
      throw error;
    }
  }

  static async getConnection(userId: string) {
    const connection = await GoogleConnection.findOne({ userId }).lean();

    if (!connection) {
      throw new Error('Google connection not found');
    }

    return connection;
  }

  static async saveLocations(businessId: string, locations: any[]) {
    logger.info(`Saving ${locations.length} Google locations for business ${businessId}`);

    try {
      const savedLocations = [];

      for (const location of locations) {
        const googleLocation = new GoogleLocation({
          businessProfileId: businessId,
          placeId: location.placeId,
          name: location.name,
          address: location.address,
          phoneNumber: location.phoneNumber,
          website: location.website,
          rating: location.rating,
          reviewCount: location.reviewCount,
        });

        await googleLocation.save();
        savedLocations.push(googleLocation);
      }

      logger.info(`Saved ${savedLocations.length} locations for business ${businessId}`);

      return savedLocations;
    } catch (error) {
      logger.error('Error saving Google locations:', error);
      throw error;
    }
  }

  static async getLocations(businessId: string) {
    const locations = await GoogleLocation.find({ businessProfileId: businessId }).lean();

    return {
      businessId,
      locationCount: locations.length,
      locations,
    };
  }

  static async saveReviews(businessId: string, reviews: any[]) {
    logger.info(`Saving ${reviews.length} Google reviews for business ${businessId}`);

    try {
      const savedReviews = [];

      for (const review of reviews) {
        const googleReview = new GoogleReview({
          businessProfileId: businessId,
          reviewId: review.reviewId,
          author: review.author,
          content: review.content,
          rating: review.rating,
          postedDate: review.postedDate,
        });

        await googleReview.save();
        savedReviews.push(googleReview);
      }

      logger.info(`Saved ${savedReviews.length} reviews for business ${businessId}`);

      return savedReviews;
    } catch (error) {
      logger.error('Error saving Google reviews:', error);
      throw error;
    }
  }

  static async getReviews(businessId: string, limit = 50) {
    const reviews = await GoogleReview.find({ businessProfileId: businessId })
      .sort({ postedDate: -1 })
      .limit(limit)
      .lean();

    const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) : 0;

    return {
      businessId,
      reviewCount: reviews.length,
      avgRating: Math.round(avgRating * 10) / 10,
      reviews,
    };
  }
}
