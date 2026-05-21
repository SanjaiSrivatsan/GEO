import { Schema, model, Document, Types } from 'mongoose';

export interface IGeoPromptResult extends Document {
  _id: Types.ObjectId;
  promptId: Types.ObjectId;
  businessProfileId: Types.ObjectId;
  userId: Types.ObjectId;
  executionStatus: string;
  executionTimestamp: Date;
  executionDurationMs?: number;
  modelName?: string;
  modelVersion?: string;
  rawResponse?: string;
  structuredResponse?: Record<string, any>;
  confidenceScore?: number;
  validationPassed?: string;
  validationErrors?: Record<string, any>;
  citedSources?: string[];
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const geoPromptResultSchema = new Schema<IGeoPromptResult>(
  {
    promptId: {
      type: Schema.Types.ObjectId,
      ref: 'GeoPrompt',
      required: true,
      index: true,
    },
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
    executionStatus: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'RETRYING'],
      required: true,
      index: true,
    },
    executionTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    executionDurationMs: Number,
    modelName: String,
    modelVersion: String,
    rawResponse: String,
    structuredResponse: Schema.Types.Mixed,
    confidenceScore: Number,
    validationPassed: String,
    validationErrors: Schema.Types.Mixed,
    citedSources: [String],
    errorMessage: String,
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const GeoPromptResult = model<IGeoPromptResult>(
  'GeoPromptResult',
  geoPromptResultSchema
);
