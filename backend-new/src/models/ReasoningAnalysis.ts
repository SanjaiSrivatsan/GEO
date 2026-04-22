import { Schema, model, Document, Types } from 'mongoose';

export interface IReasoningAnalysis extends Document {
  businessProfileId: Types.ObjectId;
  analysisType: string;
  findings?: Record<string, unknown>;
  recommendations?: string[];
  executedAt: Date;
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
    analysisType: {
      type: String,
      required: true,
    },
    findings: Schema.Types.Mixed,
    recommendations: [String],
    executedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'reasoning_analyses',
  }
);

reasoningAnalysisSchema.index({ businessProfileId: 1 });

export const ReasoningAnalysis = model<IReasoningAnalysis>('ReasoningAnalysis', reasoningAnalysisSchema);
