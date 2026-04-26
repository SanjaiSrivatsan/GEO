import { Schema, model, Document, Types } from 'mongoose';

export interface ICanonicalEntity extends Document {
  businessProfileId: Types.ObjectId;
  primaryCategory: string;
  secondaryCategories?: string[];
  services?: Array<{ name: string; confidence: number }>;
  positioningStatement?: string;
  icp?: Record<string, unknown>;
  geoScope?: Record<string, unknown>;
  approvedTerms?: string[];
  vocabularyClusters?: Record<string, string[]>;
  version: number;
  computedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const canonicalEntitySchema = new Schema<ICanonicalEntity>(
  {
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
      unique: true,
    },
    primaryCategory: String,
    secondaryCategories: [String],
    services: [
      {
        name: String,
        confidence: {
          type: Number,
          min: 0,
          max: 1,
        },
      },
    ],
    positioningStatement: String,
    icp: Schema.Types.Mixed,
    geoScope: Schema.Types.Mixed,
    approvedTerms: [String],
    vocabularyClusters: Schema.Types.Mixed,
    version: {
      type: Number,
      default: 1,
    },
    computedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'canonical_entities',
  }
);

canonicalEntitySchema.index({ businessProfileId: 1 });

export const CanonicalEntity = model<ICanonicalEntity>('CanonicalEntity', canonicalEntitySchema);
