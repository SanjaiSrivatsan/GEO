import { Schema, model, Document, Types } from 'mongoose';

export interface IGoogleLocation extends Document {
  businessProfileId: Types.ObjectId;
  placeId: string;
  name: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  hours?: Record<string, unknown>;
  rating?: number;
  reviewCount?: number;
  createdAt: Date;
}

const googleLocationSchema = new Schema<IGoogleLocation>(
  {
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    placeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: String,
    address: String,
    phoneNumber: String,
    website: String,
    hours: Schema.Types.Mixed,
    rating: Number,
    reviewCount: Number,
  },
  {
    timestamps: true,
    collection: 'google_locations',
  }
);

googleLocationSchema.index({ businessProfileId: 1 });
googleLocationSchema.index({ placeId: 1 });

export const GoogleLocation = model<IGoogleLocation>('GoogleLocation', googleLocationSchema);
