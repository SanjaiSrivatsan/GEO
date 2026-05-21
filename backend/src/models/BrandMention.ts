import { Schema, model, Document, Types } from 'mongoose';

export interface IBrandMention extends Document {
  _id: Types.ObjectId;
  businessProfileId: Types.ObjectId;
  userId: Types.ObjectId;
  sourceUrl: string;
  sourceDomain: string;
  canonicalUrl?: string;
  pageTitle?: string;
  extractedSnippet?: string;
  fullText?: string;
  mentionType: string;
  sentiment: string;
  status: string;
  searchQuery?: string;
  searchPosition?: string;
  discoveryMethod?: string;
  discoveredAt: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const brandMentionSchema = new Schema<IBrandMention>(
  {
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sourceUrl: {
      type: String,
      required: true,
    },
    sourceDomain: {
      type: String,
      required: true,
      index: true,
    },
    canonicalUrl: String,
    pageTitle: String,
    extractedSnippet: String,
    fullText: String,
    mentionType: {
      type: String,
      enum: ['DIRECTORY', 'REVIEW', 'ARTICLE', 'BLOG', 'COMPARISON', 'SOCIAL', 'OTHER'],
      default: 'OTHER',
      index: true,
    },
    sentiment: {
      type: String,
      enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'UNKNOWN'],
      default: 'UNKNOWN',
      index: true,
    },
    status: {
      type: String,
      enum: ['DISCOVERED', 'PROCESSED', 'IGNORED'],
      default: 'DISCOVERED',
      index: true,
    },
    searchQuery: String,
    searchPosition: String,
    discoveryMethod: String,
    discoveredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const BrandMention = model<IBrandMention>(
  'BrandMention',
  brandMentionSchema
);
