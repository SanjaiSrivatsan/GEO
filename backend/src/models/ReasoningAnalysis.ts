import { Schema, model, Document, Types } from 'mongoose';

export interface IReasoningAnalysis extends Document {
  _id: Types.ObjectId;
  businessProfileId: Types.ObjectId;
  simulationRunId: Types.ObjectId;
  promptId: string;
  rootCause: string;
  missingSignals: string[];
  reinforcementClass: string;
  suggestedActions: Record<string, any>[];
  confidence?: number;
  analyzedAt: Date;
  createdAt: Date;
}

const reasoningAnalysisSchema = new Schema<IReasoningAnalysis>(
  {
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    simulationRunId: {
      type: Schema.Types.ObjectId,
      ref: 'SimulationRun',
      required: true,
      index: true,
    },
    promptId: {
      type: String,
      required: true,
      index: true,
    },
    rootCause: {
      type: String,
      required: true,
    },
    missingSignals: {
      type: [String],
      default: [],
    },
    reinforcementClass: {
      type: String,
      enum: [
        'AUTHORITY_GAP',
        'RELEVANCE_GAP',
        'VISIBILITY_GAP',
        'CONTENT_GAP',
        'GEOGRAPHIC_GAP',
      ],
      required: true,
      index: true,
    },
    suggestedActions: {
      type: [Schema.Types.Mixed as any],
      default: [],
    },
    confidence: Number,
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const ReasoningAnalysis = model<IReasoningAnalysis>(
  'ReasoningAnalysis',
  reasoningAnalysisSchema
);
