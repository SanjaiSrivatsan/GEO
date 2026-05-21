import { Schema, model, Document, Types } from 'mongoose';

export interface IGeoScore extends Document {
  _id: Types.ObjectId;
  businessProfileId: Types.ObjectId;
  userId: Types.ObjectId;
  presenceScore: number;
  accuracyScore: number;
  trustScore: number;
  hallucinationPenalty: number;
  finalGeoScore: number;
  presenceBreakdown?: Record<string, any>;
  accuracyBreakdown?: Record<string, any>;
  trustBreakdown?: Record<string, any>;
  hallucinationBreakdown?: Record<string, any>;
  promptResultsCount: number;
  computationMethod: string;
  computedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const geoScoreSchema = new Schema<IGeoScore>(
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
    presenceScore: {
      type: Number,
      required: true,
      default: 0,
    },
    accuracyScore: {
      type: Number,
      required: true,
      default: 0,
    },
    trustScore: {
      type: Number,
      required: true,
      default: 0,
    },
    hallucinationPenalty: {
      type: Number,
      required: true,
      default: 0,
    },
    finalGeoScore: {
      type: Number,
      required: true,
      default: 0,
    },
    presenceBreakdown: Schema.Types.Mixed,
    accuracyBreakdown: Schema.Types.Mixed,
    trustBreakdown: Schema.Types.Mixed,
    hallucinationBreakdown: Schema.Types.Mixed,
    promptResultsCount: {
      type: Number,
      default: 0,
    },
    computationMethod: {
      type: String,
      default: 'v1.0',
    },
    computedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const GeoScore = model<IGeoScore>('GeoScore', geoScoreSchema);
