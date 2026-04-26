import { Schema, model, Document, Types } from 'mongoose';

export enum CrawlStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface IBusinessProfile extends Document {
  userId: Types.ObjectId;
  name: string;
  category: string;
  primaryLocation: string;
  website?: string;
  brandVoice?: string;
  mainGoal?: string;
  crawlStatus: CrawlStatus;
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
      enum: Object.values(CrawlStatus),
      default: CrawlStatus.NOT_STARTED,
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
    collection: 'business_profiles',
  }
);

// Indexes
businessProfileSchema.index({ userId: 1 });
businessProfileSchema.index({ createdAt: -1 });

export const BusinessProfile = model<IBusinessProfile>('BusinessProfile', businessProfileSchema);
