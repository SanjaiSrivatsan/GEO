import { Schema, model, Document, Types } from 'mongoose';

export interface IGoogleReview extends Document {
  _id: Types.ObjectId;
  googleLocationId: Types.ObjectId;
  googleReviewId: string;
  reviewerName?: string;
  reviewerPhotoUrl?: string;
  rating: number;
  reviewText?: string;
  reviewDate: Date;
  sentimentScore?: number;
  sentimentLabel?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  extractedKeywords?: string;
  suggestedReply?: string;
  suggestedReplyPreset?: string;
  ownerReply?: string;
  ownerReplyDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const googleReviewSchema = new Schema<IGoogleReview>(
  {
    googleLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'GoogleLocation',
      required: true,
      index: true,
    },
    googleReviewId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reviewerName: String,
    reviewerPhotoUrl: String,
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reviewText: String,
    reviewDate: {
      type: Date,
      required: true,
    },
    sentimentScore: Number,
    sentimentLabel: {
      type: String,
      enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'],
    },
    extractedKeywords: String,
    suggestedReply: String,
    suggestedReplyPreset: String,
    ownerReply: String,
    ownerReplyDate: Date,
  },
  {
    timestamps: true,
  }
);

export const GoogleReview = model<IGoogleReview>(
  'GoogleReview',
  googleReviewSchema
);
