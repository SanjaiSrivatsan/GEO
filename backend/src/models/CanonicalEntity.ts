import { Schema, model, Document, Types } from 'mongoose';

export interface ICanonicalEntity extends Document {
  _id: Types.ObjectId;
  businessProfileId: Types.ObjectId;
  primaryCategory: string;
  secondaryCategories: string[];
  services: string[];
  positioningStatement?: string;
  icp: Record<string, any>;
  geoScope: Record<string, any>;
  approvedTerms: string[];
  vocabularyClusters: Record<string, any>[];
  rawSignals: Record<string, any>;
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
      unique: true,
      index: true,
    },
    primaryCategory: {
      type: String,
      required: true,
    },
    secondaryCategories: {
      type: [String],
      default: [],
    },
    services: {
      type: [String],
      default: [],
    },
    positioningStatement: String,
    icp: {
      type: Schema.Types.Mixed,
      default: {},
    },
    geoScope: {
      type: Schema.Types.Mixed,
      default: {},
    },
    approvedTerms: {
      type: [String],
      default: [],
    },
    vocabularyClusters: {
      type: [Schema.Types.Mixed as any],
      default: [],
    },
    rawSignals: {
      type: Schema.Types.Mixed,
      default: {},
    },
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
  }
);

export const CanonicalEntity = model<ICanonicalEntity>(
  'CanonicalEntity',
  canonicalEntitySchema
);
