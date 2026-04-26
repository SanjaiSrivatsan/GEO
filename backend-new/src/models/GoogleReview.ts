import { Schema, model, Document, Types } from 'mongoose';

export interface IGoogleReview extends Document {
  businessProfileId: Types.ObjectId;
  reviewId: string;
  author?: string;
  content: string;
  rating: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  postedDate: Date;
  createdAt: Date;
}

const googleReviewSchema = new Schema<IGoogleReview>(
  {
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    reviewId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    author: String,
    content: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
    },
    postedDate: Date,
  },
  {
    timestamps: true,
    collection: 'google_reviews',
  }
);

googleReviewSchema.index({ businessProfileId: 1 });
googleReviewSchema.index({ reviewId: 1 });
googleReviewSchema.index({ rating: 1 });

export const GoogleReview = model<IGoogleReview>('GoogleReview', googleReviewSchema);
