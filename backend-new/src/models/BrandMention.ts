import { Schema, model, Document, Types } from 'mongoose';

export interface IBrandMention extends Document {
  businessProfileId: Types.ObjectId;
  mentionText: string;
  sourceType: string;
  sourceUrl: string;
  mentionType: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence?: number;
  postedDate: Date;
  createdAt: Date;
}

const brandMentionSchema = new Schema<IBrandMention>(
  {
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    mentionText: {
      type: String,
      required: true,
    },
    sourceType: {
      type: String,
      required: true,
      enum: ['google_search', 'youtube', 'news', 'reddit', 'social', 'other'],
    },
    sourceUrl: String,
    mentionType: String,
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    postedDate: Date,
  },
  {
    timestamps: true,
    collection: 'brand_mentions',
  }
);

brandMentionSchema.index({ businessProfileId: 1 });
brandMentionSchema.index({ sourceType: 1 });
brandMentionSchema.index({ sentiment: 1 });

export const BrandMention = model<IBrandMention>('BrandMention', brandMentionSchema);
