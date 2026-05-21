import { Schema, model, Document, Types } from 'mongoose';

export interface IGapIssue extends Document {
  _id: Types.ObjectId;
  businessProfileId: Types.ObjectId;
  canonicalEntityId: Types.ObjectId;
  gapType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
  title: string;
  description: string;
  evidence: Record<string, any>;
  affectedDimensions: string[];
  detectedAt: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const gapIssueSchema = new Schema<IGapIssue>(
  {
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    canonicalEntityId: {
      type: Schema.Types.ObjectId,
      ref: 'CanonicalEntity',
      required: true,
      index: true,
    },
    gapType: {
      type: String,
      enum: [
        'CATEGORY_MISMATCH',
        'SERVICE_DRIFT',
        'VERTICAL_ABSENCE',
        'MISSING_FAQ',
        'WEAK_GEO_BINDING',
        'INCONSISTENT_VOCABULARY',
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED', 'DISMISSED'],
      default: 'ACTIVE',
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    evidence: {
      type: Schema.Types.Mixed,
      default: {},
    },
    affectedDimensions: {
      type: [String],
      default: [],
    },
    detectedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const GapIssue = model<IGapIssue>('GapIssue', gapIssueSchema);
