import { Schema, model, Document, Types } from 'mongoose';

export enum GapSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface IGapIssue extends Document {
  businessProfileId: Types.ObjectId;
  canonicalEntityId?: Types.ObjectId;
  gapType: string;
  severity: GapSeverity;
  status: 'open' | 'acknowledged' | 'resolved';
  title: string;
  description: string;
  evidence?: Record<string, unknown>;
  affectedDimensions?: string[];
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
    },
    severity: {
      type: String,
      enum: Object.values(GapSeverity),
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved'],
      default: 'open',
    },
    title: String,
    description: String,
    evidence: Schema.Types.Mixed,
    affectedDimensions: [String],
  },
  {
    timestamps: true,
    collection: 'gap_issues',
  }
);

gapIssueSchema.index({ businessProfileId: 1 });
gapIssueSchema.index({ severity: 1 });
gapIssueSchema.index({ status: 1 });

export const GapIssue = model<IGapIssue>('GapIssue', gapIssueSchema);
