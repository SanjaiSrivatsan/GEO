import { Schema, model, Document, Types } from 'mongoose';

export interface IGoogleLocation extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  businessProfileId?: Types.ObjectId;
  googleLocationId: string;
  name: string;
  category?: string;
  primaryLocation?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
  fullAddress?: string;
  status: string;
  reviewCount: number;
  averageRating?: string;
  isSynced: boolean;
  lastFetchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const googleLocationSchema = new Schema<IGoogleLocation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      index: true,
    },
    googleLocationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: String,
    primaryLocation: String,
    website: String,
    city: String,
    state: String,
    country: String,
    fullAddress: String,
    status: {
      type: String,
      enum: ['VERIFIED', 'NEEDS_ATTENTION', 'LIMITED_ACCESS', 'NOT_ELIGIBLE'],
      default: 'VERIFIED',
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    averageRating: String,
    isSynced: {
      type: Boolean,
      default: false,
    },
    lastFetchedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const GoogleLocation = model<IGoogleLocation>(
  'GoogleLocation',
  googleLocationSchema
);
