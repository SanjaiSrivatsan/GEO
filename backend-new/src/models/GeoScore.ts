import { Schema, model, Document, Types } from 'mongoose';

export interface IGeoScore extends Document {
  businessProfileId: Types.ObjectId;
  userId: Types.ObjectId;
  presenceScore: number;
  accuracyScore: number;
  trustScore: number;
  hallucinationPenalty: number;
  finalGeoScore: number;
  presenceBreakdown?: Record<string, unknown>;
  accuracyBreakdown?: Record<string, unknown>;
  trustBreakdown?: Record<string, unknown>;
  hallucinationBreakdown?: Record<string, unknown>;
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
      min: 0,
      max: 100,
    },
    accuracyScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    trustScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    hallucinationPenalty: {
      type: Number,
      required: true,
      min: -10,
      max: 0,
    },
    finalGeoScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
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
    collection: 'geo_scores',
  }
);

// Indexes
geoScoreSchema.index({ businessProfileId: 1 });
geoScoreSchema.index({ userId: 1 });
geoScoreSchema.index({ computedAt: -1 });

export const GeoScore = model<IGeoScore>('GeoScore', geoScoreSchema);
