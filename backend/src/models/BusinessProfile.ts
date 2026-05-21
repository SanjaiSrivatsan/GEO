import { Schema, model, Document, Types } from 'mongoose';

export interface IBusinessProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  category: string;
  primaryLocation: string;
  website?: string;
  brandVoice?: string;
  mainGoal?: string;
  crawlStatus: 'NOT_STARTED' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  crawlStartedAt?: Date;
  crawlCompletedAt?: Date;
  crawlError?: string;
  totalPagesCrawled: string;
  createdAt: Date;
  updatedAt: Date;
}

const businessProfileSchema = new Schema<IBusinessProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    primaryLocation: {
      type: String,
      required: true,
    },
    website: String,
    brandVoice: String,
    mainGoal: String,
    crawlStatus: {
      type: String,
      enum: ['NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'],
      default: 'NOT_STARTED',
      index: true,
    },
    crawlStartedAt: Date,
    crawlCompletedAt: Date,
    crawlError: String,
    totalPagesCrawled: {
      type: String,
      default: '0',
    },
  },
  {
    timestamps: true,
  }
);

export const BusinessProfile = model<IBusinessProfile>(
  'BusinessProfile',
  businessProfileSchema
);
