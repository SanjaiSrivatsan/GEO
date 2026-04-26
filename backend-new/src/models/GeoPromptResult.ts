import { Schema, model, Document, Types } from 'mongoose';

export interface IGeoPromptResult extends Document {
  businessProfileId: Types.ObjectId;
  geoPromptId: Types.ObjectId;
  executionStatus: 'pending' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  errorMessage?: string;
  executedAt: Date;
  createdAt: Date;
}

const geoPromptResultSchema = new Schema<IGeoPromptResult>(
  {
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    geoPromptId: {
      type: Schema.Types.ObjectId,
      ref: 'GeoPrompt',
      required: true,
      index: true,
    },
    executionStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    result: Schema.Types.Mixed,
    errorMessage: String,
    executedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'geo_prompt_results',
  }
);

geoPromptResultSchema.index({ businessProfileId: 1 });
geoPromptResultSchema.index({ geoPromptId: 1 });
geoPromptResultSchema.index({ executionStatus: 1 });

export const GeoPromptResult = model<IGeoPromptResult>('GeoPromptResult', geoPromptResultSchema);
